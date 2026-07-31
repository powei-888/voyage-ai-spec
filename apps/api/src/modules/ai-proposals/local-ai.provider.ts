import { Injectable } from "@nestjs/common";
import { AIProposalType, Prisma } from "@prisma/client";
import { LocalInferenceCoordinator } from "../../infra/local-model/local-inference-coordinator";
import { OllamaClient } from "../../infra/local-model/ollama-client";
import { AiProvider, ProposalDraft } from "./ai-provider";

const TYPE_GUIDANCE: Record<AIProposalType, string> = {
  itinerary_check:
    "檢查每日行程密度、時間重疊、移動合理性與可休息的空檔，列出 warnings 與 suggestions。",
  itinerary_update:
    "根據使用者要求提出行程調整建議，僅描述建議，不得宣稱已修改資料。",
  expense_summary:
    "分析目前總支出、預算使用、主要分類與待確認收據，列出 observations 與 suggestions。",
  receipt_review:
    "整理待確認收據數量與審核優先順序，不得自行確認或建立支出。",
  booking_parse:
    "依現有資訊提出預訂資料整理建議；資料不足時清楚列出 missingFields。",
  memory_draft:
    "根據旅程名稱與行程摘要撰寫簡短回憶草稿；資料不足時不得虛構細節。"
};

function requiredSummary(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Local model response is missing a summary.");
  }
  return value.trim().slice(0, 800);
}

@Injectable()
export class LocalAiProvider implements AiProvider {
  constructor(
    private readonly ollama: OllamaClient,
    private readonly coordinator: LocalInferenceCoordinator
  ) {}

  async propose(input: Parameters<AiProvider["propose"]>[0]): Promise<ProposalDraft> {
    return this.coordinator.run(async () => {
      const response = await this.ollama.chatJson({
        system: [
          "你是 Voyage AI 的地端旅程分析模型。",
          "一律使用繁體中文，只能依提供的資料分析，不得虛構已完成的動作。",
          "行程、收據、預訂或支出都不能由你直接修改。",
          "只輸出 JSON 物件，格式為 {\"summary\":\"簡潔結論\",\"analysis\":{...}}。"
        ].join("\n"),
        prompt: JSON.stringify({
          task: input.type,
          guidance: TYPE_GUIDANCE[input.type],
          userRequest: input.inputText || null,
          tripContext: input.context
        }),
        maxTokens: 900
      });

      const analysis =
        response.analysis && typeof response.analysis === "object" && !Array.isArray(response.analysis)
          ? (response.analysis as Prisma.InputJsonObject)
          : {};

      return {
        summary: requiredSummary(response.summary),
        proposedJson: {
          ...analysis,
          kind: input.type,
          source: "local_ollama",
          model: this.ollama.model,
          operations: []
        }
      };
    });
  }
}
