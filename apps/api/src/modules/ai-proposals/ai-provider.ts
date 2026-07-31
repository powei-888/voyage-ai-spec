import { AIProposalType, Prisma } from "@prisma/client";

export type ProposalContext = {
  tripName: string;
  destination: string;
  eventCount: number;
  activeExpenseCount: number;
  pendingReceiptCount: number;
};

export type ProposalDraft = {
  summary: string;
  proposedJson: Prisma.InputJsonValue;
};

export interface AiProvider {
  propose(input: {
    type: AIProposalType;
    inputText?: string;
    context: ProposalContext;
  }): Promise<ProposalDraft>;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");
