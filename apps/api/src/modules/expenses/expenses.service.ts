import { HttpStatus, Injectable } from "@nestjs/common";
import { ExpenseSplitMethod, ExpenseStatus } from "@prisma/client";
import { parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { calculateBalances } from "./balance-calculator";
import { CreateExpenseDto, UpdateExpenseDto } from "./expenses.dto";
import { SplitCalculatorService } from "./split-calculator.service";

const expenseInclude = {
  payerMember: { select: { id: true, displayName: true } },
  participants: {
    include: { member: { select: { id: true, displayName: true } } },
    orderBy: { memberId: "asc" as const }
  },
  linkedEvent: { select: { id: true, title: true } },
  linkedReceipt: { select: { id: true, ocrStatus: true } },
  proxyPurchase: { select: { id: true } }
} as const;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    private readonly split: SplitCalculatorService
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    return this.prisma.expense.findMany({
      where: { tripId },
      include: expenseInclude,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }]
    });
  }

  async get(userId: string, tripId: string, expenseId: string) {
    await this.access.requireMember(tripId, userId);
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
      include: expenseInclude
    });
    if (!expense) {
      throw DomainError.notFound("EXPENSE_NOT_FOUND", "Expense not found.");
    }
    return expense;
  }

  async create(userId: string, tripId: string, dto: CreateExpenseDto) {
    const actor = await this.access.requireMember(tripId, userId);
    const shares = await this.validateAndSplit(tripId, dto);

    return this.prisma.expense.create({
      data: {
        tripId,
        title: dto.title.trim(),
        merchant: dto.merchant?.trim() || null,
        amount: dto.amount,
        currency: dto.currency,
        category: dto.category,
        expenseDate: dto.expenseDate ? parseDateOnly(dto.expenseDate) : null,
        payerMemberId: dto.payerMemberId,
        splitMethod: dto.splitMethod,
        linkedEventId: dto.linkedEventId || null,
        createdByMemberId: actor.id,
        participants: { create: shares }
      },
      include: expenseInclude
    });
  }

  async update(
    userId: string,
    tripId: string,
    expenseId: string,
    dto: UpdateExpenseDto
  ) {
    await this.access.requireMember(tripId, userId);
    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
      include: { participants: true, proxyPurchase: { select: { id: true } } }
    });
    if (!existing) {
      throw DomainError.notFound("EXPENSE_NOT_FOUND", "Expense not found.");
    }
    if (existing.proxyPurchase) {
      throw new DomainError(
        "PROXY_PURCHASE_EXPENSE_LOCKED",
        "Manage this expense from its proxy-purchase order.",
        HttpStatus.CONFLICT
      );
    }

    const existingShares = existing.participants.map((item) => ({
      memberId: item.memberId,
      shareAmount: item.shareAmount.toString()
    }));
    const merged: CreateExpenseDto = {
      title: dto.title ?? existing.title,
      merchant: dto.merchant ?? existing.merchant ?? undefined,
      amount: dto.amount ?? existing.amount.toString(),
      currency: dto.currency ?? existing.currency,
      category: dto.category ?? existing.category,
      expenseDate:
        dto.expenseDate === undefined
          ? existing.expenseDate?.toISOString().slice(0, 10)
          : dto.expenseDate ?? undefined,
      payerMemberId: dto.payerMemberId ?? existing.payerMemberId,
      splitMethod: dto.splitMethod ?? existing.splitMethod,
      participantMemberIds:
        dto.participantMemberIds ?? existingShares.map((item) => item.memberId),
      splitShares: dto.splitShares ?? existingShares,
      linkedEventId:
        dto.linkedEventId === undefined
          ? existing.linkedEventId ?? undefined
          : dto.linkedEventId ?? undefined
    };
    const shares = await this.validateAndSplit(tripId, merged);

    return this.prisma.$transaction(async (tx) => {
      await tx.expenseParticipant.deleteMany({ where: { expenseId } });
      await tx.expenseParticipant.createMany({
        data: shares.map((share) => ({ expenseId, ...share }))
      });
      return tx.expense.update({
        where: { id: expenseId },
        data: {
          title: merged.title.trim(),
          merchant: merged.merchant?.trim() || null,
          amount: merged.amount,
          currency: merged.currency,
          category: merged.category,
          expenseDate: merged.expenseDate ? parseDateOnly(merged.expenseDate) : null,
          payerMemberId: merged.payerMemberId,
          splitMethod: merged.splitMethod,
          linkedEventId: dto.linkedEventId === null ? null : merged.linkedEventId,
          status: dto.status
        },
        include: expenseInclude
      });
    });
  }

  async void(userId: string, tripId: string, expenseId: string) {
    await this.access.requireMember(tripId, userId);
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
      include: { proxyPurchase: { select: { id: true } } }
    });
    if (!expense) {
      throw DomainError.notFound("EXPENSE_NOT_FOUND", "Expense not found.");
    }
    if (expense.proxyPurchase) {
      throw new DomainError(
        "PROXY_PURCHASE_EXPENSE_LOCKED",
        "Cancel this expense from its proxy-purchase order.",
        HttpStatus.CONFLICT
      );
    }
    return this.prisma.expense.update({
      where: { id: expenseId },
      data: { status: ExpenseStatus.voided },
      include: expenseInclude
    });
  }

  async balances(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        baseCurrency: true,
        members: {
          select: { id: true, displayName: true, kind: true },
          orderBy: { createdAt: "asc" }
        },
        expenses: {
          select: {
            amount: true,
            payerMemberId: true,
            status: true,
            participants: { select: { memberId: true, shareAmount: true } }
          }
        },
        settlements: {
          select: { fromMemberId: true, toMemberId: true, amount: true }
        }
      }
    });
    if (!trip) {
      throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    }
    return calculateBalances(
      trip.members,
      trip.expenses.map((expense) => ({
        ...expense,
        amount: expense.amount.toString(),
        participants: expense.participants.map((participant) => ({
          ...participant,
          shareAmount: participant.shareAmount.toString()
        }))
      })),
      trip.baseCurrency,
      trip.settlements.map((settlement) => ({
        ...settlement,
        amount: settlement.amount.toString()
      }))
    );
  }

  private async validateAndSplit(tripId: string, dto: CreateExpenseDto) {
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
        `Expenses must use the trip base currency (${trip.baseCurrency}).`,
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
    const shares =
      dto.splitMethod === ExpenseSplitMethod.custom
        ? this.split.customSplit(dto.amount, dto.currency, dto.splitShares)
        : this.split.equalSplit(
            dto.amount,
            dto.currency,
            dto.payerMemberId,
            dto.participantMemberIds
          );
    await this.access.assertTravelersBelongToTrip(tripId, [dto.payerMemberId]);
    await this.access.assertMembersBelongToTrip(
      tripId,
      shares.map((share) => share.memberId)
    );
    if (dto.linkedEventId) {
      const event = await this.prisma.itineraryEvent.findFirst({
        where: { id: dto.linkedEventId, tripId },
        select: { id: true }
      });
      if (!event) {
        throw new DomainError("INVALID_LINKED_EVENT", "Linked event is not in this trip.");
      }
    }
    return shares;
  }
}
