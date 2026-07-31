import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { CreateEventDto, ReorderEventsDto, UpdateEventDto } from "./itinerary.dto";

const eventInclude = {
  participants: {
    include: {
      member: { select: { id: true, displayName: true } }
    }
  },
  _count: { select: { bookings: true, expenses: true } }
} as const;

@Injectable()
export class ItineraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService
  ) {}

  async listDays(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    return this.prisma.itineraryDay.findMany({
      where: { tripId },
      include: {
        events: {
          include: eventInclude,
          orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }]
        }
      },
      orderBy: { dayIndex: "asc" }
    });
  }

  async getEvent(userId: string, tripId: string, eventId: string) {
    await this.access.requireMember(tripId, userId);
    const event = await this.prisma.itineraryEvent.findFirst({
      where: { id: eventId, tripId },
      include: eventInclude
    });
    if (!event) {
      throw DomainError.notFound("EVENT_NOT_FOUND", "Itinerary event not found.");
    }
    return event;
  }

  async createEvent(
    userId: string,
    tripId: string,
    dayId: string,
    dto: CreateEventDto
  ) {
    const actor = await this.access.requireMember(tripId, userId);
    const day = await this.prisma.itineraryDay.findFirst({
      where: { id: dayId, tripId }
    });
    if (!day) {
      throw DomainError.notFound("ITINERARY_DAY_NOT_FOUND", "Itinerary day not found.");
    }
    const participantIds = dto.participantMemberIds ?? [];
    await this.access.assertMembersBelongToTrip(tripId, participantIds);
    this.validateTimes(dto.startTime, dto.endTime);

    const lastEvent = await this.prisma.itineraryEvent.findFirst({
      where: { dayId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true }
    });

    return this.prisma.itineraryEvent.create({
      data: {
        tripId,
        dayId,
        title: dto.title.trim(),
        category: dto.category,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        locationName: dto.locationName?.trim() || null,
        address: dto.address?.trim() || null,
        notes: dto.notes?.trim() || null,
        estimatedCostAmount: dto.estimatedCostAmount,
        estimatedCostCurrency: dto.estimatedCostCurrency,
        sortOrder: (lastEvent?.sortOrder ?? -1) + 1,
        createdByMemberId: actor.id,
        participants: {
          create: participantIds.map((memberId) => ({ memberId }))
        }
      },
      include: eventInclude
    });
  }

  async updateEvent(
    userId: string,
    tripId: string,
    eventId: string,
    dto: UpdateEventDto
  ) {
    await this.access.requireMember(tripId, userId);
    const existing = await this.prisma.itineraryEvent.findFirst({
      where: { id: eventId, tripId }
    });
    if (!existing) {
      throw DomainError.notFound("EVENT_NOT_FOUND", "Itinerary event not found.");
    }
    const participantIds = dto.participantMemberIds;
    if (participantIds) {
      await this.access.assertMembersBelongToTrip(tripId, participantIds);
    }
    const startTime =
      dto.startTime === undefined ? existing.startTime?.toISOString() : dto.startTime ?? undefined;
    const endTime =
      dto.endTime === undefined ? existing.endTime?.toISOString() : dto.endTime ?? undefined;
    this.validateTimes(startTime, endTime);

    return this.prisma.$transaction(async (tx) => {
      if (participantIds) {
        await tx.eventParticipant.deleteMany({ where: { eventId } });
        await tx.eventParticipant.createMany({
          data: participantIds.map((memberId) => ({ eventId, memberId }))
        });
      }
      return tx.itineraryEvent.update({
        where: { id: eventId },
        data: {
          title: dto.title?.trim(),
          category: dto.category,
          startTime:
            dto.startTime === undefined ? undefined : dto.startTime ? new Date(dto.startTime) : null,
          endTime:
            dto.endTime === undefined ? undefined : dto.endTime ? new Date(dto.endTime) : null,
          locationName:
            dto.locationName === undefined ? undefined : dto.locationName.trim() || null,
          address: dto.address === undefined ? undefined : dto.address.trim() || null,
          notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
          estimatedCostAmount: dto.estimatedCostAmount,
          estimatedCostCurrency: dto.estimatedCostCurrency
        },
        include: eventInclude
      });
    });
  }

  async reorder(
    userId: string,
    tripId: string,
    dayId: string,
    dto: ReorderEventsDto
  ) {
    await this.access.requireMember(tripId, userId);
    const events = await this.prisma.itineraryEvent.findMany({
      where: { tripId, dayId },
      select: { id: true }
    });
    const currentIds = new Set(events.map((event) => event.id));
    if (
      currentIds.size !== dto.eventIds.length ||
      dto.eventIds.some((eventId) => !currentIds.has(eventId))
    ) {
      throw new DomainError(
        "INVALID_EVENT_ORDER",
        "Reorder must contain every event in the selected day exactly once."
      );
    }

    await this.prisma.$transaction(
      dto.eventIds.map((eventId, sortOrder) =>
        this.prisma.itineraryEvent.update({
          where: { id: eventId },
          data: { sortOrder }
        })
      )
    );
    return this.listDays(userId, tripId);
  }

  async deleteEvent(userId: string, tripId: string, eventId: string) {
    await this.access.requireMember(tripId, userId);
    const event = await this.prisma.itineraryEvent.findFirst({
      where: { id: eventId, tripId },
      select: {
        id: true,
        _count: { select: { bookings: true, expenses: true } }
      }
    });
    if (!event) {
      throw DomainError.notFound("EVENT_NOT_FOUND", "Itinerary event not found.");
    }
    if (event._count.bookings > 0 || event._count.expenses > 0) {
      throw new DomainError(
        "EVENT_HAS_LINKED_RECORDS",
        "Unlink bookings and expenses before deleting this event.",
        HttpStatus.CONFLICT
      );
    }
    return this.prisma.itineraryEvent.delete({ where: { id: eventId } });
  }

  private validateTimes(start?: string, end?: string): void {
    if (start && end && new Date(start) > new Date(end)) {
      throw new DomainError("INVALID_EVENT_TIME", "Event end time must follow start time.");
    }
  }
}
