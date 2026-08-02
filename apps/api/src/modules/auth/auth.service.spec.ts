import { PrismaService } from "../../infra/database/prisma.service";
import { AuthAttemptLimiterService } from "./auth-attempt-limiter.service";
import { AuthService } from "./auth.service";
import { hashPassword, verifyPassword } from "./password";
import { TripInvitesService } from "../trip-invites/trip-invites.service";

describe("AuthService", () => {
  const invites = {
    assertRegistrationAllowed: jest.fn(),
    redeemForRegistration: jest.fn()
  };

  afterEach(() => {
    delete process.env.REQUIRE_INVITE_FOR_REGISTRATION;
    jest.clearAllMocks();
  });

  it("changes the password and revokes every existing session", async () => {
    const currentHash = await hashPassword("current-password");
    const userUpdate = jest.fn();
    const sessionDeleteMany = jest.fn().mockResolvedValue({ count: 4 });
    const transaction = { user: { update: userUpdate }, session: { deleteMany: sessionDeleteMany } };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "user@example.com",
          displayName: "User",
          avatarUrl: null,
          passwordHash: currentHash
        })
      },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
      )
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      new AuthAttemptLimiterService(),
      invites as unknown as TripInvitesService
    );

    await expect(
      service.changePassword("user-1", {
        currentPassword: "current-password",
        newPassword: "new-secure-password"
      })
    ).resolves.toEqual({ changed: true, revokedSessions: 4 });

    const passwordHash = userUpdate.mock.calls[0][0].data.passwordHash as string;
    await expect(verifyPassword("new-secure-password", passwordHash)).resolves.toBe(true);
    expect(sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("rejects an incorrect current password", async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          passwordHash: await hashPassword("current-password")
        })
      }
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      new AuthAttemptLimiterService(),
      invites as unknown as TripInvitesService
    );

    await expect(
      service.changePassword("user-1", {
        currentPassword: "wrong-password",
        newPassword: "new-secure-password"
      })
    ).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD", status: 400 });
  });

  it("requires an invitation when invite-only registration is enabled", async () => {
    process.env.REQUIRE_INVITE_FOR_REGISTRATION = "true";
    const service = new AuthService(
      {} as PrismaService,
      new AuthAttemptLimiterService(),
      invites as unknown as TripInvitesService
    );

    await expect(
      service.register({
        email: "new@example.com",
        displayName: "New User",
        password: "secure-password"
      })
    ).rejects.toMatchObject({ code: "INVITE_REQUIRED", status: 403 });
  });

  it("creates the account and redeems its invitation in the same transaction", async () => {
    const user = {
      id: "user-new",
      email: "new@example.com",
      displayName: "New User",
      avatarUrl: null
    };
    const transaction = {
      user: { create: jest.fn().mockResolvedValue(user) },
      tripMember: { updateMany: jest.fn() }
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      session: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "session-1" })
      },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
      )
    };
    invites.redeemForRegistration.mockResolvedValue({
      tripId: "trip-1",
      memberId: "member-new",
      alreadyMember: false
    });
    const service = new AuthService(
      prisma as unknown as PrismaService,
      new AuthAttemptLimiterService(),
      invites as unknown as TripInvitesService
    );

    const result = await service.register(
      {
        email: user.email,
        displayName: user.displayName,
        password: "secure-password",
        inviteToken: "a".repeat(43)
      },
      "203.0.113.9"
    );

    expect(result).toMatchObject({ user, joinedTripId: "trip-1" });
    expect(invites.redeemForRegistration).toHaveBeenCalledWith(
      transaction,
      "a".repeat(43),
      user
    );
    expect(invites.assertRegistrationAllowed).toHaveBeenCalledWith("203.0.113.9");
    expect(transaction.tripMember.updateMany).not.toHaveBeenCalled();
  });
});
