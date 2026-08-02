import { ExpenseCategory } from "@prisma/client";

export type ReceiptLineItem = {
  description: string;
  translatedDescription: string | null;
  originalLanguage: string | null;
  translationStatus: "pending" | "translated" | "failed";
  translationSource: "local_ai" | "manual" | null;
  translationModel: string | null;
  quantity: string | null;
  unitPrice: string | null;
  amount: string;
};

export type ReceiptExtraction = {
  merchant: string;
  amount: string;
  currency: string;
  date: string;
  category: ExpenseCategory;
  confidenceScore: number;
  items: ReceiptLineItem[];
};

export type OcrInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  fallbackCurrency: string;
  fallbackDate: string;
};

export interface OcrProvider {
  extract(input: OcrInput): Promise<ReceiptExtraction>;
}

export const OCR_PROVIDER = Symbol("OCR_PROVIDER");
