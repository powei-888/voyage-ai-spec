import { HttpStatus, Injectable } from "@nestjs/common";
import { ExpenseSplitMethod, Prisma, ReceiptStatus } from "@prisma/client";
import { parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { SplitCalculatorService } from "../expenses/split-calculator.service";
import { ConfirmReceiptDto } from "./receipts.dto";

const confirmedExpenseInclude = {
  participants: true,
  payerMember: { select: { id: true, displayName: true } }
} as const;

@Injectable()
export class ReceiptConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    private readonly split: SplitCalculatorService
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
    const shares = splitMethod === ExpenseSplitMethod.custom
      ? this.split.customSplit(dto.amount, dto.currency, dto.splitShares ?? [])
      : this.split.equalSplit(
          dto.amount,
          dto.currency,
          dto.payerMemberId,
          dto.participantMemberIds ?? []
        );
    await this.access.assertMembersBelongToTrip(tripId, [
      dto.payerMemberId,
      ...shares.map((share) => share.memberId)
    ]);

    try {
      const expenseId = await this.prisma.$transaction(
        async (tx) => {
          const receipt = await tx.receipt.findFirst({
            where: { id: receiptId, tripId },
            include: { confirmedExpense: true }
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
          if (dto.linkedEventId) {
            const event = await tx.itineraryEvent.findFirst({
              where: { id: dto.linkedEventId, tripId },
              select: { id: true }
            });
            if (!event) {
              throw new DomainError("INVALID_LINKED_EVENT", "Linked event is not in this trip.");
            }
          }

          const expense = await tx.expense.create({
            data: {
              tripId,
              title: dto.title.trim(),
              merchant: dto.merchant?.trim() || null,
              amount: dto.amount,
              currency: dto.currency,
              category: dto.category,
              expenseDate: dto.expenseDate ? parseDateOnly(dto.expenseDate) : null,
              payerMemberId: dto.payerMemberId,
              splitMethod,
              linkedReceiptId: receiptId,
              linkedEventId: dto.linkedEventId || null,
              createdByMemberId: actor.id,
              participants: { create: shares }
            },
            select: { id: true }
          });
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
