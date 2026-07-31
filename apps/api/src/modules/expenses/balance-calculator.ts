import { ExpenseStatus } from "@prisma/client";
import { fromMinorUnits, toMinorUnits } from "./money";

export type BalanceMember = { id: string; displayName: string };
export type BalanceExpense = {
  amount: string;
  payerMemberId: string;
  status: ExpenseStatus;
  participants: Array<{ memberId: string; shareAmount: string }>;
};
export type BalanceSettlement = {
  fromMemberId: string;
  toMemberId: string;
  amount: string;
};

export function calculateBalances(
  members: BalanceMember[],
  expenses: BalanceExpense[],
  currency: string,
  completedSettlements: BalanceSettlement[] = []
) {
  const totals = new Map(
    members.map((member) => [
      member.id,
      {
        memberId: member.id,
        displayName: member.displayName,
        paid: 0n,
        share: 0n,
        adjustment: 0n
      }
    ])
  );

  for (const expense of expenses) {
    if (expense.status !== ExpenseStatus.active) continue;
    const payer = totals.get(expense.payerMemberId);
    if (payer) payer.paid += toMinorUnits(expense.amount, currency);
    for (const participant of expense.participants) {
      const total = totals.get(participant.memberId);
      if (total) total.share += toMinorUnits(participant.shareAmount, currency);
    }
  }

  for (const settlement of completedSettlements) {
    const amount = toMinorUnits(settlement.amount, currency);
    const sender = totals.get(settlement.fromMemberId);
    const receiver = totals.get(settlement.toMemberId);
    if (sender) sender.adjustment += amount;
    if (receiver) receiver.adjustment -= amount;
  }

  const balances = [...totals.values()].map((total) => ({
    memberId: total.memberId,
    displayName: total.displayName,
    paidAmount: fromMinorUnits(total.paid, currency),
    shareAmount: fromMinorUnits(total.share, currency),
    balance: fromMinorUnits(total.paid - total.share + total.adjustment, currency),
    balanceMinor: total.paid - total.share + total.adjustment
  }));

  const creditors = balances
    .filter((item) => item.balanceMinor > 0n)
    .map((item) => ({ ...item, remaining: item.balanceMinor }))
    .sort((a, b) => a.memberId.localeCompare(b.memberId));
  const debtors = balances
    .filter((item) => item.balanceMinor < 0n)
    .map((item) => ({ ...item, remaining: -item.balanceMinor }))
    .sort((a, b) => a.memberId.localeCompare(b.memberId));
  const settlements: Array<{
    fromMemberId: string;
    toMemberId: string;
    amount: string;
  }> = [];

  let creditorIndex = 0;
  let debtorIndex = 0;
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex]!;
    const amount = creditor!.remaining < debtor.remaining
      ? creditor!.remaining
      : debtor.remaining;
    settlements.push({
      fromMemberId: debtor.memberId,
      toMemberId: creditor!.memberId,
      amount: fromMinorUnits(amount, currency)
    });
    creditor!.remaining -= amount;
    debtor.remaining -= amount;
    if (creditor!.remaining === 0n) creditorIndex += 1;
    if (debtor.remaining === 0n) debtorIndex += 1;
  }

  return {
    currency,
    members: balances.map(({ balanceMinor: _balanceMinor, ...item }) => item),
    settlements
  };
}
