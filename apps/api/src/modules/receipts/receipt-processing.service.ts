import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ReceiptStatus } from "@prisma/client";
import { PrismaService } from "../../infra/database/prisma.service";
import { OCR_PROVIDER, OcrProvider } from "./ocr-provider";
import { RECEIPT_STORAGE, ReceiptStorage } from "./receipt-storage";

const clampInteger = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

@Injectable()
export class ReceiptProcessingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReceiptProcessingService.name);
  private readonly pollMs = clampInteger(process.env.OCR_WORKER_POLL_MS, 1000, 250, 60_000);
  private readonly leaseMs = clampInteger(process.env.OCR_WORKER_LEASE_MS, 240_000, 30_000, 900_000);
  private readonly retryBaseMs = clampInteger(process.env.OCR_RETRY_BASE_MS, 5000, 1000, 300_000);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OCR_PROVIDER) private readonly ocr: OcrProvider,
    @Inject(RECEIPT_STORAGE) private readonly storage: ReceiptStorage
  ) {}

  onModuleInit(): void {
    if ((process.env.OCR_WORKER_ENABLED ?? "true").toLowerCase() === "false") return;
    this.timer = setInterval(() => void this.tick(), this.pollMs);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processNext(): Promise<boolean> {
    const now = new Date();
    const candidate = await this.prisma.receipt.findFirst({
      where: {
        imageUrl: { startsWith: "local://" },
        OR: [
          { ocrStatus: ReceiptStatus.pending, ocrNextAttemptAt: { lte: now } },
          { ocrStatus: ReceiptStatus.processing, ocrLeaseExpiresAt: { lt: now } }
        ]
      },
      include: { trip: { select: { baseCurrency: true, startDate: true } } },
      orderBy: [{ ocrNextAttemptAt: "asc" }, { createdAt: "asc" }]
    });
    if (!candidate) return false;

    const leaseExpiresAt = new Date(now.getTime() + this.leaseMs);
    const claimed = await this.prisma.receipt.updateMany({
      where: { id: candidate.id, updatedAt: candidate.updatedAt },
      data: {
        ocrStatus: ReceiptStatus.processing,
        ocrAttemptCount: { increment: 1 },
        ocrStartedAt: now,
        ocrLeaseExpiresAt: leaseExpiresAt,
        ocrLastError: null
      }
    });
    if (claimed.count !== 1) return true;

    const attempt = candidate.ocrAttemptCount + 1;
    try {
      const buffer = await this.storage.read(candidate.imageUrl);
      const extraction = await this.ocr.extract({
        buffer,
        originalName: candidate.imageOriginalName || "receipt",
        mimeType: candidate.imageMimeType || "application/octet-stream",
        fallbackCurrency: candidate.trip.baseCurrency,
        fallbackDate: candidate.trip.startDate.toISOString().slice(0, 10)
      });
      await this.prisma.receipt.updateMany({
        where: {
          id: candidate.id,
          ocrStatus: ReceiptStatus.processing,
          ocrLeaseExpiresAt: leaseExpiresAt
        },
        data: {
          ocrStatus: ReceiptStatus.extracted,
          extractedJson: extraction,
          confidenceScore: extraction.confidenceScore.toFixed(2),
          ocrCompletedAt: new Date(),
          ocrLeaseExpiresAt: null,
          ocrLastError: null
        }
      });
      this.logger.log(`Receipt ${candidate.id} extracted on attempt ${attempt}.`);
    } catch (error) {
      const message = (error instanceof Error ? error.message : "Unknown OCR error").slice(0, 1000);
      const exhausted = attempt >= candidate.ocrMaxAttempts;
      const delay = this.retryBaseMs * 2 ** Math.max(0, attempt - 1);
      await this.prisma.receipt.updateMany({
        where: {
          id: candidate.id,
          ocrStatus: ReceiptStatus.processing,
          ocrLeaseExpiresAt: leaseExpiresAt
        },
        data: {
          ocrStatus: exhausted ? ReceiptStatus.failed : ReceiptStatus.pending,
          ocrNextAttemptAt: new Date(Date.now() + delay),
          ocrLeaseExpiresAt: null,
          ocrLastError: message
        }
      });
      this.logger.warn(`Receipt ${candidate.id} attempt ${attempt} failed: ${message}`);
    }
    return true;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (await this.processNext()) {
        // Keep draining queued work serially so local GPU inference never overlaps.
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}
