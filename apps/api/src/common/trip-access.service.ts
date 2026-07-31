import { HttpStatus, Injectable } from "@nestjs/common";
import { TripMember, TripRole } from "@prisma/client";
import { PrismaService } from "../infra/database/prisma.service";
import {
  DEFAULT_DEMO_USER_EMAIL,
  DEFAULT_DEMO_USER_ID,
  DEFAULT_DEMO_USER_NAME
} from "./constants";
import { DomainError } from "./domain-error";

@Injectable()
export class TripAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureIdentity(userId: string): Promise<void> {
    const isDemo = userId === DEFAULT_DEMO_USER_ID;
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: isDemo
          ? process.env.DEMO_USER_EMAIL || DEFAULT_DEMO_USER_EMAIL
          : `${userId}@local.voyage`,
        displayName: isDemo
          ? process.env.DEMO_USER_NAME || DEFAULT_DEMO_USER_NAME
          : "Voyage Traveler"
      }
    });
  }

  async requireMember(tripId: string, userId: string): Promise<TripMember> {
    const member = await this.prisma.tripMember.findFirst({
      where: { tripId, userId }
    });
    if (!member) {
      throw DomainError.forbidden(
        "TRIP_ACCESS_DENIED",
        "You must be a trip member to access this workspace."
      );
    }
    return member;
  }

  async requireOwner(tripId: string, userId: string): Promise<TripMember> {
    const member = await this.requireMember(tripId, userId);
    if (member.role !== TripRole.owner) {
      throw DomainError.forbidden(
        "TRIP_OWNER_REQUIRED",
        "Only a trip owner can perform this action."
      );
    }
    return member;
  }

  async assertMembersBelongToTrip(
    tripId: string,
    memberIds: string[]
  ): Promise<void> {
    const uniqueIds = [...new Set(memberIds)];
    const count = await this.prisma.tripMember.count({
      where: { tripId, id: { in: uniqueIds } }
    });
    if (count !== uniqueIds.length) {
      throw new DomainError(
        "INVALID_TRIP_MEMBER",
        "One or more selected members do not belong to this trip.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
  }
}
