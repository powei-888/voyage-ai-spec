import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ExpenseCategory,
  ExpenseSplitMethod,
  ExpenseStatus,
  Prisma,
  ProxyPurchaseStatus,
  TripMemberKind,
  TripRole
} from "@prisma/client";
import { parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { fromMinorUnits, toMinorUnits } from "../expenses/money";
import { normalizeProxyPurchaseItems } from "./proxy-purchase-money";
import {
  ConfirmProxyPurchaseDto,
  CreateProxyPurchaseDto,
  UpdateProxyPurchaseDto
} from "./proxy-purchases.dto";

export const proxyPurchaseInclude = {
  externalMember: { select: { id: true, displayName: true } },
  payerMember: { select: { id: true, displayName: true } },
  expense: { select: { id: true, status: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  settlements: {
    select: { id: true, amount: true, settledAt: true },
    orderBy: [{ settledAt: "desc" as const }, { createdAt: "desc" as const }]
  }
} satisfies Prisma.ProxyPurchaseInclude;

type ProxyPurchaseRecord = Prisma.ProxyPurchaseGetPayload<{
  include: typeof proxyPurchaseInclude;
}>;

@Injectable()
export class ProxyPurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService
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
    const purchaseNow = Boolean(dto.payerMemberId || dto.purchasedAt);
    if (purchaseNow && (!dto.payerMemberId || !dto.purchasedAt)) {
      throw new DomainError(
        "PROXY_PURCHASE_PAYMENT_FIELDS_REQUIRED",
        "Payer and purchase date are both required when recording a purchase."
      );
    }
    if (dto.payerMemberId) {
      await this.access.assertTravelersBelongToTrip(tripId, [dto.payerMemberId]);
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
            dto.payerMemberId!,
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
          payerMemberId: dto.payerMemberId || null,
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

  async update(
    userId: string,
    tripId: string,
    purchaseId: string,
    dto: UpdateProxyPurchaseDto
  ) {
    await this.access.requireMember(tripId, userId);
    const existing = await this.requirePurchase(tripId, purchaseId);
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
    await this.access.assertTravelersBelongToTrip(tripId, [dto.payerMemberId]);
    const existing = await this.requirePurchase(tripId, purchaseId);
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
        dto.payerMemberId,
        dto.purchasedAt,
        existing.currency,
        totalAmount,
        existing.items.length
      );
      const claimed = await tx.proxyPurchase.updateMany({
        where: { id: purchaseId, status: ProxyPurchaseStatus.requested },
        data: {
          payerMemberId: dto.payerMemberId,
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
    if (existing.settlements.length > 0) {
      throw new DomainError(
        "PROXY_PURCHASE_HAS_COLLECTIONS",
        "Delete recorded collections before cancelling this proxy purchase.",
        HttpStatus.CONFLICT
      );
    }
    const purchase = await this.prisma.$transaction(async (tx) => {
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
    payerMemberId: string,
    purchasedAt: string,
    currency: string,
    totalAmount: string,
    itemCount: number
  ) {
    return tx.expense.create({
      data: {
        tripId,
        title: `${external.displayName} 代購（${itemCount} 項）`,
        amount: totalAmount,
        currency,
        category: ExpenseCategory.shopping,
        expenseDate: parseDateOnly(purchasedAt),
        payerMemberId,
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
    const collectedMinor = purchase.settlements.reduce(
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
      totalAmount: fromMinorUnits(totalMinor, purchase.currency),
      collectedAmount: fromMinorUnits(collectedMinor, purchase.currency),
      outstandingAmount: fromMinorUnits(outstandingMinor, purchase.currency),
      canCancel:
        purchase.status !== ProxyPurchaseStatus.cancelled &&
        purchase.settlements.length === 0
    };
  }
}
