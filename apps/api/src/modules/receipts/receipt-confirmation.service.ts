import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ExpensePaymentSource,
  ExpenseSplitMethod,
  Prisma,
  ProxyPurchaseStatus,
  ReceiptStatus
} from "@prisma/client";
import { parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { SplitCalculatorService } from "../expenses/split-calculator.service";
import { fromMinorUnits, toMinorUnits } from "../expenses/money";
import { FundsService } from "../funds/funds.service";
import { ConfirmReceiptDto } from "./receipts.dto";

const confirmedExpenseInclude = {
  participants: true,
  payerMember: { select: { id: true, displayName: true } },
  fund: { select: { id: true, name: true, currency: true } }
} as const;

@Injectable()
export class ReceiptConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    private readonly split: SplitCalculatorService,
    private readonly funds: FundsService
  ) {}

  async confirm(
    userId: string,
    tripId: string,
    receiptId: string,
    dto: ConfirmReceiptDto
  ) {
    const actor = await this.access.requireMember(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { baseCurrency: true }
    });
    if (!trip) {
      throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    }
    if (dto.currency !== trip.baseCurrency) {
      throw new DomainError(
        "CURRENCY_MISMATCH",
        `Expenses must use the trip base currency (${trip.baseCurrency}).`
      );
    }
    const splitMethod = dto.splitMethod ?? ExpenseSplitMethod.equal;
    const paymentSource = dto.paymentSource ?? ExpensePaymentSource.member;
    const payerMemberId = dto.payerMemberId || null;
    const fundId = dto.fundId || null;
    if (
      (paymentSource === ExpensePaymentSource.member && (!payerMemberId || fundId)) ||
      (paymentSource === ExpensePaymentSource.fund && (payerMemberId || !fundId))
    ) {
      throw new DomainError(
        "INVALID_EXPENSE_PAYMENT_SOURCE",
        "Choose either one traveler payer or one public fund."
      );
    }
    const travelerMemberIds = splitMethod === ExpenseSplitMethod.custom
      ? (dto.splitShares ?? []).map((share) => share.memberId)
      : dto.participantMemberIds ?? [];
    await this.access.assertTravelersBelongToTrip(
      tripId,
      [...(payerMemberId ? [payerMemberId] : []), ...travelerMemberIds]
    );

    try {
      const expenseId = await this.prisma.$transaction(
        async (tx) => {
          const receipt = await tx.receipt.findFirst({
            where: { id: receiptId, tripId },
            include: {
              confirmedExpense: true,
              proxyPurchases: {
                where: { status: ProxyPurchaseStatus.requested },
                include: {
                  externalMember: { select: { id: true } },
                  items: { select: { amount: true } }
                }
              }
            }
          });
          if (!receipt) {
            throw DomainError.notFound("RECEIPT_NOT_FOUND", "Receipt not found.");
          }
          if (receipt.ocrStatus === ReceiptStatus.confirmed && receipt.confirmedExpense) {
            return receipt.confirmedExpense.id;
          }
          if (receipt.ocrStatus !== ReceiptStatus.extracted) {
            throw new DomainError(
              "RECEIPT_NOT_READY",
              "Only extracted receipts can be confirmed.",
              HttpStatus.CONFLICT
            );
          }
          if (paymentSource === ExpensePaymentSource.fund) {
            await this.funds.assertAvailable(tx, tripId, fundId!, dto.amount);
          }
          if (dto.linkedEventId) {
            const event = await tx.itineraryEvent.findFirst({
              where: { id: dto.linkedEventId, tripId },
              select: { id: true }
            });
            if (!event) {
              throw new DomainError("INVALID_LINKED_EVENT", "Linked event is not in this trip.");
            }
          }
          const totalMinor = toMinorUnits(dto.amount, dto.currency);
          const proxyPurchases = receipt.proxyPurchases ?? [];
          const proxyShares = new Map<string, bigint>();
          for (const purchase of proxyPurchases) {
            if (purchase.currency !== dto.currency) {
              throw new DomainError(
                "CURRENCY_MISMATCH",
                "Receipt-linked proxy purchase currency does not match the receipt."
              );
            }
            const orderMinor = purchase.items.reduce(
              (sum, item) => sum + toMinorUnits(item.amount.toString(), dto.currency),
              0n
            );
            proxyShares.set(
              purchase.externalMember.id,
              (proxyShares.get(purchase.externalMember.id) ?? 0n) + orderMinor
            );
          }
          const proxyTotalMinor = [...proxyShares.values()].reduce(
            (sum, amount) => sum + amount,
            0n
          );
          if (proxyTotalMinor > totalMinor) {
            throw new DomainError(
              "RECEIPT_PROXY_TOTAL_EXCEEDS_AMOUNT",
              "Assigned proxy-purchase items exceed the receipt total.",
              HttpStatus.UNPROCESSABLE_ENTITY,
              {
                receiptAmount: fromMinorUnits(totalMinor, dto.currency),
                proxyAmount: fromMinorUnits(proxyTotalMinor, dto.currency)
              }
            );
          }
          const travelerTotalMinor = totalMinor - proxyTotalMinor;
          const travelerShares = travelerTotalMinor === 0n
            ? []
            : splitMethod === ExpenseSplitMethod.custom
              ? this.split.customSplit(
                  fromMinorUnits(travelerTotalMinor, dto.currency),
                  dto.currency,
                  dto.splitShares ?? []
                )
              : this.split.equalSplit(
                  fromMinorUnits(travelerTotalMinor, dto.currency),
                  dto.currency,
                  payerMemberId,
                  dto.participantMemberIds ?? []
                );
          const shares = [
            ...travelerShares,
            ...[...proxyShares.entries()].map(([memberId, amount]) => ({
              memberId,
              shareAmount: fromMinorUnits(amount, dto.currency)
            }))
          ].sort((a, b) => a.memberId.localeCompare(b.memberId));

          const expense = await tx.expense.create({
            data: {
              tripId,
              title: dto.title.trim(),
              merchant: dto.merchant?.trim() || null,
              amount: dto.amount,
              currency: dto.currency,
              category: dto.category,
              expenseDate: dto.expenseDate ? parseDateOnly(dto.expenseDate) : null,
              paymentSource,
              payerMemberId,
              fundId,
              splitMethod: proxyPurchases.length
                ? ExpenseSplitMethod.custom
                : splitMethod,
              linkedReceiptId: receiptId,
              linkedEventId: dto.linkedEventId || null,
              createdByMemberId: actor.id,
              participants: { create: shares }
            },
            select: { id: true }
          });
          if (proxyPurchases.length > 0) {
            const linked = await tx.proxyPurchase.updateMany({
              where: {
                id: { in: proxyPurchases.map((purchase) => purchase.id) },
                status: ProxyPurchaseStatus.requested,
                sourceReceiptId: receiptId
              },
              data: {
                paymentSource,
                payerMemberId,
                fundId,
                expenseId: expense.id,
                purchasedAt: dto.expenseDate
                  ? parseDateOnly(dto.expenseDate)
                  : new Date(),
                status: ProxyPurchaseStatus.purchased
              }
            });
            if (linked.count !== proxyPurchases.length) {
              throw new DomainError(
                "RECEIPT_PROXY_PURCHASE_CHANGED",
                "A receipt-linked proxy purchase changed during confirmation.",
                HttpStatus.CONFLICT
              );
            }
          }
          await tx.receipt.update({
            where: { id: receiptId },
            data: {
              ocrStatus: ReceiptStatus.confirmed,
              confirmedAt: new Date(),
              confirmedByMemberId: actor.id
            }
          });
          return expense.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return this.prisma.expense.findUniqueOrThrow({
        where: { id: expenseId },
        include: confirmedExpenseInclude
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code)
      ) {
        const existing = await this.prisma.expense.findUnique({
          where: { linkedReceiptId: receiptId },
          include: confirmedExpenseInclude
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
}
