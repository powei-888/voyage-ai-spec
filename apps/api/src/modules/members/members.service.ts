import { HttpStatus, Injectable } from "@nestjs/common";
import { TripMemberKind, TripRole } from "@prisma/client";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { AddMemberDto, UpdateMemberDto } from "./members.dto";

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    return this.prisma.tripMember.findMany({
      where: { tripId },
      include: {
        user: { select: { id: true, email: true, avatarUrl: true } }
      },
      orderBy: [{ kind: "asc" }, { role: "asc" }, { createdAt: "asc" }]
    });
  }

  async add(userId: string, tripId: string, dto: AddMemberDto) {
    await this.access.requireOwner(tripId, userId);
    const email = dto.email?.trim().toLowerCase();
    const kind = dto.kind ?? TripMemberKind.traveler;
    if (kind === TripMemberKind.external && email) {
      throw new DomainError(
        "EXTERNAL_MEMBER_EMAIL_NOT_ALLOWED",
        "External expense parties cannot have login email addresses.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const user = kind === TripMemberKind.traveler && email
        ? await tx.user.upsert({
            where: { email },
            update: {},
            create: { email, displayName: dto.displayName.trim() }
          })
        : null;

      if (user) {
        const existing = await tx.tripMember.findFirst({
          where: { tripId, userId: user.id }
        });
        if (existing) {
          throw new DomainError(
            "MEMBER_ALREADY_EXISTS",
            "This user is already a trip member.",
            HttpStatus.CONFLICT
          );
        }
      }

      return tx.tripMember.create({
        data: {
          tripId,
          userId: user?.id,
          displayName: dto.displayName.trim(),
          role: TripRole.member,
          kind,
          joinedAt: user ? new Date() : null
        },
        include: { user: true }
      });
    });
  }

  async update(
    userId: string,
    tripId: string,
    memberId: string,
    dto: UpdateMemberDto
  ) {
    await this.access.requireOwner(tripId, userId);
    const [trip, member] = await Promise.all([
      this.prisma.trip.findUnique({ where: { id: tripId } }),
      this.prisma.tripMember.findFirst({ where: { id: memberId, tripId } })
    ]);
    if (!trip || !member) {
      throw DomainError.notFound("MEMBER_NOT_FOUND", "Trip member not found.");
    }
    if (member.userId === trip.ownerUserId && dto.role === TripRole.member) {
      throw new DomainError(
        "OWNER_ROLE_REQUIRED",
        "The trip creator must remain an owner.",
        HttpStatus.CONFLICT
      );
    }
    if (
      member.kind === TripMemberKind.external &&
      dto.role &&
      dto.role !== TripRole.member
    ) {
      throw new DomainError(
        "EXTERNAL_MEMBER_ROLE_INVALID",
        "External expense parties cannot receive trip roles.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    return this.prisma.tripMember.update({
      where: { id: memberId },
      data: {
        displayName: dto.displayName?.trim(),
        role: dto.role
      },
      include: { user: true }
    });
  }

  async remove(userId: string, tripId: string, memberId: string) {
    await this.access.requireOwner(tripId, userId);
    const [trip, member] = await Promise.all([
      this.prisma.trip.findUnique({ where: { id: tripId } }),
      this.prisma.tripMember.findFirst({ where: { id: memberId, tripId } })
    ]);
    if (!trip || !member) {
      throw DomainError.notFound("MEMBER_NOT_FOUND", "Trip member not found.");
    }
    if (member.userId === trip.ownerUserId) {
      throw new DomainError(
        "CANNOT_REMOVE_OWNER",
        "The trip creator cannot be removed.",
        HttpStatus.CONFLICT
      );
    }

    const linkedCount = await this.prisma.tripMember.findUnique({
      where: { id: memberId },
      select: {
        _count: {
          select: {
            paidExpenses: true,
            expenseShares: true,
            createdEvents: true,
            createdBookings: true,
            settlementsSent: true,
            settlementsReceived: true
          }
        }
      }
    });
    if (linkedCount && Object.values(linkedCount._count).some((count) => count > 0)) {
      throw new DomainError(
        "MEMBER_HAS_RECORDS",
        "Members with itinerary or financial history cannot be removed.",
        HttpStatus.CONFLICT
      );
    }

    return this.prisma.tripMember.delete({ where: { id: memberId } });
  }
}
