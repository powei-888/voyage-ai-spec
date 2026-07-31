import { Injectable } from "@nestjs/common";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { CreateBookingDto, UpdateBookingDto } from "./bookings.dto";

const bookingInclude = {
  linkedEvent: { select: { id: true, title: true } },
  createdByMember: { select: { id: true, displayName: true } }
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    return this.prisma.booking.findMany({
      where: { tripId },
      include: bookingInclude,
      orderBy: [{ startTime: "asc" }, { createdAt: "desc" }]
    });
  }

  async get(userId: string, tripId: string, bookingId: string) {
    await this.access.requireMember(tripId, userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tripId },
      include: bookingInclude
    });
    if (!booking) {
      throw DomainError.notFound("BOOKING_NOT_FOUND", "Booking not found.");
    }
    return booking;
  }

  async create(userId: string, tripId: string, dto: CreateBookingDto) {
    const actor = await this.access.requireMember(tripId, userId);
    await this.validateEvent(tripId, dto.linkedEventId);
    this.validateTimes(dto.startTime, dto.endTime);

    return this.prisma.booking.create({
      data: {
        tripId,
        type: dto.type,
        title: dto.title.trim(),
        provider: dto.provider?.trim() || null,
        confirmationCode: dto.confirmationCode?.trim() || null,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        location: dto.location?.trim() || null,
        attachmentUrl: dto.attachmentUrl || null,
        linkedEventId: dto.linkedEventId || null,
        createdByMemberId: actor.id
      },
      include: bookingInclude
    });
  }

  async update(
    userId: string,
    tripId: string,
    bookingId: string,
    dto: UpdateBookingDto
  ) {
    await this.access.requireMember(tripId, userId);
    const existing = await this.prisma.booking.findFirst({
      where: { id: bookingId, tripId }
    });
    if (!existing) {
      throw DomainError.notFound("BOOKING_NOT_FOUND", "Booking not found.");
    }
    await this.validateEvent(
      tripId,
      dto.linkedEventId === undefined
        ? existing.linkedEventId ?? undefined
        : dto.linkedEventId ?? undefined
    );
    const startTime =
      dto.startTime === undefined ? existing.startTime?.toISOString() : dto.startTime ?? undefined;
    const endTime = dto.endTime === undefined ? existing.endTime?.toISOString() : dto.endTime ?? undefined;
    this.validateTimes(startTime, endTime);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        type: dto.type,
        title: dto.title?.trim(),
        provider: dto.provider === undefined ? undefined : dto.provider.trim() || null,
        confirmationCode:
          dto.confirmationCode === undefined
            ? undefined
            : dto.confirmationCode.trim() || null,
        startTime:
          dto.startTime === undefined ? undefined : dto.startTime ? new Date(dto.startTime) : null,
        endTime:
          dto.endTime === undefined ? undefined : dto.endTime ? new Date(dto.endTime) : null,
        location: dto.location === undefined ? undefined : dto.location.trim() || null,
        attachmentUrl: dto.attachmentUrl,
        linkedEventId: dto.linkedEventId
      },
      include: bookingInclude
    });
  }

  async remove(userId: string, tripId: string, bookingId: string) {
    await this.access.requireMember(tripId, userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tripId },
      select: { id: true }
    });
    if (!booking) {
      throw DomainError.notFound("BOOKING_NOT_FOUND", "Booking not found.");
    }
    return this.prisma.booking.delete({ where: { id: bookingId } });
  }

  private async validateEvent(tripId: string, eventId?: string): Promise<void> {
    if (!eventId) return;
    const event = await this.prisma.itineraryEvent.findFirst({
      where: { id: eventId, tripId },
      select: { id: true }
    });
    if (!event) {
      throw new DomainError("INVALID_LINKED_EVENT", "Linked event is not in this trip.");
    }
  }

  private validateTimes(start?: string, end?: string): void {
    if (start && end && new Date(start) > new Date(end)) {
      throw new DomainError("INVALID_BOOKING_TIME", "Booking end time must follow start time.");
    }
  }
}
