import { AIProposalType, Prisma } from "@prisma/client";

export type ProposalContext = {
  tripName: string;
  destination: string;
  eventCount: number;
  activeExpenseCount: number;
  pendingReceiptCount: number;
  budgetAmount: string | null;
  expenseTotal: string;
  publicFundBalance?: string | null;
  baseCurrency: string;
  categoryTotals: Array<{ category: string; amount: string }>;
  days: Array<{
    dayIndex: number;
    date: string;
    events: Array<{
      title: string;
      startTime: string | null;
      endTime: string | null;
      locationName: string | null;
    }>;
  }>;
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
