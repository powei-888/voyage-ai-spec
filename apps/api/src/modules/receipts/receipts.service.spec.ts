import { ExpenseCategory, ReceiptStatus } from "@prisma/client";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { SplitCalculatorService } from "../expenses/split-calculator.service";
import { OcrProvider } from "./ocr-provider";
import { ReceiptStorage } from "./receipt-storage";
import { ConfirmReceiptDto } from "./receipts.dto";
import { ReceiptsService } from "./receipts.service";

describe("ReceiptsService confirmation", () => {
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
          confirmedExpense: confirmed ? { id: expenseId } : null
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
      assertMembersBelongToTrip: jest.fn().mockResolvedValue(undefined)
    };
    const service = new ReceiptsService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService,
      new SplitCalculatorService(),
      {} as OcrProvider,
      {} as ReceiptStorage
    );
    const dto: ConfirmReceiptDto = {
      title: "Lunch",
      amount: "1001",
      currency: "JPY",
      category: ExpenseCategory.food,
      payerMemberId: "member-1",
      participantMemberIds: ["member-1", "member-2"]
    };

    const first = await service.confirm("user-1", "trip-1", "receipt-1", dto);
    const second = await service.confirm("user-1", "trip-1", "receipt-1", dto);

    expect(first.id).toBe(expenseId);
    expect(second.id).toBe(expenseId);
    expect(transaction.expense.create).toHaveBeenCalledTimes(1);
    expect(prisma.expense.findUniqueOrThrow).toHaveBeenCalledTimes(2);
  });
});
