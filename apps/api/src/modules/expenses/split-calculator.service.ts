import { Injectable } from "@nestjs/common";
import { DomainError } from "../../common/domain-error";
import { fromMinorUnits, toMinorUnits } from "./money";

export type ExpenseShare = {
  memberId: string;
  shareAmount: string;
};

@Injectable()
export class SplitCalculatorService {
  equalSplit(
    amount: string,
    currency: string,
    payerMemberId: string | null,
    participantMemberIds: string[]
  ): ExpenseShare[] {
    this.assertUniqueParticipants(participantMemberIds);
    const orderedIds = [...participantMemberIds].sort((a, b) => {
      if (payerMemberId && a === payerMemberId) return -1;
      if (payerMemberId && b === payerMemberId) return 1;
      return a.localeCompare(b);
    });
    const total = toMinorUnits(amount, currency);
    const count = BigInt(orderedIds.length);
    const base = total / count;
    const remainder = total % count;

    return orderedIds.map((memberId, index) => ({
      memberId,
      shareAmount: fromMinorUnits(
        base + (BigInt(index) < remainder ? 1n : 0n),
        currency
      )
    }));
  }

  customSplit(
    amount: string,
    currency: string,
    shares: ExpenseShare[]
  ): ExpenseShare[] {
    this.assertUniqueParticipants(shares.map((share) => share.memberId));
    const expected = toMinorUnits(amount, currency);
    const actual = shares.reduce(
      (sum, share) => sum + toMinorUnits(share.shareAmount, currency),
      0n
    );
    if (actual !== expected) {
      throw new DomainError(
        "CUSTOM_SPLIT_TOTAL_MISMATCH",
        "Custom shares must add up to the expense amount.",
        undefined,
        {
          amount: fromMinorUnits(expected, currency),
          shareTotal: fromMinorUnits(actual, currency)
        }
      );
    }
    return [...shares].sort((a, b) => a.memberId.localeCompare(b.memberId));
  }

  private assertUniqueParticipants(memberIds: string[]): void {
    if (memberIds.length === 0) {
      throw new DomainError(
        "EXPENSE_PARTICIPANTS_REQUIRED",
        "Select at least one expense participant."
      );
    }
    if (new Set(memberIds).size !== memberIds.length) {
      throw new DomainError(
        "DUPLICATE_EXPENSE_PARTICIPANT",
        "Each expense participant can be selected only once."
      );
    }
  }
}
