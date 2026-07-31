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
    payerMemberId: string,
    participantMemberIds: string[]
  ): ExpenseShare[] {
    if (participantMemberIds.length === 0) {
      throw new DomainError(
        "EXPENSE_PARTICIPANTS_REQUIRED",
        "Select at least one expense participant."
      );
    }
    const uniqueIds = new Set(participantMemberIds);
    if (uniqueIds.size !== participantMemberIds.length) {
      throw new DomainError(
        "DUPLICATE_EXPENSE_PARTICIPANT",
        "Each expense participant can be selected only once."
      );
    }

    const orderedIds = [...uniqueIds].sort((a, b) => {
      if (a === payerMemberId) return -1;
      if (b === payerMemberId) return 1;
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
}
