import { Injectable } from "@nestjs/common";
import { ExpenseCategory } from "@prisma/client";
import { OcrInput, OcrProvider, ReceiptExtraction } from "./ocr-provider";

@Injectable()
export class MockOcrProvider implements OcrProvider {
  async extract(input: OcrInput): Promise<ReceiptExtraction> {
    const amountMatch = input.originalName.match(/(?:amount[-_])?(\d+(?:\.\d{1,3})?)/i);
    const merchant = input.originalName
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b(?:receipt|amount|\d+(?:\.\d+)?)\b/gi, "")
      .trim();

    return {
      merchant: merchant || "Voyage Cafe",
      amount: amountMatch?.[1] || "1500",
      currency: input.fallbackCurrency,
      date: input.fallbackDate,
      category: ExpenseCategory.food,
      confidenceScore: 0.94
    };
  }
}
