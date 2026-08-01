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
  createdByMember: { select: { id: true, displayName: true } },
  proxyPurchase: { select: { id: true } }
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
    if (dto.proxyPurchaseId) {
      const purchase = await this.prisma.proxyPurchase.findFirst({
        where: { id: dto.proxyPurchaseId, tripId, status: "purchased" },
        include: {
          items: { select: { amount: true } },
          settlements: { select: { amount: true } },
          expense: { select: { status: true } }
        }
      });
      if (
        !purchase ||
        purchase.expense?.status !== "active" ||
        purchase.externalMemberId !== dto.fromMemberId ||
        purchase.payerMemberId !== dto.toMemberId ||
        purchase.currency !== dto.currency
      ) {
        throw new DomainError(
          "INVALID_PROXY_PURCHASE_SETTLEMENT",
          "Settlement does not match an active proxy purchase.",
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
      const purchaseTotal = purchase.items.reduce(
        (sum, item) => sum + toMinorUnits(item.amount.toString(), dto.currency),
        0n
      );
      const collected = purchase.settlements.reduce(
        (sum, item) => sum + toMinorUnits(item.amount.toString(), dto.currency),
        0n
      );
      if (amountMinor > purchaseTotal - collected) {
        throw new DomainError(
          "PROXY_PURCHASE_COLLECTION_EXCEEDS_OUTSTANDING",
          "Collection exceeds the outstanding proxy-purchase amount.",
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
    } else {
      const matchingPurchases = await this.prisma.proxyPurchase.findMany({
        where: {
          tripId,
          status: "purchased",
          externalMemberId: dto.fromMemberId,
          payerMemberId: dto.toMemberId,
          expense: { status: "active" }
        },
        include: {
          items: { select: { amount: true } },
          settlements: { select: { amount: true } }
        }
      });
      const hasOpenPurchase = matchingPurchases.some((purchase) => {
        const total = purchase.items.reduce(
          (sum, item) => sum + toMinorUnits(item.amount.toString(), dto.currency),
          0n
        );
        const collected = purchase.settlements.reduce(
          (sum, item) => sum + toMinorUnits(item.amount.toString(), dto.currency),
          0n
        );
        return collected < total;
      });
      if (hasOpenPurchase) {
        throw new DomainError(
          "PROXY_PURCHASE_SETTLEMENT_REQUIRED",
          "Record this collection from the proxy-purchase page.",
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }
    }
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
        proxyPurchaseId: dto.proxyPurchaseId || null,
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
