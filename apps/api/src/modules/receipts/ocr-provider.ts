import { ExpenseCategory } from "@prisma/client";

export type ReceiptExtraction = {
  merchant: string;
  amount: string;
  currency: string;
  date: string;
  category: ExpenseCategory;
  confidenceScore: number;
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
