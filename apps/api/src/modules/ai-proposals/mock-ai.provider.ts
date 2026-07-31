import { Injectable } from "@nestjs/common";
import { AIProposalType } from "@prisma/client";
import { AiProvider, ProposalDraft } from "./ai-provider";

@Injectable()
export class MockAiProvider implements AiProvider {
  async propose(input: Parameters<AiProvider["propose"]>[0]): Promise<ProposalDraft> {
    const { context } = input;
    switch (input.type) {
      case AIProposalType.itinerary_check:
        return {
          summary:
            context.eventCount > 6
              ? `${context.tripName} has a packed itinerary. Add breathing room between events.`
              : `${context.tripName} has a manageable itinerary with ${context.eventCount} events.`,
          proposedJson: {
            kind: "itinerary_check",
            warnings: context.eventCount > 6 ? ["high_event_count"] : [],
            operations: []
          }
        };
      case AIProposalType.expense_summary:
        return {
          summary: `${context.activeExpenseCount} active expenses are recorded for ${context.tripName}.`,
          proposedJson: {
            kind: "expense_summary",
            activeExpenseCount: context.activeExpenseCount,
            pendingReceiptCount: context.pendingReceiptCount
          }
        };
      case AIProposalType.itinerary_update:
        return {
          summary: "A draft itinerary adjustment is ready for review. No events were changed.",
          proposedJson: { kind: "itinerary_update", operations: [] }
        };
      case AIProposalType.receipt_review:
        return {
          summary: `${context.pendingReceiptCount} receipt drafts still need human confirmation.`,
          proposedJson: {
            kind: "receipt_review",
            pendingReceiptCount: context.pendingReceiptCount
          }
        };
      case AIProposalType.booking_parse:
        return {
          summary: "Booking parsing is represented as a draft in v0.1.",
          proposedJson: { kind: "booking_parse", draft: true }
        };
      case AIProposalType.memory_draft:
        return {
          summary: "Travel memory generation is planned after the foundation MVP.",
          proposedJson: { kind: "memory_draft", available: false }
        };
    }
  }
}
