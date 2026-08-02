import { createHash, randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainError } from "../../common/domain-error";
import { PrismaService } from "../../infra/database/prisma.service";
import { AuthAttemptLimiterService } from "./auth-attempt-limiter.service";
import { ChangePasswordDto, LoginDto, RegisterDto } from "./auth.dto";
import { hashPassword, verifyPassword } from "./password";
import { TripInvitesService } from "../trip-invites/trip-invites.service";

const SESSION_DAYS = 30;
const MAX_USER_SESSIONS = 10;
const DUMMY_PASSWORD_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
const publicUser = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attempts: AuthAttemptLimiterService,
    private readonly invites: TripInvitesService
  ) {}

  async register(dto: RegisterDto, ipAddress = "unknown") {
    if (process.env.REQUIRE_INVITE_FOR_REGISTRATION === "true" && !dto.inviteToken) {
      throw DomainError.forbidden(
        "INVITE_REQUIRED",
        "A valid trip invitation is required to create an account."
      );
    }
    if (dto.inviteToken) this.invites.assertRegistrationAllowed(ipAddress);
    const passwordHash = await hashPassword(dto.password);
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (existing?.passwordHash) {
      throw new DomainError(
        "EMAIL_ALREADY_REGISTERED",
        "This email already has a local account.",
        HttpStatus.CONFLICT
      );
    }

    const registration = await this.prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { displayName: dto.displayName.trim(), passwordHash },
            select: publicUser
          })
        : await tx.user.create({
            data: {
              email: dto.email,
              displayName: dto.displayName.trim(),
              passwordHash
            },
            select: publicUser
          });
      let joinedTripId: string | null = null;
      if (dto.inviteToken) {
        const redemption = await this.invites.redeemForRegistration(
          tx,
          dto.inviteToken,
          saved
        );
        joinedTripId = redemption.tripId;
      } else {
        await tx.tripMember.updateMany({
          where: { userId: saved.id, joinedAt: null },
          data: { joinedAt: new Date() }
        });
      }
      return { user: saved, joinedTripId };
    });

    return {
      ...(await this.createSession(registration.user)),
      joinedTripId: registration.joinedTripId
    };
  }

  async login(dto: LoginDto, ipAddress: string) {
    this.attempts.assertAllowed(ipAddress, dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    const valid = await verifyPassword(dto.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      this.attempts.recordFailure(ipAddress, dto.email);
      throw new DomainError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
        HttpStatus.UNAUTHORIZED
      );
    }
    this.attempts.reset(ipAddress, dto.email);
    return this.createSession({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl
    });
  }

  async authenticate(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { select: publicUser } }
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }
    return session.user;
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(token) }
    });
  }

  async logoutAll(userId: string): Promise<{ revokedSessions: number }> {
    const result = await this.prisma.session.deleteMany({ where: { userId } });
    return { revokedSessions: result.count };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw new DomainError(
        "INVALID_CURRENT_PASSWORD",
        "Current password is incorrect.",
        HttpStatus.BAD_REQUEST
      );
    }
    if (await verifyPassword(dto.newPassword, user.passwordHash)) {
      throw new DomainError(
        "PASSWORD_UNCHANGED",
        "New password must be different from the current password."
      );
    }
    const passwordHash = await hashPassword(dto.newPassword);
    const revokedSessions = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      return tx.session.deleteMany({ where: { userId } });
    });
    return { changed: true, revokedSessions: revokedSessions.count };
  }

  private async createSession(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    const now = new Date();
    await this.prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
    const sessions = await this.prisma.session.findMany({
      where: { userId: user.id },
      select: { id: true },
      orderBy: { createdAt: "desc" }
    });
    const excess = sessions.slice(MAX_USER_SESSIONS - 1).map((session) => session.id);
    if (excess.length > 0) {
      await this.prisma.session.deleteMany({ where: { id: { in: excess } } });
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_DAYS);
    await this.prisma.session.create({
      data: { userId: user.id, tokenHash: this.hashToken(token), expiresAt }
    });
    return { token, expiresAt, user };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
