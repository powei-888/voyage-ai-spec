import { Injectable } from "@nestjs/common";
import { AIProposalType } from "@prisma/client";
import { AiProvider, ProposalDraft, ProposalContext } from "./ai-provider";

@Injectable()
export class MockAiProvider implements AiProvider {
  async propose(input: Parameters<AiProvider["propose"]>[0]): Promise<ProposalDraft> {
    const { context } = input;
    switch (input.type) {
      case AIProposalType.itinerary_check:
        return this.itineraryCheck(context);
      case AIProposalType.expense_summary:
        return this.expenseSummary(context);
      case AIProposalType.itinerary_update:
        return {
          summary: "行程調整草稿已建立；目前沒有可安全自動套用的操作。",
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
          summary: "預訂解析需要外部文件模型，目前保留為人工建立草稿。",
          proposedJson: { kind: "booking_parse", available: false }
        };
      case AIProposalType.memory_draft:
        return {
          summary: "旅程回憶需要照片與事件內容，目前資料仍不足。",
          proposedJson: { kind: "memory_draft", available: false }
        };
    }
  }

  private itineraryCheck(context: ProposalContext): ProposalDraft {
    const warnings: string[] = [];
    for (const day of context.days) {
      if (day.events.length > 5) {
        warnings.push(`第 ${day.dayIndex} 天共有 ${day.events.length} 個行程，建議保留空檔。`);
      }
      const timed = day.events
        .filter((event) => event.startTime)
        .sort((a, b) => a.startTime!.localeCompare(b.startTime!));
      for (let index = 1; index < timed.length; index += 1) {
        const previous = timed[index - 1]!;
        const current = timed[index]!;
        if (previous.endTime && previous.endTime > current.startTime!) {
          warnings.push(`第 ${day.dayIndex} 天「${previous.title}」與「${current.title}」時間重疊。`);
        }
      }
    }
    return {
      summary: warnings.length
        ? `找到 ${warnings.length} 個需要留意的行程安排。`
        : `${context.tripName} 的時間安排目前沒有明顯衝突。`,
      proposedJson: {
        kind: "itinerary_check",
        checkedDays: context.days.length,
        warnings,
        operations: []
      }
    };
  }

  private expenseSummary(context: ProposalContext): ProposalDraft {
    const total = Number(context.expenseTotal);
    const budget = context.budgetAmount ? Number(context.budgetAmount) : null;
    const ratio = budget && budget > 0 ? Math.round((total / budget) * 100) : null;
    const largest = [...context.categoryTotals].sort(
      (a, b) => Number(b.amount) - Number(a.amount)
    )[0];
    const budgetText = ratio === null ? "尚未設定預算" : `已使用預算 ${ratio}%`;
    return {
      summary: `${context.tripName} 已記錄 ${context.activeExpenseCount} 筆支出，${budgetText}。`,
      proposedJson: {
        kind: "expense_summary",
        currency: context.baseCurrency,
        recordedTotal: context.expenseTotal,
        budgetAmount: context.budgetAmount,
        budgetUsagePercent: ratio,
        largestCategory: largest?.category ?? null,
        largestCategoryAmount: largest?.amount ?? null,
        pendingReceiptCount: context.pendingReceiptCount
      }
    };
  }
}
