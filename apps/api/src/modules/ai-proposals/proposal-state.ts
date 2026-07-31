import { HttpStatus } from "@nestjs/common";
import { AIProposalStatus } from "@prisma/client";
import { DomainError } from "../../common/domain-error";

export function assertProposalTransition(
  current: AIProposalStatus,
  target: "accepted" | "rejected"
): void {
  if (current !== AIProposalStatus.pending) {
    throw new DomainError(
      "PROPOSAL_ALREADY_DECIDED",
      `Proposal status is ${current}; it cannot be ${target}.`,
      HttpStatus.CONFLICT
    );
  }
}
