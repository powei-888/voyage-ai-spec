import { ExpenseStatus, ProxyPurchaseStatus, TripMemberKind } from "@prisma/client";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { ProxyPurchasesService } from "./proxy-purchases.service";

describe("ProxyPurchasesService", () => {
  it("creates a multi-item purchase and its canonical expense in one transaction", async () => {
    const external = { id: "external-1", displayName: "小美媽媽" };
    const expenseCreate = jest.fn().mockResolvedValue({ id: "expense-1" });
    const purchaseCreate = jest.fn().mockImplementation(({ data }) => ({
      id: "proxy-1",
      tripId: "trip-1",
      externalMemberId: external.id,
      payerMemberId: "traveler-1",
      expenseId: "expense-1",
      status: ProxyPurchaseStatus.purchased,
      currency: "JPY",
      note: null,
      purchasedAt: new Date("2026-08-01T00:00:00.000Z"),
      createdByMemberId: "actor-member",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      externalMember: external,
      payerMember: { id: "traveler-1", displayName: "小美" },
      expense: { id: "expense-1", status: ExpenseStatus.active },
      items: data.items.create.map((item: object, index: number) => ({
        id: `item-${index}`,
        proxyPurchaseId: "proxy-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...item
      })),
      settlements: []
    }));
    const transactionClient = {
      tripMember: { create: jest.fn().mockResolvedValue(external) },
      expense: { create: expenseCreate },
      proxyPurchase: { create: purchaseCreate }
    };
    const prisma = {
      trip: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "JPY" }) },
      $transaction: jest.fn(async (callback: (tx: typeof transactionClient) => unknown) =>
        callback(transactionClient)
      )
    };
    const access = {
      requireMember: jest.fn().mockResolvedValue({ id: "actor-member" }),
      assertTravelersBelongToTrip: jest.fn().mockResolvedValue(undefined)
    };
    const service = new ProxyPurchasesService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService
    );

    const result = await service.create("user-1", "trip-1", {
      newExternalName: "小美媽媽",
      payerMemberId: "traveler-1",
      purchasedAt: "2026-08-01",
      items: [
        { description: "藥妝組", quantity: 2, unitPrice: "350" },
        { description: "抹茶餅乾", quantity: 1, unitPrice: "420" }
      ]
    });

    expect(result).toMatchObject({
      status: "purchased",
      totalAmount: "1120",
      collectedAmount: "0",
      outstandingAmount: "1120"
    });
    expect(transactionClient.tripMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: TripMemberKind.external })
      })
    );
    expect(expenseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: "1120",
          payerMemberId: "traveler-1",
          participants: {
            create: [{ memberId: "external-1", shareAmount: "1120" }]
          }
        })
      })
    );
  });

  it("does not cancel a purchase that already has collection records", async () => {
    const prisma = {
      proxyPurchase: {
        findFirst: jest.fn().mockResolvedValue({
          id: "proxy-1",
          tripId: "trip-1",
          status: ProxyPurchaseStatus.purchased,
          currency: "JPY",
          externalMember: { id: "external-1", displayName: "小美媽媽" },
          payerMember: { id: "traveler-1", displayName: "小美" },
          expenseId: "expense-1",
          expense: { id: "expense-1", status: ExpenseStatus.active },
          items: [{ id: "item-1", amount: "500", unitPrice: "500", quantity: 1 }],
          settlements: [{ id: "settlement-1", amount: "200", settledAt: new Date() }]
        })
      }
    };
    const access = { requireMember: jest.fn().mockResolvedValue({ id: "actor-member" }) };
    const service = new ProxyPurchasesService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService
    );

    await expect(service.cancel("user-1", "trip-1", "proxy-1"))
      .rejects.toThrow("Delete recorded collections before cancelling this proxy purchase.");
  });
});
