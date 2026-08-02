import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ExpenseCategory,
  ExpensePaymentSource,
  ExpenseSplitMethod,
  ExpenseStatus,
  Prisma,
  ProxyPurchaseStatus,
  ReceiptStatus,
  TripMemberKind,
  TripRole
} from "@prisma/client";
import { parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { fromMinorUnits, toMinorUnits } from "../expenses/money";
import { FundsService } from "../funds/funds.service";
import { normalizeProxyPurchaseItems } from "./proxy-purchase-money";
import { normalizeStoredReceiptItems } from "../receipts/receipt-line-items";
import type { CreateReceiptProxyPurchaseDto } from "../receipts/receipts.dto";
import {
  ConfirmProxyPurchaseDto,
  CreateProxyPurchaseDto,
  UpdateProxyPurchaseDto
} from "./proxy-purchases.dto";

export const proxyPurchaseInclude = {
  externalMember: { select: { id: true, displayName: true } },
  payerMember: { select: { id: true, displayName: true } },
  fund: { select: { id: true, name: true, currency: true } },
  expense: { select: { id: true, status: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  settlements: {
    select: { id: true, amount: true, settledAt: true },
    orderBy: [{ settledAt: "desc" as const }, { createdAt: "desc" as const }]
  },
  fundTransactions: {
    where: { voidedAt: null, type: "collection" as const },
    select: { id: true, amount: true, transactionDate: true, fundId: true },
    orderBy: [{ transactionDate: "desc" as const }, { createdAt: "desc" as const }]
  }
} satisfies Prisma.ProxyPurchaseInclude;

type ProxyPurchaseRecord = Prisma.ProxyPurchaseGetPayload<{
  include: typeof proxyPurchaseInclude;
}>;

@Injectable()
export class ProxyPurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    private readonly funds: FundsService
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    const purchases = await this.prisma.proxyPurchase.findMany({
      where: { tripId },
      include: proxyPurchaseInclude,
      orderBy: [{ createdAt: "desc" }]
    });
    return purchases.map((purchase) => this.serialize(purchase));
  }

  async create(userId: string, tripId: string, dto: CreateProxyPurchaseDto) {
    const actor = await this.access.requireMember(tripId, userId);
    const trip = await this.requireTrip(tripId);
    const { items, totalAmount } = normalizeProxyPurchaseItems(
      dto.items,
      trip.baseCurrency
    );
    const purchaseNow = Boolean(dto.payerMemberId || dto.fundId || dto.purchasedAt);
    if (purchaseNow && !dto.purchasedAt) {
      throw new DomainError(
        "PROXY_PURCHASE_PAYMENT_FIELDS_REQUIRED",
        "Payment source and purchase date are required when recording a purchase."
      );
    }
    const payment = purchaseNow ? await this.validatePaymentSource(tripId, dto) : null;
    const existingExternal = dto.externalMemberId
      ? await this.requireExternalMember(tripId, dto.externalMemberId)
      : null;
    const newExternalName = dto.newExternalName?.trim();
    if (Boolean(existingExternal) === Boolean(newExternalName)) {
      throw new DomainError(
        "PROXY_PURCHASE_RECIPIENT_REQUIRED",
        "Choose one external party or create a new one."
      );
    }

    const purchase = await this.prisma.$transaction(async (tx) => {
      const external = existingExternal ?? await tx.tripMember.create({
        data: {
          tripId,
          displayName: newExternalName!,
          kind: TripMemberKind.external,
          role: TripRole.member
        },
        select: { id: true, displayName: true }
      });
      const expense = purchaseNow
        ? await this.createExpense(
            tx,
            tripId,
            actor.id,
            external,
            payment!,
            dto.purchasedAt!,
            trip.baseCurrency,
            totalAmount,
            items.length
          )
        : null;
      return tx.proxyPurchase.create({
        data: {
          tripId,
          externalMemberId: external.id,
          paymentSource: payment?.paymentSource ?? ExpensePaymentSource.member,
          payerMemberId: payment?.payerMemberId ?? null,
          fundId: payment?.fundId ?? null,
          expenseId: expense?.id ?? null,
          status: purchaseNow
            ? ProxyPurchaseStatus.purchased
            : ProxyPurchaseStatus.requested,
          currency: trip.baseCurrency,
          note: dto.note?.trim() || null,
          purchasedAt: dto.purchasedAt ? parseDateOnly(dto.purchasedAt) : null,
          createdByMemberId: actor.id,
          items: { create: items }
        },
        include: proxyPurchaseInclude
      });
    });
    return this.serialize(purchase);
  }

  async createFromReceipt(
    userId: string,
    tripId: string,
    receiptId: string,
    dto: CreateReceiptProxyPurchaseDto
  ) {
    const actor = await this.access.requireMember(tripId, userId);
    const trip = await this.requireTrip(tripId);
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, tripId, ocrStatus: ReceiptStatus.extracted },
      select: { id: true, extractedJson: true, imageOriginalName: true }
    });
    if (!receipt?.extractedJson) {
      throw new DomainError(
        "RECEIPT_NOT_EDITABLE",
        "Only extracted receipt drafts can create proxy purchases.",
        HttpStatus.CONFLICT
      );
    }
    const extraction = receipt.extractedJson as Record<string, unknown>;
    const currency = String(extraction.currency ?? "").toUpperCase();
    if (currency !== trip.baseCurrency) {
      throw new DomainError(
        "CURRENCY_MISMATCH",
        `Receipt currency must match the trip base currency (${trip.baseCurrency}).`
      );
    }
    const receiptItems = normalizeStoredReceiptItems(extraction.items);
    const indexes = [...dto.itemIndexes].sort((a, b) => a - b);
    if (indexes.some((index) => index < 0 || index >= receiptItems.length)) {
      throw new DomainError(
        "INVALID_RECEIPT_ITEM",
        "Receipt item index is invalid.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
    const amountOverrides = new Map(
      (dto.itemAmounts ?? []).map((item) => [item.index, item.amount])
    );
    if (
      amountOverrides.size !== (dto.itemAmounts?.length ?? 0) ||
      [...amountOverrides.keys()].some((index) => !indexes.includes(index))
    ) {
      throw new DomainError(
        "INVALID_RECEIPT_ITEM_AMOUNT",
        "Receipt item allocation amounts do not match the selected items."
      );
    }
    const existingExternal = dto.externalMemberId
      ? await this.requireExternalMember(tripId, dto.externalMemberId)
      : null;
    const newExternalName = dto.newExternalName?.trim();
    if (Boolean(existingExternal) === Boolean(newExternalName)) {
      throw new DomainError(
        "PROXY_PURCHASE_RECIPIENT_REQUIRED",
        "Choose one external party or create a new one."
      );
    }
    const inputItems = indexes.map((sourceReceiptItemIndex) => {
      const item = receiptItems[sourceReceiptItemIndex];
      if (!item) {
        throw new DomainError(
          "INVALID_RECEIPT_ITEM",
          "Receipt item index is invalid.",
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
      const allocatedAmount = amountOverrides.get(sourceReceiptItemIndex) || item.amount;
      let quantity = Number(item.quantity);
      let unitPrice = item.unitPrice;
      if (
        allocatedAmount !== item.amount ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 999 ||
        !unitPrice ||
        toMinorUnits(unitPrice, currency) * BigInt(quantity) !==
          toMinorUnits(item.amount, currency)
      ) {
        quantity = 1;
        unitPrice = allocatedAmount;
      }
      const notes = [];
      if (item.translatedDescription && item.translatedDescription !== item.description) {
        notes.push(`收據原文：${item.description}`);
      }
      if (allocatedAmount !== item.amount) {
        notes.push(`收據明細：${currency} ${item.amount}；實際分攤：${currency} ${allocatedAmount}`);
      }
      return {
        description: item.translatedDescription || item.description,
        quantity,
        unitPrice,
        note: notes.length ? notes.join("；") : undefined,
        sourceReceiptItemIndex
      };
    });
    const normalized = normalizeProxyPurchaseItems(inputItems, currency).items;

    try {
      const purchase = await this.prisma.$transaction(async (tx) => {
        const source = await tx.receipt.findFirst({
          where: { id: receiptId, tripId, ocrStatus: ReceiptStatus.extracted },
          select: { id: true }
        });
        if (!source) {
          throw new DomainError(
            "RECEIPT_NOT_EDITABLE",
            "Receipt is no longer available for proxy-purchase assignment.",
            HttpStatus.CONFLICT
          );
        }
        const external = existingExternal ?? await tx.tripMember.create({
          data: {
            tripId,
            displayName: newExternalName!,
            kind: TripMemberKind.external,
            role: TripRole.member
          },
          select: { id: true, displayName: true }
        });
        return tx.proxyPurchase.create({
          data: {
            tripId,
            externalMemberId: external.id,
            status: ProxyPurchaseStatus.requested,
            currency,
            note: dto.note?.trim() ||
              `從收據 ${receipt.imageOriginalName || receipt.id} 匯入`,
            sourceReceiptId: receiptId,
            createdByMemberId: actor.id,
            items: {
              create: normalized.map((item, index) => ({
                ...item,
                sourceReceiptId: receiptId,
                sourceReceiptItemIndex: inputItems[index]!.sourceReceiptItemIndex
              }))
            }
          },
          include: proxyPurchaseInclude
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return this.serialize(purchase);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code)
      ) {
        throw new DomainError(
          "RECEIPT_ITEM_ALREADY_ASSIGNED",
          "One or more receipt items are already assigned to a proxy purchase.",
          HttpStatus.CONFLICT
        );
      }
      throw error;
    }
  }

  async update(
    userId: string,
    tripId: string,
    purchaseId: string,
    dto: UpdateProxyPurchaseDto
  ) {
    await this.access.requireMember(tripId, userId);
    const existing = await this.requirePurchase(tripId, purchaseId);
    if (existing.sourceReceiptId) {
      throw new DomainError(
        "RECEIPT_PROXY_PURCHASE_LOCKED",
        "Edit receipt-linked items from the receipt review.",
        HttpStatus.CONFLICT
      );
    }
    if (existing.status !== ProxyPurchaseStatus.requested) {
      throw new DomainError(
        "PROXY_PURCHASE_LOCKED",
        "Only a pending proxy-purchase list can be edited.",
        HttpStatus.CONFLICT
      );
    }
    await this.requireExternalMember(tripId, dto.externalMemberId);
    const { items } = normalizeProxyPurchaseItems(dto.items, existing.currency);

    const purchase = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.proxyPurchase.updateMany({
        where: { id: purchaseId, status: ProxyPurchaseStatus.requested },
        data: {
          externalMemberId: dto.externalMemberId,
          note: dto.note?.trim() || null
        }
      });
      if (claimed.count !== 1) {
        throw new DomainError(
          "PROXY_PURCHASE_LOCKED",
          "Only a pending proxy-purchase list can be edited.",
          HttpStatus.CONFLICT
        );
      }
      await tx.proxyPurchaseItem.deleteMany({ where: { proxyPurchaseId: purchaseId } });
      await tx.proxyPurchaseItem.createMany({
        data: items.map((item) => ({ proxyPurchaseId: purchaseId, ...item }))
      });
      return tx.proxyPurchase.findUniqueOrThrow({
        where: { id: purchaseId },
        include: proxyPurchaseInclude
      });
    });
    return this.serialize(purchase);
  }

  async confirmPurchase(
    userId: string,
    tripId: string,
    purchaseId: string,
    dto: ConfirmProxyPurchaseDto
  ) {
    const actor = await this.access.requireMember(tripId, userId);
    const payment = await this.validatePaymentSource(tripId, dto);
    const existing = await this.requirePurchase(tripId, purchaseId);
    if (existing.sourceReceiptId) {
      throw new DomainError(
        "RECEIPT_PROXY_PURCHASE_LOCKED",
        "Confirm this proxy purchase by confirming its source receipt.",
        HttpStatus.CONFLICT
      );
    }
    if (existing.status !== ProxyPurchaseStatus.requested) {
      throw new DomainError(
        "PROXY_PURCHASE_ALREADY_RECORDED",
        "This proxy purchase is no longer pending.",
        HttpStatus.CONFLICT
      );
    }
    const totalAmount = this.totalAmount(existing);

    const purchase = await this.prisma.$transaction(async (tx) => {
      const expense = await this.createExpense(
        tx,
        tripId,
        actor.id,
        existing.externalMember,
        payment,
        dto.purchasedAt,
        existing.currency,
        totalAmount,
        existing.items.length
      );
      const claimed = await tx.proxyPurchase.updateMany({
        where: { id: purchaseId, status: ProxyPurchaseStatus.requested },
        data: {
          paymentSource: payment.paymentSource,
          payerMemberId: payment.payerMemberId,
          fundId: payment.fundId,
          expenseId: expense.id,
          purchasedAt: parseDateOnly(dto.purchasedAt),
          status: ProxyPurchaseStatus.purchased
        }
      });
      if (claimed.count !== 1) {
        throw new DomainError(
          "PROXY_PURCHASE_ALREADY_RECORDED",
          "This proxy purchase is no longer pending.",
          HttpStatus.CONFLICT
        );
      }
      return tx.proxyPurchase.findUniqueOrThrow({
        where: { id: purchaseId },
        include: proxyPurchaseInclude
      });
    });
    return this.serialize(purchase);
  }

  async cancel(userId: string, tripId: string, purchaseId: string) {
    await this.access.requireMember(tripId, userId);
    const existing = await this.requirePurchase(tripId, purchaseId);
    if (existing.status === ProxyPurchaseStatus.cancelled) {
      return this.serialize(existing);
    }
    if (
      existing.sourceReceiptId &&
      existing.status === ProxyPurchaseStatus.purchased
    ) {
      throw new DomainError(
        "RECEIPT_PROXY_PURCHASE_LOCKED",
        "A purchased receipt-linked order cannot be cancelled separately.",
        HttpStatus.CONFLICT
      );
    }
    if (existing.settlements.length > 0 || existing.fundTransactions.length > 0) {
      throw new DomainError(
        "PROXY_PURCHASE_HAS_COLLECTIONS",
        "Delete recorded collections before cancelling this proxy purchase.",
        HttpStatus.CONFLICT
      );
    }
    const purchase = await this.prisma.$transaction(async (tx) => {
      if (
        existing.sourceReceiptId &&
        existing.status === ProxyPurchaseStatus.requested
      ) {
        await tx.proxyPurchaseItem.updateMany({
          where: { proxyPurchaseId: purchaseId },
          data: { sourceReceiptId: null, sourceReceiptItemIndex: null }
        });
      }
      if (existing.expenseId) {
        await tx.expense.update({
          where: { id: existing.expenseId },
          data: { status: ExpenseStatus.voided }
        });
      }
      return tx.proxyPurchase.update({
        where: { id: purchaseId },
        data: { status: ProxyPurchaseStatus.cancelled },
        include: proxyPurchaseInclude
      });
    });
    return this.serialize(purchase);
  }

  private async requireTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { baseCurrency: true }
    });
    if (!trip) throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    return trip;
  }

  private async requireExternalMember(tripId: string, memberId: string) {
    const member = await this.prisma.tripMember.findFirst({
      where: { id: memberId, tripId, kind: TripMemberKind.external },
      select: { id: true, displayName: true }
    });
    if (!member) {
      throw new DomainError(
        "EXTERNAL_MEMBER_REQUIRED",
        "Proxy purchases require an external expense party.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
    return member;
  }

  private async requirePurchase(tripId: string, purchaseId: string) {
    const purchase = await this.prisma.proxyPurchase.findFirst({
      where: { id: purchaseId, tripId },
      include: proxyPurchaseInclude
    });
    if (!purchase) {
      throw DomainError.notFound("PROXY_PURCHASE_NOT_FOUND", "Proxy purchase not found.");
    }
    return purchase;
  }

  private async createExpense(
    tx: Prisma.TransactionClient,
    tripId: string,
    actorMemberId: string,
    external: { id: string; displayName: string },
    payment: {
      paymentSource: ExpensePaymentSource;
      payerMemberId: string | null;
      fundId: string | null;
    },
    purchasedAt: string,
    currency: string,
    totalAmount: string,
    itemCount: number
  ) {
    if (payment.paymentSource === ExpensePaymentSource.fund) {
      await this.funds.assertAvailable(tx, tripId, payment.fundId!, totalAmount);
    }
    return tx.expense.create({
      data: {
        tripId,
        title: `${external.displayName} 代購（${itemCount} 項）`,
        amount: totalAmount,
        currency,
        category: ExpenseCategory.shopping,
        expenseDate: parseDateOnly(purchasedAt),
        paymentSource: payment.paymentSource,
        payerMemberId: payment.payerMemberId,
        fundId: payment.fundId,
        splitMethod: ExpenseSplitMethod.custom,
        createdByMemberId: actorMemberId,
        participants: {
          create: [{ memberId: external.id, shareAmount: totalAmount }]
        }
      },
      select: { id: true }
    });
  }

  private totalAmount(purchase: ProxyPurchaseRecord): string {
    return fromMinorUnits(
      purchase.items.reduce(
        (sum, item) => sum + toMinorUnits(item.amount.toString(), purchase.currency),
        0n
      ),
      purchase.currency
    );
  }

  private serialize(purchase: ProxyPurchaseRecord) {
    const totalMinor = toMinorUnits(this.totalAmount(purchase), purchase.currency);
    const fundTransactions = purchase.fundTransactions ?? [];
    const collectedMinor = [...purchase.settlements, ...fundTransactions].reduce(
      (sum, settlement) =>
        sum + toMinorUnits(settlement.amount.toString(), purchase.currency),
      0n
    );
    const outstandingMinor =
      purchase.status === ProxyPurchaseStatus.purchased &&
      purchase.expense?.status === ExpenseStatus.active
        ? totalMinor > collectedMinor ? totalMinor - collectedMinor : 0n
        : 0n;
    const status =
      purchase.status === ProxyPurchaseStatus.purchased && outstandingMinor === 0n
        ? "settled"
        : purchase.status;
    return {
      ...purchase,
      status,
      items: purchase.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        amount: item.amount.toString()
      })),
      settlements: purchase.settlements.map((settlement) => ({
        ...settlement,
        amount: settlement.amount.toString()
      })),
      collections: [
        ...purchase.settlements.map((settlement) => ({
          id: settlement.id,
          amount: settlement.amount.toString(),
          settledAt: settlement.settledAt,
          source: "member" as const,
          fundId: null
        })),
        ...fundTransactions.map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount.toString(),
          settledAt: transaction.transactionDate,
          source: "fund" as const,
          fundId: transaction.fundId
        }))
      ].sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()),
      totalAmount: fromMinorUnits(totalMinor, purchase.currency),
      collectedAmount: fromMinorUnits(collectedMinor, purchase.currency),
      outstandingAmount: fromMinorUnits(outstandingMinor, purchase.currency),
      canCancel:
        purchase.status !== ProxyPurchaseStatus.cancelled &&
        purchase.settlements.length === 0 &&
        fundTransactions.length === 0 &&
        !(purchase.sourceReceiptId && purchase.status === ProxyPurchaseStatus.purchased)
    };
  }

  private async validatePaymentSource(
    tripId: string,
    dto: {
      paymentSource?: ExpensePaymentSource;
      payerMemberId?: string;
      fundId?: string;
    }
  ) {
    const paymentSource = dto.paymentSource ?? ExpensePaymentSource.member;
    const payerMemberId = dto.payerMemberId || null;
    const fundId = dto.fundId || null;
    if (paymentSource === ExpensePaymentSource.member) {
      if (!payerMemberId || fundId) {
        throw new DomainError(
          "INVALID_EXPENSE_PAYMENT_SOURCE",
          "A member-paid proxy purchase requires one traveler payer."
        );
      }
      await this.access.assertTravelersBelongToTrip(tripId, [payerMemberId]);
    } else if (payerMemberId || !fundId) {
      throw new DomainError(
        "INVALID_EXPENSE_PAYMENT_SOURCE",
        "A public-fund proxy purchase requires one fund and no traveler payer."
      );
    }
    return { paymentSource, payerMemberId, fundId };
  }
}
