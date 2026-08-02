import {
  ExpensePaymentSource,
  ExpenseStatus,
  FundTransactionType,
  TripMemberKind
} from "@prisma/client";
import { fromMinorUnits, toMinorUnits } from "./money";

export type BalanceMember = {
  id: string;
  displayName: string;
  kind: TripMemberKind;
};
export type BalanceExpense = {
  amount: string;
  paymentSource?: ExpensePaymentSource;
  payerMemberId: string | null;
  fundId?: string | null;
  status: ExpenseStatus;
  participants: Array<{ memberId: string; shareAmount: string }>;
};
export type BalanceSettlement = {
  fromMemberId: string;
  toMemberId: string;
  amount: string;
};
export type BalanceFundTransaction = {
  fundId: string;
  type: FundTransactionType;
  memberId: string | null;
  amount: string;
  voidedAt: Date | null;
};

export function calculateBalances(
  members: BalanceMember[],
  expenses: BalanceExpense[],
  currency: string,
  completedSettlements: BalanceSettlement[] = [],
  fundTransactions: BalanceFundTransaction[] = []
) {
  const totals = new Map(
    members.map((member) => [
      member.id,
      {
        memberId: member.id,
        displayName: member.displayName,
        kind: member.kind,
        paid: 0n,
        share: 0n,
        adjustment: 0n
      }
    ])
  );

  for (const expense of expenses) {
    if (expense.status !== ExpenseStatus.active) continue;
    if (expense.paymentSource !== ExpensePaymentSource.fund && expense.payerMemberId) {
      const payer = totals.get(expense.payerMemberId);
      if (payer) payer.paid += toMinorUnits(expense.amount, currency);
    }
    for (const participant of expense.participants) {
      const total = totals.get(participant.memberId);
      if (total) total.share += toMinorUnits(participant.shareAmount, currency);
    }
  }

  for (const transaction of fundTransactions) {
    if (transaction.voidedAt || !transaction.memberId) continue;
    const member = totals.get(transaction.memberId);
    if (!member) continue;
    const amount = toMinorUnits(transaction.amount, currency);
    if (
      transaction.type === FundTransactionType.contribution ||
      transaction.type === FundTransactionType.collection
    ) {
      member.paid += amount;
    }
    if (transaction.type === FundTransactionType.refund) member.paid -= amount;
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
    kind: total.kind,
    paidAmount: fromMinorUnits(total.paid, currency),
    shareAmount: fromMinorUnits(total.share, currency),
    balance: fromMinorUnits(total.paid - total.share + total.adjustment, currency),
    balanceMinor: total.paid - total.share + total.adjustment
  }));

  type SettlementNode = {
    id: string;
    memberId: string | null;
    memberKind: TripMemberKind | null;
    nodeType: "member" | "fund";
    remaining: bigint;
  };
  const creditors: SettlementNode[] = balances
    .filter((item) => item.balanceMinor > 0n)
    .map((item) => ({
      id: item.memberId,
      memberId: item.memberId,
      memberKind: item.kind,
      nodeType: "member" as const,
      remaining: item.balanceMinor
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const debtors: SettlementNode[] = balances
    .filter((item) => item.balanceMinor < 0n)
    .map((item) => ({
      id: item.memberId,
      memberId: item.memberId,
      memberKind: item.kind,
      nodeType: "member" as const,
      remaining: -item.balanceMinor
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const fundId = expenses.find((expense) => expense.fundId)?.fundId
    ?? fundTransactions[0]?.fundId
    ?? null;
  const memberBalanceTotal = balances.reduce(
    (sum, item) => sum + item.balanceMinor,
    0n
  );
  if (fundId && memberBalanceTotal !== 0n) {
    const node: SettlementNode = {
      id: `fund:${fundId}`,
      memberId: null,
      memberKind: null,
      nodeType: "fund",
      remaining: memberBalanceTotal < 0n ? -memberBalanceTotal : memberBalanceTotal
    };
    if (memberBalanceTotal < 0n) creditors.push(node);
    else debtors.push(node);
  }
  const settlements: Array<{
    fromMemberId: string;
    toMemberId: string;
    amount: string;
  }> = [];
  const fundTransfers: Array<{
    fundId: string;
    memberId: string;
    type: "contribution" | "refund" | "collection";
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
    const formattedAmount = fromMinorUnits(amount, currency);
    if (debtor.nodeType === "member" && creditor!.nodeType === "member") {
      settlements.push({
        fromMemberId: debtor.memberId!,
        toMemberId: creditor!.memberId!,
        amount: formattedAmount
      });
    } else if (debtor.nodeType === "member" && creditor!.nodeType === "fund") {
      fundTransfers.push({
        fundId: fundId!,
        memberId: debtor.memberId!,
        type: debtor.memberKind === TripMemberKind.external ? "collection" : "contribution",
        amount: formattedAmount
      });
    } else if (debtor.nodeType === "fund" && creditor!.nodeType === "member") {
      fundTransfers.push({
        fundId: fundId!,
        memberId: creditor!.memberId!,
        type: "refund",
        amount: formattedAmount
      });
    }
    creditor!.remaining -= amount;
    debtor.remaining -= amount;
    if (creditor!.remaining === 0n) creditorIndex += 1;
    if (debtor.remaining === 0n) debtorIndex += 1;
  }

  const externalReceivables = balances
    .filter(
      (item) =>
        item.kind === TripMemberKind.external && item.balanceMinor < 0n
    )
    .map((item) => ({
      memberId: item.memberId,
      displayName: item.displayName,
      amount: fromMinorUnits(-item.balanceMinor, currency)
    }));

  return {
    currency,
    members: balances.map(({ balanceMinor: _balanceMinor, ...item }) => item),
    settlements,
    fundTransfers,
    externalReceivables
  };
}
