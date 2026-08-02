import { TripMemberKind, TripRole } from "@prisma/client";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { MembersService } from "./members.service";

describe("MembersService", () => {
  function setup() {
    const created = {
      id: "external-1",
      tripId: "trip-1",
      userId: null,
      displayName: "場外代購人",
      role: TripRole.member,
      kind: TripMemberKind.external,
      joinedAt: null
    };
    const transactionClient = {
      user: {
        upsert: jest.fn()
      },
      tripMember: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created)
      }
    };
    const prisma = {
      trip: {
        findUnique: jest.fn().mockResolvedValue({ ownerUserId: "owner-user" })
      },
      tripMember: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn()
      },
      $transaction: jest.fn(
        async (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient)
      )
    };
    const access = {
      requireOwner: jest.fn().mockResolvedValue({ id: "owner-member" })
    };
    return {
      service: new MembersService(
        prisma as unknown as PrismaService,
        access as unknown as TripAccessService
      ),
      prisma,
      transactionClient
    };
  }

  it("creates an external expense party without a user account", async () => {
    const { service, transactionClient } = setup();

    await expect(
      service.add("user-1", "trip-1", {
        displayName: "場外代購人",
        kind: TripMemberKind.external
      })
    ).resolves.toMatchObject({
      userId: null,
      kind: TripMemberKind.external,
      role: TripRole.member
    });

    expect(transactionClient.user.upsert).not.toHaveBeenCalled();
    expect(transactionClient.tripMember.create).toHaveBeenCalledWith({
      data: {
        tripId: "trip-1",
        userId: undefined,
        displayName: "場外代購人",
        role: TripRole.member,
        kind: TripMemberKind.external,
        joinedAt: null
      },
      include: { user: true }
    });
  });

  it("rejects a login email for an external expense party", async () => {
    const { service, prisma } = setup();

    await expect(
      service.add("user-1", "trip-1", {
        displayName: "場外代購人",
        email: "proxy@example.com",
        kind: TripMemberKind.external
      })
    ).rejects.toMatchObject({ code: "EXTERNAL_MEMBER_EMAIL_NOT_ALLOWED" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects promoting an external expense party to owner", async () => {
    const { service, prisma } = setup();
    prisma.tripMember.findFirst.mockResolvedValue({
      id: "external-1",
      userId: null,
      kind: TripMemberKind.external,
      role: TripRole.member
    });

    await expect(
      service.update("user-1", "trip-1", "external-1", {
        role: TripRole.owner
      })
    ).rejects.toMatchObject({ code: "EXTERNAL_MEMBER_ROLE_INVALID" });
    expect(prisma.tripMember.update).not.toHaveBeenCalled();
  });

  it("does not remove a member who created invitation history", async () => {
    const { service, prisma } = setup();
    prisma.tripMember.findFirst.mockResolvedValue({
      id: "secondary-owner",
      userId: "secondary-user",
      kind: TripMemberKind.traveler,
      role: TripRole.owner
    });
    prisma.tripMember.findUnique.mockResolvedValue({
      _count: {
        paidExpenses: 0,
        expenseShares: 0,
        createdEvents: 0,
        createdBookings: 0,
        settlementsSent: 0,
        settlementsReceived: 0,
        proxyPurchasesReceived: 0,
        proxyPurchasesPaid: 0,
        createdProxyPurchases: 0,
        createdInvites: 1
      }
    });

    await expect(
      service.remove("owner-user", "trip-1", "secondary-owner")
    ).rejects.toMatchObject({ code: "MEMBER_HAS_RECORDS", status: 409 });
    expect(prisma.tripMember.delete).not.toHaveBeenCalled();
  });
});
