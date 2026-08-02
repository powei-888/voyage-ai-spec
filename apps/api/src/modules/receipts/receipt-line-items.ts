import { ReceiptLineItem } from "./ocr-provider";

const TRANSLATION_STATUSES = new Set(["pending", "translated", "failed"]);
const TRANSLATION_SOURCES = new Set(["local_ai", "manual"]);

function optionalText(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

export function normalizeStoredReceiptItems(value: unknown): ReceiptLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const raw = candidate as Record<string, unknown>;
    const description = optionalText(raw.description, 160);
    const amount = optionalText(raw.amount, 32);
    if (!description || !amount) return [];
    const translatedDescription = optionalText(raw.translatedDescription, 160);
    const rawStatus = optionalText(raw.translationStatus, 20);
    const rawSource = optionalText(raw.translationSource, 20);
    const translationStatus = TRANSLATION_STATUSES.has(rawStatus ?? "")
      ? rawStatus as ReceiptLineItem["translationStatus"]
      : translatedDescription ? "translated" : "pending";
    return [{
      description,
      translatedDescription,
      originalLanguage: optionalText(raw.originalLanguage, 24),
      translationStatus,
      translationSource: TRANSLATION_SOURCES.has(rawSource ?? "")
        ? rawSource as ReceiptLineItem["translationSource"]
        : translatedDescription ? "local_ai" : null,
      translationModel: optionalText(raw.translationModel, 80),
      quantity: optionalText(raw.quantity, 32),
      unitPrice: optionalText(raw.unitPrice, 32),
      amount
    }];
  });
}

export function extractionWithNormalizedItems(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const extraction = value as Record<string, unknown>;
  return {
    ...extraction,
    items: normalizeStoredReceiptItems(extraction.items)
  };
}
