import { ExpenseCategory, ReceiptStatus } from "@prisma/client";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { SplitCalculatorService } from "../expenses/split-calculator.service";
import { FundsService } from "../funds/funds.service";
import { ReceiptConfirmationService } from "./receipt-confirmation.service";
import { ConfirmReceiptDto } from "./receipts.dto";

describe("ReceiptConfirmationService", () => {
  it("returns the canonical expense when the same receipt is confirmed twice", async () => {
    const expenseId = "expense-1";
    let confirmed = false;
    const expense = {
      id: expenseId,
      tripId: "trip-1",
      title: "Lunch",
      amount: "1001",
      currency: "JPY",
      payerMember: { id: "member-1", displayName: "Demo" },
      participants: [
        { memberId: "member-1", shareAmount: "501" },
        { memberId: "member-2", shareAmount: "500" }
      ]
    };
    const transaction = {
      receipt: {
        findFirst: jest.fn(async () => ({
          id: "receipt-1",
          ocrStatus: confirmed ? ReceiptStatus.confirmed : ReceiptStatus.extracted,
          confirmedExpense: confirmed ? { id: expenseId } : null,
          proxyPurchases: []
        })),
        update: jest.fn(async () => {
          confirmed = true;
        })
      },
      itineraryEvent: { findFirst: jest.fn() },
      expense: {
        create: jest.fn(async () => {
          confirmed = true;
          return { id: expenseId };
        })
      }
    };
    const prisma = {
      trip: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "JPY" }) },
      expense: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(expense),
        findUnique: jest.fn().mockResolvedValue(expense)
      },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<string>) =>
        callback(transaction)
      )
    };
    const access = {
      requireMember: jest.fn().mockResolvedValue({ id: "member-1" }),
      assertTravelersBelongToTrip: jest.fn().mockResolvedValue(undefined),
      assertMembersBelongToTrip: jest.fn().mockResolvedValue(undefined)
    };
    const service = new ReceiptConfirmationService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService,
      new SplitCalculatorService(),
      {} as FundsService
    );
    const dto: ConfirmReceiptDto = {
      title: "Lunch",
      amount: "1001",
      currency: "JPY",
      category: ExpenseCategory.food,
      payerMemberId: "member-1",
      splitMethod: "equal",
      splitShares: [],
      participantMemberIds: ["member-1", "member-2"]
    };

    const first = await service.confirm("user-1", "trip-1", "receipt-1", dto);
    const second = await service.confirm("user-1", "trip-1", "receipt-1", dto);

    expect(first.id).toBe(expenseId);
    expect(second.id).toBe(expenseId);
    expect(transaction.expense.create).toHaveBeenCalledTimes(1);
    expect(prisma.expense.findUniqueOrThrow).toHaveBeenCalledTimes(2);
  });

  it("combines receipt-linked proxy shares and traveler remainder into one expense", async () => {
    const expenseCreate = jest.fn().mockResolvedValue({ id: "expense-shared" });
    const proxyUpdate = jest.fn().mockResolvedValue({ count: 2 });
    const transaction = {
      receipt: {
        findFirst: jest.fn().mockResolvedValue({
          id: "receipt-1",
          ocrStatus: ReceiptStatus.extracted,
          confirmedExpense: null,
          proxyPurchases: [
            {
              id: "proxy-a",
              currency: "JPY",
              externalMember: { id: "external-a" },
              items: [{ amount: "400" }]
            },
            {
              id: "proxy-b",
              currency: "JPY",
              externalMember: { id: "external-b" },
              items: [{ amount: "300" }]
            }
          ]
        }),
        update: jest.fn()
      },
      itineraryEvent: { findFirst: jest.fn() },
      expense: { create: expenseCreate },
      proxyPurchase: { updateMany: proxyUpdate }
    };
    const prisma = {
      trip: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "JPY" }) },
      expense: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: "expense-shared",
          participants: []
        }),
        findUnique: jest.fn()
      },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<string>) =>
        callback(transaction)
      )
    };
    const access = {
      requireMember: jest.fn().mockResolvedValue({ id: "actor-member" }),
      assertTravelersBelongToTrip: jest.fn().mockResolvedValue(undefined)
    };
    const service = new ReceiptConfirmationService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService,
      new SplitCalculatorService(),
      {} as FundsService
    );

    await service.confirm("user-1", "trip-1", "receipt-1", {
      title: "Mixed shopping",
      amount: "1000",
      currency: "JPY",
      category: ExpenseCategory.shopping,
      expenseDate: "2026-08-02",
      payerMemberId: "traveler-1",
      splitMethod: "equal",
      splitShares: [],
      participantMemberIds: ["traveler-1", "traveler-2"]
    });

    expect(expenseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: "1000",
          splitMethod: "custom",
          participants: {
            create: [
              { memberId: "external-a", shareAmount: "400" },
              { memberId: "external-b", shareAmount: "300" },
              { memberId: "traveler-1", shareAmount: "150" },
              { memberId: "traveler-2", shareAmount: "150" }
            ]
          }
        })
      })
    );
    expect(proxyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expenseId: "expense-shared",
          payerMemberId: "traveler-1",
          status: "purchased"
        })
      })
    );
  });
});
