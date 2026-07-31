import { HttpStatus, Injectable } from "@nestjs/common";
import { parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { ExpensesService } from "../expenses/expenses.service";
import { toMinorUnits } from "../expenses/money";
import { CreateSettlementDto } from "./settlements.dto";

const settlementInclude = {
  fromMember: { select: { id: true, displayName: true } },
  toMember: { select: { id: true, displayName: true } },
  createdByMember: { select: { id: true, displayName: true } }
} as const;

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    private readonly expenses: ExpensesService
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    return this.prisma.settlement.findMany({
      where: { tripId },
      include: settlementInclude,
      orderBy: [{ settledAt: "desc" }, { createdAt: "desc" }]
    });
  }

  async create(userId: string, tripId: string, dto: CreateSettlementDto) {
    const actor = await this.access.requireMember(tripId, userId);
    if (dto.fromMemberId === dto.toMemberId) {
      throw new DomainError(
        "INVALID_SETTLEMENT_MEMBERS",
        "Settlement sender and receiver must be different."
      );
    }
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
        `Settlements must use the trip base currency (${trip.baseCurrency}).`,
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
    const amountMinor = toMinorUnits(dto.amount, dto.currency);
    await this.access.assertMembersBelongToTrip(tripId, [
      dto.fromMemberId,
      dto.toMemberId
    ]);
    const balances = await this.expenses.balances(userId, tripId);
    const sender = balances.members.find((item) => item.memberId === dto.fromMemberId);
    const receiver = balances.members.find((item) => item.memberId === dto.toMemberId);
    const senderDebt = sender?.balance.startsWith("-")
      ? toMinorUnits(sender.balance.slice(1), dto.currency)
      : 0n;
    const receiverCredit = receiver && Number(receiver.balance) > 0
      ? toMinorUnits(receiver.balance, dto.currency)
      : 0n;
    if (amountMinor > senderDebt || amountMinor > receiverCredit) {
      throw new DomainError(
        "SETTLEMENT_EXCEEDS_BALANCE",
        "Settlement amount exceeds the current outstanding balance.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    return this.prisma.settlement.create({
      data: {
        tripId,
        fromMemberId: dto.fromMemberId,
        toMemberId: dto.toMemberId,
        amount: dto.amount,
        currency: dto.currency,
        settledAt: parseDateOnly(dto.settledAt),
        note: dto.note?.trim() || null,
        createdByMemberId: actor.id
      },
      include: settlementInclude
    });
  }

  async remove(userId: string, tripId: string, settlementId: string) {
    await this.access.requireMember(tripId, userId);
    const settlement = await this.prisma.settlement.findFirst({
      where: { id: settlementId, tripId }
    });
    if (!settlement) {
      throw DomainError.notFound("SETTLEMENT_NOT_FOUND", "Settlement not found.");
    }
    return this.prisma.settlement.delete({ where: { id: settlementId } });
  }
}
