import { ExpenseStatus, FundTransactionType } from "@prisma/client";
import { fromMinorUnits, toMinorUnits } from "../expenses/money";

export type FundCashTransaction = {
  type: FundTransactionType;
  amount: string;
  voidedAt: Date | null;
};

export type FundCashExpense = {
  amount: string;
  status: ExpenseStatus;
};

export function calculateFundCash(
  currency: string,
  transactions: FundCashTransaction[],
  expenses: FundCashExpense[]
) {
  const totals = {
    contributions: 0n,
    refunds: 0n,
    adjustmentCredits: 0n,
    adjustmentDebits: 0n,
    collections: 0n,
    expenses: 0n
  };

  for (const transaction of transactions) {
    if (transaction.voidedAt) continue;
    const amount = toMinorUnits(transaction.amount, currency);
    if (transaction.type === FundTransactionType.contribution) totals.contributions += amount;
    if (transaction.type === FundTransactionType.refund) totals.refunds += amount;
    if (transaction.type === FundTransactionType.adjustment_credit) totals.adjustmentCredits += amount;
    if (transaction.type === FundTransactionType.adjustment_debit) totals.adjustmentDebits += amount;
    if (transaction.type === FundTransactionType.collection) totals.collections += amount;
  }

  for (const expense of expenses) {
    if (expense.status === ExpenseStatus.active) {
      totals.expenses += toMinorUnits(expense.amount, currency);
    }
  }

  const balance = totals.contributions
    + totals.adjustmentCredits
    + totals.collections
    - totals.refunds
    - totals.adjustmentDebits
    - totals.expenses;

  return {
    balanceMinor: balance,
    balance: fromMinorUnits(balance, currency),
    totals: {
      contributions: fromMinorUnits(totals.contributions, currency),
      refunds: fromMinorUnits(totals.refunds, currency),
      adjustmentCredits: fromMinorUnits(totals.adjustmentCredits, currency),
      adjustmentDebits: fromMinorUnits(totals.adjustmentDebits, currency),
      collections: fromMinorUnits(totals.collections, currency),
      expenses: fromMinorUnits(totals.expenses, currency)
    }
  };
}
