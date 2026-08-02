import { ExpenseStatus, FundTransactionType } from "@prisma/client";
import { calculateFundCash } from "./fund-calculator";

describe("calculateFundCash", () => {
  it("combines inflows, outflows, collections and active expenses", () => {
    const result = calculateFundCash(
      "JPY",
      [
        { type: FundTransactionType.contribution, amount: "9000", voidedAt: null },
        { type: FundTransactionType.refund, amount: "1000", voidedAt: null },
        { type: FundTransactionType.adjustment_credit, amount: "500", voidedAt: null },
        { type: FundTransactionType.adjustment_debit, amount: "100", voidedAt: null },
        { type: FundTransactionType.collection, amount: "200", voidedAt: null },
        { type: FundTransactionType.contribution, amount: "999", voidedAt: new Date() }
      ],
      [
        { amount: "6000", status: ExpenseStatus.active },
        { amount: "800", status: ExpenseStatus.voided }
      ]
    );

    expect(result).toEqual({
      balanceMinor: 2600n,
      balance: "2600",
      totals: {
        contributions: "9000",
        refunds: "1000",
        adjustmentCredits: "500",
        adjustmentDebits: "100",
        collections: "200",
        expenses: "6000"
      }
    });
  });
});
