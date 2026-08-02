import { ReceiptStatus } from "@prisma/client";
import { PrismaService } from "../../infra/database/prisma.service";
import { OcrProvider } from "./ocr-provider";
import { ReceiptProcessingService } from "./receipt-processing.service";
import { ReceiptStorage } from "./receipt-storage";

const candidate = (attemptCount = 0, maxAttempts = 3) => ({
  id: "receipt-1",
  tripId: "trip-1",
  imageUrl: "local://receipts/trip-1/receipt-1.png",
  imageOriginalName: "receipt.png",
  imageMimeType: "image/png",
  ocrStatus: ReceiptStatus.pending,
  ocrAttemptCount: attemptCount,
  ocrMaxAttempts: maxAttempts,
  ocrNextAttemptAt: new Date("2026-08-02T00:00:00.000Z"),
  ocrLeaseExpiresAt: null,
  createdAt: new Date("2026-08-02T00:00:00.000Z"),
  updatedAt: new Date("2026-08-02T00:00:00.000Z"),
  trip: { baseCurrency: "JPY", startDate: new Date("2026-08-01T00:00:00.000Z") }
});

const extraction = {
  merchant: "Tokyo Store",
  amount: "1000",
  currency: "JPY",
  date: "2026-08-01",
  category: "shopping",
  confidenceScore: 0.94,
  items: []
};

function setup(receipt = candidate()) {
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    receipt: {
      findFirst: jest.fn().mockResolvedValue(receipt),
      updateMany
    }
  };
  const ocr = { extract: jest.fn().mockResolvedValue(extraction) };
  const storage = { read: jest.fn().mockResolvedValue(Buffer.from("receipt")) };
  const service = new ReceiptProcessingService(
    prisma as unknown as PrismaService,
    ocr as unknown as OcrProvider,
    storage as unknown as ReceiptStorage
  );
  return { service, prisma, ocr, storage, updateMany };
}

describe("ReceiptProcessingService", () => {
  it("claims a queued receipt and stores the extracted draft", async () => {
    const { service, ocr, storage, updateMany } = setup();

    await expect(service.processNext()).resolves.toBe(true);

    expect(storage.read).toHaveBeenCalledWith("local://receipts/trip-1/receipt-1.png");
    expect(ocr.extract).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackCurrency: "JPY", fallbackDate: "2026-08-01" })
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          ocrStatus: ReceiptStatus.extracted,
          extractedJson: extraction,
          confidenceScore: "0.94",
          ocrLeaseExpiresAt: null
        })
      })
    );
  });

  it("returns a failed attempt to the queue with backoff", async () => {
    const { service, ocr, updateMany } = setup(candidate(0, 3));
    ocr.extract.mockRejectedValueOnce(new Error("Local OCR unavailable"));

    await service.processNext();

    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          ocrStatus: ReceiptStatus.pending,
          ocrLastError: "Local OCR unavailable",
          ocrLeaseExpiresAt: null
        })
      })
    );
  });

  it("marks a receipt failed after the configured attempts are exhausted", async () => {
    const { service, ocr, updateMany } = setup(candidate(2, 3));
    ocr.extract.mockRejectedValueOnce(new Error("Vision model timed out"));

    await service.processNext();

    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          ocrStatus: ReceiptStatus.failed,
          ocrLastError: "Vision model timed out"
        })
      })
    );
  });

  it("does nothing when no receipt is ready", async () => {
    const { service, prisma, updateMany } = setup();
    prisma.receipt.findFirst.mockResolvedValueOnce(null);

    await expect(service.processNext()).resolves.toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
