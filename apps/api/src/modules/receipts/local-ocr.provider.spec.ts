import { ExpenseCategory } from "@prisma/client";
import { LocalInferenceCoordinator } from "../../infra/local-model/local-inference-coordinator";
import { OllamaClient } from "../../infra/local-model/ollama-client";
import { LocalOcrProvider } from "./local-ocr.provider";

describe("LocalOcrProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("combines local OCR confidence with normalized Qwen receipt fields", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "TAIPEI COFFEE TOTAL TWD 1,234",
          blocks: [{ confidence: 0.8 }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const ollama = {
      model: "qwen3.5:9b",
      chatJson: jest.fn().mockResolvedValue({
        merchant: "Taipei Coffee",
        amount: "TWD 1,234",
        currency: "twd",
        date: "2026-07-31",
        category: "咖啡",
        confidenceScore: 0.9,
        items: [
          {
            description: "手沖咖啡",
            quantity: "2 杯",
            unitPrice: "TWD 200",
            amount: "TWD 400"
          },
          {
            description: "總計",
            quantity: null,
            unitPrice: null,
            amount: "not visible"
          }
        ]
      })
    } as unknown as OllamaClient;
    const provider = new LocalOcrProvider(ollama, new LocalInferenceCoordinator());

    const result = await provider.extract({
      buffer: Buffer.from("image"),
      originalName: "receipt.png",
      mimeType: "image/png",
      fallbackCurrency: "JPY",
      fallbackDate: "2026-08-01"
    });

    expect(result).toEqual({
      merchant: "Taipei Coffee",
      amount: "1234",
      currency: "TWD",
      date: "2026-07-31",
      category: ExpenseCategory.food,
      confidenceScore: 0.8500000000000001,
      items: [
        {
          description: "手沖咖啡",
          quantity: "2",
          unitPrice: "200",
          amount: "400"
        }
      ]
    });
  });

  it("continues with Qwen vision when EasyOCR is temporarily unavailable", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response("GPU busy", { status: 500 }));
    const ollama = {
      model: "qwen3.5:9b",
      chatJson: jest.fn().mockResolvedValue({
        merchant: "車站商店",
        amount: "300",
        currency: "TWD",
        date: "2026-07-31",
        category: "shopping",
        confidenceScore: 0.7
      })
    } as unknown as OllamaClient;
    const provider = new LocalOcrProvider(ollama, new LocalInferenceCoordinator());

    const result = await provider.extract({
      buffer: Buffer.from("image"),
      originalName: "receipt.png",
      mimeType: "image/png",
      fallbackCurrency: "TWD",
      fallbackDate: "2026-07-31"
    });

    expect(result.amount).toBe("300");
    expect(result.category).toBe(ExpenseCategory.shopping);
    expect(result.items).toEqual([]);
    expect(ollama.chatJson).toHaveBeenCalledWith(
      expect.objectContaining({ images: [Buffer.from("image").toString("base64")] })
    );
  });
});
