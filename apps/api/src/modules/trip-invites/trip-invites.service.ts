import { createHash, randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import {
  Prisma,
  TripInviteMode,
  TripMemberKind,
  TripRole,
  TripStatus
} from "@prisma/client";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { InviteRequestLimiterService } from "./invite-request-limiter.service";
import { CreateTripInviteDto } from "./trip-invites.dto";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const inviteInclude = {
  trip: { select: { status: true } },
  createdByMember: { select: { id: true, displayName: true } },
  redemptions: {
    select: {
      id: true,
      redeemedAt: true,
      user: { select: { id: true, email: true, displayName: true } }
    },
    orderBy: { redeemedAt: "asc" }
  }
} satisfies Prisma.TripInviteInclude;

type InviteRecord = Prisma.TripInviteGetPayload<{ include: typeof inviteInclude }>;
type InviteStatus = "active" | "expired" | "revoked" | "full" | "archived";
type RedeemingUser = { id: string; displayName: string };

@Injectable()
export class TripInvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    private readonly limiter: InviteRequestLimiterService
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireOwner(tripId, userId);
    const invites = await this.prisma.tripInvite.findMany({
      where: { tripId },
      include: inviteInclude,
      orderBy: { createdAt: "desc" }
    });
    return invites.map((invite) => this.present(invite));
  }

  async create(userId: string, tripId: string, dto: CreateTripInviteDto) {
    const actor = await this.access.requireOwner(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { status: true }
    });
    if (!trip) throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    if (trip.status !== TripStatus.active) {
      throw new DomainError(
        "TRIP_ARCHIVED",
        "Archived trips cannot create invitations.",
        HttpStatus.CONFLICT
      );
    }

    const maxUses = dto.mode === TripInviteMode.single ? 1 : dto.maxUses ?? 10;
    if (dto.mode === TripInviteMode.group && maxUses < 2) {
      throw new DomainError(
        "INVITE_MAX_USES_INVALID",
        "Group invitations must allow at least two uses."
      );
    }
    const token = randomBytes(32).toString("base64url");
    const invite = await this.prisma.tripInvite.create({
      data: {
        tripId,
        tokenHash: this.hashToken(token),
        mode: dto.mode,
        maxUses,
        expiresAt: new Date(Date.now() + dto.expiresInDays * DAY_MS),
        createdByMemberId: actor.id
      },
      include: inviteInclude
    });
    return { invite: this.present(invite), token };
  }

  async preview(rawToken: string, ipAddress: string) {
    this.limiter.assertAllowed("preview", ipAddress);
    const tokenHash = this.validTokenHash(rawToken);
    const invite = await this.prisma.tripInvite.findUnique({
      where: { tokenHash },
      select: {
        mode: true,
        maxUses: true,
        useCount: true,
        expiresAt: true,
        revokedAt: true,
        trip: {
          select: {
            status: true,
            name: true,
            destinationCountry: true,
            destinationCity: true,
            startDate: true,
            endDate: true
          }
        },
        createdByMember: { select: { displayName: true } }
      }
    });
    if (!invite) throw DomainError.notFound("INVITE_NOT_FOUND", "Invitation not found.");
    return {
      status: this.status(invite),
      mode: invite.mode,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      remainingUses: Math.max(0, invite.maxUses - invite.useCount),
      expiresAt: invite.expiresAt,
      trip: {
        name: invite.trip.name,
        destinationCountry: invite.trip.destinationCountry,
        destinationCity: invite.trip.destinationCity,
        startDate: invite.trip.startDate,
        endDate: invite.trip.endDate
      },
      invitedBy: invite.createdByMember
    };
  }

  async accept(userId: string, rawToken: string, ipAddress: string) {
    this.limiter.assertAllowed("redeem", ipAddress);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true }
    });
    if (!user) throw DomainError.notFound("USER_NOT_FOUND", "User not found.");
    try {
      return await this.prisma.$transaction((tx) =>
        this.redeemWithClient(tx, rawToken, user)
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.resolveExistingMembership(userId, rawToken);
        if (existing) return existing;
      }
      throw error;
    }
  }

  async redeemForRegistration(
    tx: Prisma.TransactionClient,
    rawToken: string,
    user: RedeemingUser
  ) {
    return this.redeemWithClient(tx, rawToken, user);
  }

  assertRegistrationAllowed(ipAddress: string): void {
    this.limiter.assertAllowed("redeem", ipAddress);
  }

  async revoke(userId: string, tripId: string, inviteId: string) {
    await this.access.requireOwner(tripId, userId);
    const invite = await this.prisma.tripInvite.findFirst({
      where: { id: inviteId, tripId },
      include: inviteInclude
    });
    if (!invite) throw DomainError.notFound("INVITE_NOT_FOUND", "Invitation not found.");
    if (invite.revokedAt) return this.present(invite);
    const revoked = await this.prisma.tripInvite.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
      include: inviteInclude
    });
    return this.present(revoked);
  }

  private async redeemWithClient(
    tx: Prisma.TransactionClient,
    rawToken: string,
    user: RedeemingUser
  ) {
    const tokenHash = this.validTokenHash(rawToken);
    const invite = await tx.tripInvite.findUnique({
      where: { tokenHash },
      include: { trip: { select: { status: true } } }
    });
    if (!invite) throw DomainError.notFound("INVITE_NOT_FOUND", "Invitation not found.");
    this.assertUsable(this.status(invite));

    const existing = await tx.tripMember.findFirst({
      where: { tripId: invite.tripId, userId: user.id, kind: TripMemberKind.traveler },
      select: { id: true }
    });
    if (existing) {
      return { tripId: invite.tripId, memberId: existing.id, alreadyMember: true };
    }

    const claimed = await tx.tripInvite.updateMany({
      where: {
        id: invite.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        useCount: { lt: invite.maxUses }
      },
      data: { useCount: { increment: 1 } }
    });
    if (claimed.count !== 1) {
      throw new DomainError(
        "INVITE_UNAVAILABLE",
        "This invitation is no longer available.",
        HttpStatus.CONFLICT
      );
    }

    const member = await tx.tripMember.create({
      data: {
        tripId: invite.tripId,
        userId: user.id,
        displayName: user.displayName,
        role: TripRole.member,
        kind: TripMemberKind.traveler,
        joinedAt: new Date()
      },
      select: { id: true }
    });
    await tx.tripInviteRedemption.create({
      data: { inviteId: invite.id, userId: user.id, memberId: member.id }
    });
    return { tripId: invite.tripId, memberId: member.id, alreadyMember: false };
  }

  private async resolveExistingMembership(userId: string, rawToken: string) {
    const tokenHash = this.validTokenHash(rawToken);
    const invite = await this.prisma.tripInvite.findUnique({
      where: { tokenHash },
      select: { tripId: true }
    });
    if (!invite) return null;
    const member = await this.prisma.tripMember.findFirst({
      where: { tripId: invite.tripId, userId, kind: TripMemberKind.traveler },
      select: { id: true }
    });
    return member
      ? { tripId: invite.tripId, memberId: member.id, alreadyMember: true }
      : null;
  }

  private present(invite: InviteRecord) {
    return {
      id: invite.id,
      tripId: invite.tripId,
      mode: invite.mode,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      remainingUses: Math.max(0, invite.maxUses - invite.useCount),
      status: this.status(invite),
      expiresAt: invite.expiresAt,
      revokedAt: invite.revokedAt,
      createdAt: invite.createdAt,
      createdByMember: invite.createdByMember,
      redemptions: invite.redemptions
    };
  }

  private status(invite: {
    revokedAt: Date | null;
    expiresAt: Date;
    useCount: number;
    maxUses: number;
    trip: { status: TripStatus };
  }): InviteStatus {
    if (invite.trip.status === TripStatus.archived) return "archived";
    if (invite.revokedAt) return "revoked";
    if (invite.expiresAt <= new Date()) return "expired";
    if (invite.useCount >= invite.maxUses) return "full";
    return "active";
  }

  private assertUsable(status: InviteStatus): void {
    const errors: Record<Exclude<InviteStatus, "active">, [string, string, HttpStatus]> = {
      archived: ["TRIP_ARCHIVED", "This trip has been archived.", HttpStatus.CONFLICT],
      revoked: ["INVITE_REVOKED", "This invitation was revoked.", HttpStatus.GONE],
      expired: ["INVITE_EXPIRED", "This invitation has expired.", HttpStatus.GONE],
      full: ["INVITE_FULL", "This invitation has reached its usage limit.", HttpStatus.CONFLICT]
    };
    if (status === "active") return;
    const [code, message, httpStatus] = errors[status];
    throw new DomainError(code, message, httpStatus);
  }

  private validTokenHash(rawToken: string): string {
    const token = rawToken.trim();
    if (!TOKEN_PATTERN.test(token)) {
      throw DomainError.notFound("INVITE_NOT_FOUND", "Invitation not found.");
    }
    return this.hashToken(token);
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
