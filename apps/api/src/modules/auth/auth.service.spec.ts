import { PrismaService } from "../../infra/database/prisma.service";
import { AuthAttemptLimiterService } from "./auth-attempt-limiter.service";
import { AuthService } from "./auth.service";
import { hashPassword, verifyPassword } from "./password";

describe("AuthService", () => {
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
      new AuthAttemptLimiterService()
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
      new AuthAttemptLimiterService()
    );

    await expect(
      service.changePassword("user-1", {
        currentPassword: "wrong-password",
        newPassword: "new-secure-password"
      })
    ).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD", status: 400 });
  });
});
