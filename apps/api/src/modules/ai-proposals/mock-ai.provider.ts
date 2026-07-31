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
              ? `${context.tripName} 的行程較緊湊，建議在活動之間保留彈性時間。`
              : `${context.tripName} 目前共有 ${context.eventCount} 個行程，整體安排仍有餘裕。`,
          proposedJson: {
            kind: "itinerary_check",
            warnings: context.eventCount > 6 ? ["high_event_count"] : [],
            operations: []
          }
        };
      case AIProposalType.expense_summary:
        return {
          summary: `${context.tripName} 目前已記錄 ${context.activeExpenseCount} 筆有效支出。`,
          proposedJson: {
            kind: "expense_summary",
            activeExpenseCount: context.activeExpenseCount,
            pendingReceiptCount: context.pendingReceiptCount
          }
        };
      case AIProposalType.itinerary_update:
        return {
          summary: "行程調整草稿已建立，目前尚未變更任何行程。",
          proposedJson: { kind: "itinerary_update", operations: [] }
        };
      case AIProposalType.receipt_review:
        return {
          summary: `尚有 ${context.pendingReceiptCount} 份收據草稿需要人工確認。`,
          proposedJson: {
            kind: "receipt_review",
            pendingReceiptCount: context.pendingReceiptCount
          }
        };
      case AIProposalType.booking_parse:
        return {
          summary: "v0.1 以草稿形式呈現預訂解析結果。",
          proposedJson: { kind: "booking_parse", draft: true }
        };
      case AIProposalType.memory_draft:
        return {
          summary: "旅程回憶生成功能規劃於基礎 MVP 之後提供。",
          proposedJson: { kind: "memory_draft", available: false }
        };
    }
  }
}
