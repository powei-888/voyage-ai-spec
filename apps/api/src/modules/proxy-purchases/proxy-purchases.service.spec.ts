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

  it("creates a pending order from translated receipt items with adjusted allocations", async () => {
    const external = { id: "external-1", displayName: "阿姨" };
    const purchaseCreate = jest.fn().mockImplementation(({ data }) => ({
      id: "proxy-receipt-1",
      tripId: "trip-1",
      externalMemberId: external.id,
      payerMemberId: null,
      expenseId: null,
      sourceReceiptId: "receipt-1",
      status: ProxyPurchaseStatus.requested,
      currency: "JPY",
      note: data.note,
      purchasedAt: null,
      createdByMemberId: "actor-member",
      createdAt: new Date("2026-08-02T00:00:00.000Z"),
      updatedAt: new Date("2026-08-02T00:00:00.000Z"),
      externalMember: external,
      payerMember: null,
      expense: null,
      items: data.items.create.map((item: object, index: number) => ({
        id: `source-item-${index}`,
        proxyPurchaseId: "proxy-receipt-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...item
      })),
      settlements: []
    }));
    const receipt = {
      id: "receipt-1",
      imageOriginalName: "tokyo.png",
      extractedJson: {
        currency: "JPY",
        items: [
          {
            description: "ロートCキューブ",
            translatedDescription: "樂敦 C Cube 眼藥水",
            originalLanguage: "ja",
            translationStatus: "translated",
            translationSource: "local_ai",
            translationModel: "qwen3.5:9b",
            quantity: "2",
            unitPrice: "350",
            amount: "700"
          },
          {
            description: "抹茶クッキー",
            translatedDescription: "抹茶餅乾",
            originalLanguage: "ja",
            translationStatus: "translated",
            translationSource: "manual",
            translationModel: null,
            quantity: "1",
            unitPrice: "420",
            amount: "420"
          }
        ]
      }
    };
    const transactionClient = {
      receipt: { findFirst: jest.fn().mockResolvedValue({ id: "receipt-1" }) },
      tripMember: { create: jest.fn().mockResolvedValue(external) },
      proxyPurchase: { create: purchaseCreate }
    };
    const prisma = {
      trip: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "JPY" }) },
      receipt: { findFirst: jest.fn().mockResolvedValue(receipt) },
      $transaction: jest.fn(async (callback: (tx: typeof transactionClient) => unknown) =>
        callback(transactionClient)
      )
    };
    const access = {
      requireMember: jest.fn().mockResolvedValue({ id: "actor-member" })
    };
    const service = new ProxyPurchasesService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService
    );

    const result = await service.createFromReceipt(
      "user-1",
      "trip-1",
      "receipt-1",
      {
        newExternalName: "阿姨",
        itemIndexes: [0, 1],
        itemAmounts: [
          { index: 0, amount: "650" },
          { index: 1, amount: "400" }
        ],
        note: "日本藥妝"
      }
    );

    expect(result).toMatchObject({
      status: "requested",
      sourceReceiptId: "receipt-1",
      totalAmount: "1050",
      outstandingAmount: "0"
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        description: "樂敦 C Cube 眼藥水",
        sourceReceiptId: "receipt-1",
        sourceReceiptItemIndex: 0,
        amount: "650",
        note: expect.stringContaining("收據明細：JPY 700；實際分攤：JPY 650")
      }),
      expect.objectContaining({
        description: "抹茶餅乾",
        sourceReceiptItemIndex: 1,
        amount: "400",
        note: expect.stringContaining("收據明細：JPY 420；實際分攤：JPY 400")
      })
    ]);
  });
});
