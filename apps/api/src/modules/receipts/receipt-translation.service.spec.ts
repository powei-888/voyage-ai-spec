import { ReceiptStatus } from "@prisma/client";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { LocalInferenceCoordinator } from "../../infra/local-model/local-inference-coordinator";
import { OllamaClient } from "../../infra/local-model/ollama-client";
import { ReceiptTranslationService } from "./receipt-translation.service";

describe("ReceiptTranslationService", () => {
  const extractedJson = {
    merchant: "Tokyo Store",
    items: [
      { description: "抹茶クッキー", quantity: "1", unitPrice: "420", amount: "420" },
      { description: "ロートCキューブ", quantity: "2", unitPrice: "350", amount: "700" }
    ]
  };

  function setup(response?: Record<string, unknown>) {
    const prisma = {
      receipt: {
        findFirst: jest.fn().mockResolvedValue({
          id: "receipt-1",
          tripId: "trip-1",
          ocrStatus: ReceiptStatus.extracted,
          extractedJson
        }),
        update: jest.fn().mockResolvedValue({})
      }
    };
    const access = { requireMember: jest.fn().mockResolvedValue({ id: "member-1" }) };
    const ollama = {
      model: "qwen3.5:9b",
      chatJson: jest.fn().mockResolvedValue(response ?? {
        items: [
          {
            index: 0,
            translatedDescription: "抹茶餅乾",
            originalLanguage: "ja"
          },
          {
            index: 1,
            translatedDescription: "樂敦 C Cube 眼藥水",
            originalLanguage: "ja"
          }
        ]
      })
    };
    const service = new ReceiptTranslationService(
      prisma as unknown as PrismaService,
      access as unknown as TripAccessService,
      ollama as unknown as OllamaClient,
      new LocalInferenceCoordinator()
    );
    return { service, prisma, ollama };
  }

  it("preserves OCR originals while storing local Traditional Chinese translations", async () => {
    const { service, prisma } = setup();

    const result = await service.translate("user-1", "trip-1", "receipt-1");

    expect(result.items).toEqual([
      expect.objectContaining({
        description: "抹茶クッキー",
        translatedDescription: "抹茶餅乾",
        originalLanguage: "ja",
        translationStatus: "translated",
        translationSource: "local_ai",
        translationModel: "qwen3.5:9b"
      }),
      expect.objectContaining({
        description: "ロートCキューブ",
        translatedDescription: "樂敦 C Cube 眼藥水"
      })
    ]);
    expect(prisma.receipt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          extractedJson: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ description: "抹茶クッキー" })
            ])
          })
        }
      })
    );
  });

  it("marks a user-edited translation as manual without changing the original", async () => {
    const { service } = setup();

    const result = await service.updateManual("user-1", "trip-1", "receipt-1", {
      items: [{ index: 1, translatedDescription: "樂敦 C Cube Premium 眼藥水" }]
    });

    expect(result.items[1]).toEqual(expect.objectContaining({
      description: "ロートCキューブ",
      translatedDescription: "樂敦 C Cube Premium 眼藥水",
      translationStatus: "translated",
      translationSource: "manual",
      translationModel: null
    }));
  });
});
