import { AIProposalStatus } from "@prisma/client";
import { assertProposalTransition } from "./proposal-state";

describe("assertProposalTransition", () => {
  it("allows a pending proposal to be accepted or rejected", () => {
    expect(() =>
      assertProposalTransition(AIProposalStatus.pending, AIProposalStatus.accepted)
    ).not.toThrow();
    expect(() =>
      assertProposalTransition(AIProposalStatus.pending, AIProposalStatus.rejected)
    ).not.toThrow();
  });

  it("does not allow a rejected proposal to apply", () => {
    expect(() =>
      assertProposalTransition(AIProposalStatus.rejected, AIProposalStatus.accepted)
    ).toThrow("Proposal status is rejected; it cannot be accepted.");
  });

  it("does not allow a proposal to be decided twice", () => {
    expect(() =>
      assertProposalTransition(AIProposalStatus.accepted, AIProposalStatus.rejected)
    ).toThrow("Proposal status is accepted; it cannot be rejected.");
  });
});
