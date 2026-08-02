import { HttpStatus, Injectable } from "@nestjs/common";
import {
  Prisma,
  ReceiptStatus,
  TripMemberKind,
  TripStatus
} from "@prisma/client";
import { MAX_TRIP_DAYS } from "../../common/constants";
import { enumerateDates, parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { calculateFundCash } from "../funds/fund-calculator";
import { CreateTripDto, UpdateTripDto } from "./trips.dto";

const tripInclude = {
  owner: { select: { id: true, displayName: true, email: true } },
  _count: {
    select: {
      members: { where: { kind: TripMemberKind.traveler } },
      events: true,
      expenses: true,
      receipts: true,
      bookings: true,
      proposals: true
    }
  }
} satisfies Prisma.TripInclude;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService
  ) {}

  async create(userId: string, dto: CreateTripDto) {
    const startDate = parseDateOnly(dto.startDate);
    const endDate = parseDateOnly(dto.endDate);
    const dates = this.validateDateRange(startDate, endDate);
    await this.access.ensureIdentity(userId);

    return this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const trip = await tx.trip.create({
        data: {
          name: dto.name.trim(),
          destinationCountry: dto.destinationCountry?.trim() || null,
          destinationCity: dto.destinationCity?.trim() || null,
          startDate,
          endDate,
          baseCurrency: dto.baseCurrency,
          budgetAmount: dto.budgetAmount,
          ownerUserId: userId,
          members: {
            create: {
              userId,
              displayName: owner.displayName,
              role: "owner",
              joinedAt: new Date()
            }
          },
          days: {
            create: dates.map((date, index) => ({
              date,
              dayIndex: index + 1
            }))
          }
        },
        include: tripInclude
      });
      return trip;
    });
  }

  async list(userId: string) {
    return this.prisma.trip.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        ...tripInclude,
        events: {
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
          take: 1,
          select: { id: true, title: true, startTime: true }
        }
      },
      orderBy: [{ status: "asc" }, { startDate: "asc" }]
    });
  }

  async get(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: tripInclude
    });
    if (!trip) {
      throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    }
    return trip;
  }

  async update(userId: string, tripId: string, dto: UpdateTripDto) {
    await this.access.requireOwner(tripId, userId);
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    }

    const startDate = dto.startDate ? parseDateOnly(dto.startDate) : trip.startDate;
    const endDate = dto.endDate ? parseDateOnly(dto.endDate) : trip.endDate;
    const dates = this.validateDateRange(startDate, endDate);
    const datesChanged =
      startDate.getTime() !== trip.startDate.getTime() ||
      endDate.getTime() !== trip.endDate.getTime();
    if (dto.baseCurrency && dto.baseCurrency !== trip.baseCurrency) {
      const [expenseCount, settlementCount, fundCount] = await Promise.all([
        this.prisma.expense.count({ where: { tripId } }),
        this.prisma.settlement.count({ where: { tripId } }),
        this.prisma.tripFund.count({ where: { tripId } })
      ]);
      if (expenseCount + settlementCount + fundCount > 0) {
        throw new DomainError(
          "TRIP_CURRENCY_LOCKED",
          "The base currency cannot change after financial records exist.",
          HttpStatus.CONFLICT
        );
      }
    }

    if (datesChanged) {
      const eventCount = await this.prisma.itineraryEvent.count({ where: { tripId } });
      if (eventCount > 0) {
        throw new DomainError(
          "TRIP_DATES_HAVE_EVENTS",
          "Remove or move existing events before changing trip dates.",
          HttpStatus.CONFLICT
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (datesChanged) {
        await tx.itineraryDay.deleteMany({ where: { tripId } });
      }
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          name: dto.name?.trim(),
          destinationCountry:
            dto.destinationCountry === undefined
              ? undefined
              : dto.destinationCountry.trim() || null,
          destinationCity:
            dto.destinationCity === undefined
              ? undefined
              : dto.destinationCity.trim() || null,
          startDate,
          endDate,
          baseCurrency: dto.baseCurrency,
          budgetAmount: dto.clearBudget === null ? null : dto.budgetAmount
        }
      });
      if (datesChanged) {
        await tx.itineraryDay.createMany({
          data: dates.map((date, index) => ({ tripId, date, dayIndex: index + 1 }))
        });
      }
      return tx.trip.findUniqueOrThrow({
        where: { id: updated.id },
        include: tripInclude
      });
    });
  }

  async archive(userId: string, tripId: string) {
    await this.access.requireOwner(tripId, userId);
    return this.prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.archived },
      include: tripInclude
    });
  }

  async dashboard(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: tripInclude
    });
    if (!trip) {
      throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    }

    const now = new Date();
    const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [todayEvents, upcomingEvent, travelerExpenseTotal, pendingReceipts, pendingProposals, upcomingBookings, publicFund] =
      await Promise.all([
        this.prisma.itineraryEvent.findMany({
          where: { tripId, day: { date: { gte: today, lt: tomorrow } } },
          orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
          take: 8
        }),
        this.prisma.itineraryEvent.findFirst({
          where: { tripId, startTime: { gte: now } },
          orderBy: { startTime: "asc" }
        }),
        this.prisma.expenseParticipant.aggregate({
          where: {
            expense: { tripId, status: "active" },
            member: { kind: TripMemberKind.traveler }
          },
          _sum: { shareAmount: true }
        }),
        this.prisma.receipt.count({
          where: { tripId, ocrStatus: ReceiptStatus.extracted }
        }),
        this.prisma.aIProposal.count({ where: { tripId, status: "pending" } }),
        this.prisma.booking.findMany({
          where: { tripId, startTime: { gte: now } },
          orderBy: { startTime: "asc" },
          take: 3
        }),
        this.prisma.tripFund.findFirst({
          where: { tripId, currency: trip.baseCurrency },
          include: {
            transactions: { select: { type: true, amount: true, voidedAt: true } },
            expenses: { select: { amount: true, status: true } }
          }
        })
      ]);

    const publicFundSummary = publicFund
      ? calculateFundCash(
          publicFund.currency,
          publicFund.transactions.map((transaction) => ({
            ...transaction,
            amount: transaction.amount.toString()
          })),
          publicFund.expenses.map((expense) => ({
            ...expense,
            amount: expense.amount.toString()
          }))
        )
      : null;

    return {
      trip,
      todayEvents,
      upcomingEvent,
      recordedExpenseAmount:
        travelerExpenseTotal._sum.shareAmount ?? new Prisma.Decimal(0),
      pendingReceipts,
      pendingProposals,
      upcomingBookings,
      publicFund: publicFund && publicFundSummary
        ? {
            id: publicFund.id,
            name: publicFund.name,
            currency: publicFund.currency,
            balance: publicFundSummary.balance
          }
        : null
    };
  }

  private validateDateRange(startDate: Date, endDate: Date): Date[] {
    if (startDate > endDate) {
      throw new DomainError("INVALID_TRIP_DATES", "Start date must be before end date.");
    }
    const dates = enumerateDates(startDate, endDate);
    if (dates.length > MAX_TRIP_DAYS) {
      throw new DomainError(
        "TRIP_TOO_LONG",
        `Trips can contain at most ${MAX_TRIP_DAYS} days in v0.1.`
      );
    }
    return dates;
  }
}
