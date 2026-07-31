import { AIProposalType } from "@prisma/client";
import { LocalInferenceCoordinator } from "../../infra/local-model/local-inference-coordinator";
import { OllamaClient } from "../../infra/local-model/ollama-client";
import { ProposalContext } from "./ai-provider";
import { LocalAiProvider } from "./local-ai.provider";

const context: ProposalContext = {
  tripName: "東京五日",
  destination: "東京，日本",
  eventCount: 2,
  activeExpenseCount: 1,
  pendingReceiptCount: 0,
  budgetAmount: "10000",
  expenseTotal: "2500",
  baseCurrency: "JPY",
  categoryTotals: [{ category: "food", amount: "2500" }],
  days: [
    {
      dayIndex: 1,
      date: "2026-08-01",
      events: [
        {
          title: "淺草",
          startTime: "2026-08-01T09:00:00.000Z",
          endTime: "2026-08-01T11:00:00.000Z",
          locationName: "淺草"
        }
      ]
    }
  ]
};

describe("LocalAiProvider", () => {
  it("stores Qwen analysis as a reviewable proposal without operations", async () => {
    const ollama = {
      model: "qwen3.5:9b",
      chatJson: jest.fn().mockResolvedValue({
        summary: "目前行程沒有明顯衝突。",
        analysis: { warnings: [], suggestions: ["保留移動時間"] }
      })
    } as unknown as OllamaClient;
    const provider = new LocalAiProvider(ollama, new LocalInferenceCoordinator());

    const draft = await provider.propose({
      type: AIProposalType.itinerary_check,
      context
    });

    expect(draft.summary).toBe("目前行程沒有明顯衝突。");
    expect(draft.proposedJson).toMatchObject({
      kind: "itinerary_check",
      source: "local_ollama",
      model: "qwen3.5:9b",
      operations: []
    });
    expect(ollama.chatJson).toHaveBeenCalledTimes(1);
  });
});
