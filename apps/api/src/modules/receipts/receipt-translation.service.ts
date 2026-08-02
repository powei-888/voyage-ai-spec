import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, ReceiptStatus } from "@prisma/client";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { LocalInferenceCoordinator } from "../../infra/local-model/local-inference-coordinator";
import { OllamaClient } from "../../infra/local-model/ollama-client";
import { normalizeStoredReceiptItems } from "./receipt-line-items";
import { UpdateReceiptTranslationsDto } from "./receipts.dto";

type TranslationCandidate = {
  index: number;
  translatedDescription: string;
  originalLanguage: string | null;
};

@Injectable()
export class ReceiptTranslationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    private readonly ollama: OllamaClient,
    private readonly coordinator: LocalInferenceCoordinator
  ) {}

  async translate(userId: string, tripId: string, receiptId: string) {
    await this.access.requireMember(tripId, userId);
    const receipt = await this.requireEditableReceipt(tripId, receiptId);
    const extraction = receipt.extractedJson as Record<string, unknown>;
    const items = normalizeStoredReceiptItems(extraction.items);
    if (items.length === 0) {
      throw new DomainError(
        "RECEIPT_ITEMS_REQUIRED",
        "Receipt has no line items to translate.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    try {
      const response = await this.coordinator.run(() => this.ollama.chatJson({
        system: [
          "你是零售收據商品翻譯器，只輸出 JSON。",
          "將每個商品原文翻譯成自然、簡潔的繁體中文。",
          "品牌、型號、容量、尺寸與商品編號必須保留，不要自行增加原文不存在的資訊。",
          "輸出 items 陣列，每項必須包含 index、translatedDescription、originalLanguage。",
          "若原文已是繁體中文，translatedDescription 保持原文。"
        ].join("\n"),
        prompt: JSON.stringify({
          targetLanguage: "zh-Hant",
          merchant: extraction.merchant ?? null,
          items: items.map((item, index) => ({ index, description: item.description }))
        }),
        maxTokens: 1200
      }));
      const translations = this.readTranslations(response.items, items.length);
      const translatedItems = items.map((item, index) => {
        const translated = translations.get(index);
        return {
          ...item,
          translatedDescription: translated?.translatedDescription ?? null,
          originalLanguage: translated?.originalLanguage ?? item.originalLanguage,
          translationStatus: translated ? "translated" as const : "failed" as const,
          translationSource: translated ? "local_ai" as const : null,
          translationModel: translated ? this.ollama.model : null
        };
      });
      await this.saveItems(receiptId, extraction, translatedItems);
      return { receiptId, items: translatedItems };
    } catch (error) {
      const failedItems = items.map((item) => ({
        ...item,
        translationStatus: "failed" as const
      }));
      await this.saveItems(receiptId, extraction, failedItems);
      if (error instanceof DomainError) throw error;
      throw new DomainError(
        "RECEIPT_TRANSLATION_FAILED",
        "Receipt item translation failed.",
        HttpStatus.UNPROCESSABLE_ENTITY,
        { cause: error instanceof Error ? error.message : "Unknown error" }
      );
    }
  }

  async updateManual(
    userId: string,
    tripId: string,
    receiptId: string,
    dto: UpdateReceiptTranslationsDto
  ) {
    await this.access.requireMember(tripId, userId);
    const receipt = await this.requireEditableReceipt(tripId, receiptId);
    const extraction = receipt.extractedJson as Record<string, unknown>;
    const items = normalizeStoredReceiptItems(extraction.items);
    const updates = new Map(
      dto.items.map((item) => [item.index, item.translatedDescription.trim()])
    );
    if ([...updates.keys()].some((index) => index < 0 || index >= items.length)) {
      throw new DomainError(
        "INVALID_RECEIPT_ITEM",
        "Receipt item index is invalid.",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }
    const updatedItems = items.map((item, index) => {
      const translation = updates.get(index);
      return translation === undefined ? item : {
        ...item,
        translatedDescription: translation,
        translationStatus: "translated" as const,
        translationSource: "manual" as const,
        translationModel: null
      };
    });
    await this.saveItems(receiptId, extraction, updatedItems);
    return { receiptId, items: updatedItems };
  }

  private async requireEditableReceipt(tripId: string, receiptId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, tripId }
    });
    if (!receipt) {
      throw DomainError.notFound("RECEIPT_NOT_FOUND", "Receipt not found.");
    }
    if (receipt.ocrStatus !== ReceiptStatus.extracted || !receipt.extractedJson) {
      throw new DomainError(
        "RECEIPT_NOT_EDITABLE",
        "Only extracted receipt drafts can be translated.",
        HttpStatus.CONFLICT
      );
    }
    return receipt;
  }

  private readTranslations(value: unknown, itemCount: number): Map<number, TranslationCandidate> {
    const result = new Map<number, TranslationCandidate>();
    if (!Array.isArray(value)) return result;
    for (const candidate of value) {
      if (!candidate || typeof candidate !== "object") continue;
      const raw = candidate as Record<string, unknown>;
      const index = Number(raw.index);
      const translatedDescription =
        typeof raw.translatedDescription === "string"
          ? raw.translatedDescription.trim().slice(0, 160)
          : "";
      if (!Number.isInteger(index) || index < 0 || index >= itemCount || !translatedDescription) {
        continue;
      }
      result.set(index, {
        index,
        translatedDescription,
        originalLanguage:
          typeof raw.originalLanguage === "string" && raw.originalLanguage.trim()
            ? raw.originalLanguage.trim().slice(0, 24)
            : null
      });
    }
    return result;
  }

  private async saveItems(
    receiptId: string,
    extraction: Record<string, unknown>,
    items: Array<Record<string, unknown>>
  ) {
    const extractedJson = JSON.parse(
      JSON.stringify({ ...extraction, items })
    ) as Prisma.InputJsonValue;
    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: { extractedJson }
    });
  }
}
