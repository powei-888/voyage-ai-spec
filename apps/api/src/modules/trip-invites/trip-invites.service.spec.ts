import { createHash } from "node:crypto";
import { TripInviteMode, TripMemberKind, TripRole, TripStatus } from "@prisma/client";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { InviteRequestLimiterService } from "./invite-request-limiter.service";
import { TripInvitesService } from "./trip-invites.service";

const activeInvite = (overrides: Record<string, unknown> = {}) => ({
  id: "invite-1",
  tripId: "trip-1",
  tokenHash: createHash("sha256").update("a".repeat(43)).digest("hex"),
  mode: TripInviteMode.group,
  maxUses: 5,
  useCount: 0,
  expiresAt: new Date(Date.now() + 86_400_000),
  revokedAt: null,
  createdByMemberId: "owner-member",
  createdAt: new Date("2026-08-02T00:00:00.000Z"),
  updatedAt: new Date("2026-08-02T00:00:00.000Z"),
  trip: { status: TripStatus.active },
  createdByMember: { id: "owner-member", displayName: "Owner" },
  redemptions: [],
  ...overrides
});

describe("TripInvitesService", () => {
  const access = {
    requireOwner: jest.fn().mockResolvedValue({ id: "owner-member" })
  };
  const limiter = { assertAllowed: jest.fn() };

  afterEach(() => jest.clearAllMocks());

  it("returns the raw token once while storing only its SHA-256 hash", async () => {
    const create = jest.fn().mockImplementation(({ data }) => activeInvite({
      tokenHash: data.tokenHash,
      mode: data.mode,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt
    }));
    const prisma = {
      trip: { findUnique: jest.fn().mockResolvedValue({ status: TripStatus.active }) },
      tripInvite: { create }
    };
    const service = new TripInvitesService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService,
      limiter as unknown as InviteRequestLimiterService
    );

    const result = await service.create("owner-user", "trip-1", {
      mode: TripInviteMode.single,
      expiresInDays: 7
    });

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const storedHash = create.mock.calls[0][0].data.tokenHash as string;
    expect(storedHash).toBe(createHash("sha256").update(result.token).digest("hex"));
    expect(storedHash).not.toBe(result.token);
    expect(result.invite).toMatchObject({ mode: "single", maxUses: 1, status: "active" });
  });

  it("atomically consumes an invitation and creates a traveler membership", async () => {
    const transaction = {
      tripInvite: {
        findUnique: jest.fn().mockResolvedValue(activeInvite()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      tripMember: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "member-new" })
      },
      tripInviteRedemption: { create: jest.fn().mockResolvedValue({ id: "redemption-1" }) }
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: "user-new", displayName: "New User" }) },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
      )
    };
    const service = new TripInvitesService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService,
      limiter as unknown as InviteRequestLimiterService
    );

    await expect(service.accept("user-new", "a".repeat(43), "203.0.113.10"))
      .resolves.toEqual({ tripId: "trip-1", memberId: "member-new", alreadyMember: false });

    expect(transaction.tripInvite.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { useCount: { increment: 1 } } })
    );
    expect(transaction.tripMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-new",
        role: TripRole.member,
        kind: TripMemberKind.traveler
      }),
      select: { id: true }
    });
    expect(transaction.tripInviteRedemption.create).toHaveBeenCalledWith({
      data: { inviteId: "invite-1", userId: "user-new", memberId: "member-new" }
    });
  });

  it("is idempotent when the user is already a traveler in the trip", async () => {
    const transaction = {
      tripInvite: {
        findUnique: jest.fn().mockResolvedValue(activeInvite()),
        updateMany: jest.fn()
      },
      tripMember: {
        findFirst: jest.fn().mockResolvedValue({ id: "member-existing" }),
        create: jest.fn()
      },
      tripInviteRedemption: { create: jest.fn() }
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", displayName: "Existing" }) },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
      )
    };
    const service = new TripInvitesService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService,
      limiter as unknown as InviteRequestLimiterService
    );

    await expect(service.accept("user-1", "a".repeat(43), "203.0.113.11"))
      .resolves.toEqual({ tripId: "trip-1", memberId: "member-existing", alreadyMember: true });
    expect(transaction.tripInvite.updateMany).not.toHaveBeenCalled();
    expect(transaction.tripMember.create).not.toHaveBeenCalled();
  });

  it.each([
    ["expired", { expiresAt: new Date(Date.now() - 1) }, "INVITE_EXPIRED"],
    ["revoked", { revokedAt: new Date() }, "INVITE_REVOKED"],
    ["full", { useCount: 5 }, "INVITE_FULL"],
    ["archived", { trip: { status: TripStatus.archived } }, "TRIP_ARCHIVED"]
  ])("rejects a %s invitation before consuming a use", async (_label, overrides, code) => {
    const transaction = {
      tripInvite: {
        findUnique: jest.fn().mockResolvedValue(activeInvite(overrides)),
        updateMany: jest.fn()
      },
      tripMember: { findFirst: jest.fn(), create: jest.fn() },
      tripInviteRedemption: { create: jest.fn() }
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", displayName: "User" }) },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
      )
    };
    const service = new TripInvitesService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService,
      limiter as unknown as InviteRequestLimiterService
    );

    await expect(service.accept("user-1", "a".repeat(43), "203.0.113.12"))
      .rejects.toMatchObject({ code });
    expect(transaction.tripInvite.updateMany).not.toHaveBeenCalled();
  });
});
