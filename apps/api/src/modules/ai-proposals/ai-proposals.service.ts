import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { AIProposalStatus, ReceiptStatus } from "@prisma/client";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { AI_PROVIDER, AiProvider } from "./ai-provider";
import { CreateProposalDto } from "./ai-proposals.dto";
import { assertProposalTransition } from "./proposal-state";

const proposalInclude = {
  createdByMember: { select: { id: true, displayName: true } },
  appliedByMember: { select: { id: true, displayName: true } }
} as const;

@Injectable()
export class AiProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    return this.prisma.aIProposal.findMany({
      where: { tripId },
      include: proposalInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });
  }

  async get(userId: string, tripId: string, proposalId: string) {
    await this.access.requireMember(tripId, userId);
    const proposal = await this.prisma.aIProposal.findFirst({
      where: { id: proposalId, tripId },
      include: proposalInclude
    });
    if (!proposal) {
      throw DomainError.notFound("PROPOSAL_NOT_FOUND", "AI proposal not found.");
    }
    return proposal;
  }

  async create(userId: string, tripId: string, dto: CreateProposalDto) {
    const actor = await this.access.requireMember(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        name: true,
        destinationCity: true,
        destinationCountry: true,
        budgetAmount: true,
        baseCurrency: true,
        days: {
          orderBy: { dayIndex: "asc" },
          select: {
            dayIndex: true,
            date: true,
            events: {
              orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
              select: {
                title: true,
                startTime: true,
                endTime: true,
                locationName: true
              }
            }
          }
        },
        _count: { select: { events: true } }
      }
    });
    if (!trip) {
      throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    }
    const [activeExpenseCount, pendingReceiptCount, expenseTotal, categoryTotals] =
      await Promise.all([
        this.prisma.expense.count({ where: { tripId, status: "active" } }),
        this.prisma.receipt.count({
          where: { tripId, ocrStatus: ReceiptStatus.extracted }
        }),
        this.prisma.expense.aggregate({
          where: { tripId, status: "active" },
          _sum: { amount: true }
        }),
        this.prisma.expense.groupBy({
          by: ["category"],
          where: { tripId, status: "active" },
          _sum: { amount: true }
        })
      ]);
    let draft: Awaited<ReturnType<AiProvider["propose"]>>;
    try {
      draft = await this.provider.propose({
        type: dto.type,
        inputText: dto.inputText?.trim(),
        context: {
          tripName: trip.name,
          destination:
            [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(", ") ||
            "未設定目的地",
          eventCount: trip._count.events,
          activeExpenseCount,
          pendingReceiptCount,
          budgetAmount: trip.budgetAmount?.toString() ?? null,
          expenseTotal: expenseTotal._sum.amount?.toString() ?? "0",
          baseCurrency: trip.baseCurrency,
          categoryTotals: categoryTotals.map((item) => ({
            category: item.category,
            amount: item._sum.amount?.toString() ?? "0"
          })),
          days: trip.days.map((day) => ({
            dayIndex: day.dayIndex,
            date: day.date.toISOString().slice(0, 10),
            events: day.events.map((event) => ({
              ...event,
              startTime: event.startTime?.toISOString() ?? null,
              endTime: event.endTime?.toISOString() ?? null
            }))
          }))
        }
      });
    } catch (error) {
      throw new DomainError(
        "LOCAL_AI_UNAVAILABLE",
        "Local AI analysis is temporarily unavailable.",
        HttpStatus.SERVICE_UNAVAILABLE,
        { cause: error instanceof Error ? error.message : "Unknown error" }
      );
    }

    return this.prisma.aIProposal.create({
      data: {
        tripId,
        type: dto.type,
        inputText: dto.inputText?.trim() || null,
        summary: draft.summary,
        proposedJson: draft.proposedJson,
        createdByMemberId: actor.id
      },
      include: proposalInclude
    });
  }

  async accept(userId: string, tripId: string, proposalId: string) {
    const actor = await this.access.requireMember(tripId, userId);
    const proposal = await this.prisma.aIProposal.findFirst({
      where: { id: proposalId, tripId }
    });
    if (!proposal) {
      throw DomainError.notFound("PROPOSAL_NOT_FOUND", "AI proposal not found.");
    }
    assertProposalTransition(proposal.status, AIProposalStatus.accepted);

    return this.prisma.aIProposal.update({
      where: { id: proposalId },
      data: {
        status: AIProposalStatus.accepted,
        appliedByMemberId: actor.id,
        appliedAt: new Date()
      },
      include: proposalInclude
    });
  }

  async reject(userId: string, tripId: string, proposalId: string) {
    await this.access.requireMember(tripId, userId);
    const proposal = await this.prisma.aIProposal.findFirst({
      where: { id: proposalId, tripId }
    });
    if (!proposal) {
      throw DomainError.notFound("PROPOSAL_NOT_FOUND", "AI proposal not found.");
    }
    assertProposalTransition(proposal.status, AIProposalStatus.rejected);
    return this.prisma.aIProposal.update({
      where: { id: proposalId },
      data: { status: AIProposalStatus.rejected },
      include: proposalInclude
    });
  }
}
