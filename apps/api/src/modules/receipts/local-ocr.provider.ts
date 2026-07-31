import { Injectable } from "@nestjs/common";
import { ExpenseCategory } from "@prisma/client";
import { LocalInferenceCoordinator } from "../../infra/local-model/local-inference-coordinator";
import { OllamaClient } from "../../infra/local-model/ollama-client";
import { OcrInput, OcrProvider, ReceiptExtraction } from "./ocr-provider";

type RawOcrResult = {
  text?: string;
  blocks?: Array<{ confidence?: number | null }>;
};

const CATEGORIES = new Set(Object.values(ExpenseCategory));

function normalizeCategory(value: unknown): ExpenseCategory {
  const text = String(value ?? "").toLowerCase();
  if (CATEGORIES.has(text as ExpenseCategory)) return text as ExpenseCategory;
  if (/food|restaurant|cafe|coffee|meal|餐|咖啡|飲/.test(text)) return ExpenseCategory.food;
  if (/hotel|lodging|住宿|飯店|旅館/.test(text)) return ExpenseCategory.hotel;
  if (/transport|train|taxi|bus|metro|交通|車|捷運/.test(text)) {
    return ExpenseCategory.transport;
  }
  if (/shopping|retail|購物|商品/.test(text)) return ExpenseCategory.shopping;
  if (/ticket|admission|門票|票券/.test(text)) return ExpenseCategory.ticket;
  if (/activity|tour|experience|活動|體驗/.test(text)) return ExpenseCategory.activity;
  return ExpenseCategory.other;
}

function normalizeAmount(value: unknown): string {
  const match = String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d{1,3})?/);
  if (!match || Number(match[0]) <= 0) return "0";
  return match[0];
}

function normalizeCurrency(value: unknown, fallback: string): string {
  const currency = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : fallback.toUpperCase();
}

function normalizeDate(value: unknown, fallback: string): string {
  const date = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fallback;
  return Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? fallback : date;
}

function normalizeConfidence(value: unknown, amount: string, ocrConfidence: number | null): number {
  const modelConfidence = Number(value);
  const combined = Number.isFinite(modelConfidence)
    ? ocrConfidence === null ? modelConfidence : (modelConfidence + ocrConfidence) / 2
    : ocrConfidence ?? 0.55;
  const capped = amount === "0" ? Math.min(combined, 0.45) : combined;
  return Math.min(0.99, Math.max(0.1, capped));
}

function collectText(value: unknown, output: string[], depth = 0): void {
  if (depth > 5 || output.join("\n").length > 12_000) return;
  if (typeof value === "string") {
    if (value.trim()) output.push(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, output, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (/image|base64|bbox|diagnostic/i.test(key)) continue;
    collectText(item, output, depth + 1);
  }
}

@Injectable()
export class LocalOcrProvider implements OcrProvider {
  private readonly ocrUrl = (process.env.LOCAL_OCR_BASE_URL ?? "http://127.0.0.1:11438")
    .replace(/\/$/, "");
  private readonly parserUrl = (
    process.env.LOCAL_PDF_PARSER_BASE_URL ?? "http://127.0.0.1:11436"
  ).replace(/\/$/, "");
  private readonly timeoutMs = Number.parseInt(process.env.LOCAL_OCR_TIMEOUT_MS ?? "180000", 10);

  constructor(
    private readonly ollama: OllamaClient,
    private readonly coordinator: LocalInferenceCoordinator
  ) {}

  async extract(input: OcrInput): Promise<ReceiptExtraction> {
    return this.coordinator.run(async () => {
      let rawText = "";
      let ocrConfidence: number | null = null;
      let extractionError: Error | null = null;

      try {
        const raw = await this.extractRawText(input);
        rawText = raw.text;
        ocrConfidence = raw.confidence;
      } catch (error) {
        extractionError = error instanceof Error ? error : new Error("Local OCR failed.");
        if (input.mimeType === "application/pdf") throw extractionError;
      }

      const response = await this.ollama.chatJson({
        system: [
          "你是收據欄位擷取器，使用繁體中文理解收據。",
          "優先選擇實際應付或總計金額，不要選小計、稅額、找零或單項價格。",
          "只輸出 JSON：merchant 字串、amount 正數字串、currency 三碼、date YYYY-MM-DD、",
          "category 必須是 food/hotel/transport/shopping/ticket/activity/other、confidenceScore 0 到 1。",
          "看不清楚的欄位使用提示中的 fallback，不得猜測不存在的商家或金額。"
        ].join("\n"),
        prompt: JSON.stringify({
          filename: input.originalName,
          mimeType: input.mimeType,
          fallbackCurrency: input.fallbackCurrency,
          fallbackDate: input.fallbackDate,
          ocrText: rawText.slice(0, 12_000),
          ocrWarning: extractionError?.message ?? null
        }),
        images: input.mimeType.startsWith("image/")
          ? [input.buffer.toString("base64")]
          : undefined,
        maxTokens: 450
      });

      const amount = normalizeAmount(response.amount);
      return {
        merchant:
          typeof response.merchant === "string" && response.merchant.trim()
            ? response.merchant.trim().slice(0, 160)
            : "待確認收據",
        amount,
        currency: normalizeCurrency(response.currency, input.fallbackCurrency),
        date: normalizeDate(response.date, input.fallbackDate),
        category: normalizeCategory(response.category),
        confidenceScore: normalizeConfidence(
          response.confidenceScore,
          amount,
          ocrConfidence
        )
      };
    });
  }

  private async extractRawText(
    input: OcrInput
  ): Promise<{ text: string; confidence: number | null }> {
    if (input.mimeType === "application/pdf") {
      const payload = await this.postJson(`${this.parserUrl}/api/parse-pdf-base64`, {
        filename: input.originalName,
        base64_content: input.buffer.toString("base64")
      });
      const text: string[] = [];
      collectText(payload, text);
      if (!text.length) throw new Error("Local PDF parser returned no text.");
      return { text: text.join("\n").slice(0, 12_000), confidence: null };
    }

    const payload = (await this.postJson(`${this.ocrUrl}/api/ocr/image`, {
      image_base64: input.buffer.toString("base64"),
      mime_type: input.mimeType,
      languages: ["ch_tra", "en"]
    })) as RawOcrResult;
    if (!payload.text?.trim()) throw new Error("Local OCR returned no text.");
    const scores = (payload.blocks ?? [])
      .map((block) => block.confidence)
      .filter((score): score is number => typeof score === "number");
    return {
      text: payload.text.trim(),
      confidence: scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : null
    };
  }

  private async postJson(url: string, body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(
        Number.isFinite(this.timeoutMs) && this.timeoutMs > 0 ? this.timeoutMs : 180_000
      )
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Local extraction request failed (${response.status}): ${detail}`);
    }
    return response.json();
  }
}
