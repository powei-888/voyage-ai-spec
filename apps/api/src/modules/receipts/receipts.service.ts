import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ReceiptStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { extractionWithNormalizedItems } from "./receipt-line-items";
import { RECEIPT_STORAGE, ReceiptStorage } from "./receipt-storage";
import { UpdateReceiptDraftDto } from "./receipts.dto";

const receiptInclude = {
  uploadedByMember: { select: { id: true, displayName: true } },
  confirmedByMember: { select: { id: true, displayName: true } },
  confirmedExpense: { select: { id: true, title: true, amount: true, currency: true } },
  proxyPurchases: {
    select: {
      id: true,
      status: true,
      externalMember: { select: { id: true, displayName: true } },
      items: {
        select: { sourceReceiptItemIndex: true },
        orderBy: { sortOrder: "asc" as const }
      }
    },
    orderBy: { createdAt: "asc" as const }
  }
} as const;

type UploadFile = {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
};

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TripAccessService,
    @Inject(RECEIPT_STORAGE) private readonly storage: ReceiptStorage
  ) {}

  async list(userId: string, tripId: string) {
    await this.access.requireMember(tripId, userId);
    const receipts = await this.prisma.receipt.findMany({
      where: { tripId },
      include: receiptInclude,
      orderBy: { createdAt: "desc" }
    });
    return receipts.map((receipt) => this.present(receipt));
  }

  async get(userId: string, tripId: string, receiptId: string) {
    await this.access.requireMember(tripId, userId);
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, tripId },
      include: receiptInclude
    });
    if (!receipt) {
      throw DomainError.notFound("RECEIPT_NOT_FOUND", "Receipt not found.");
    }
    return this.present(receipt);
  }

  async upload(userId: string, tripId: string, file: UploadFile) {
    const actor = await this.access.requireMember(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { baseCurrency: true, startDate: true }
    });
    if (!trip) {
      throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    }
    this.validateFile(file);

    const receiptId = randomUUID();
    await this.prisma.receipt.create({
      data: {
        id: receiptId,
        tripId,
        uploadedByMemberId: actor.id,
        imageUrl: "pending://upload",
        imageOriginalName: file.originalName,
        imageMimeType: file.mimeType,
        ocrStatus: ReceiptStatus.pending,
        ocrMaxAttempts: this.maxAttempts()
      }
    });

    let storageKey: string | null = null;
    try {
      storageKey = await this.storage.save({
        tripId,
        receiptId,
        originalName: file.originalName,
        buffer: file.buffer
      });
      const receipt = await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          imageUrl: storageKey,
          ocrStatus: ReceiptStatus.pending,
          ocrNextAttemptAt: new Date()
        },
        include: receiptInclude
      });
      return this.present(receipt);
    } catch (error) {
      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          imageUrl: storageKey || "failed://upload",
          ocrStatus: ReceiptStatus.failed,
          ocrLastError: error instanceof Error ? error.message.slice(0, 1000) : "Unknown upload error"
        }
      });
      throw new DomainError(
        "RECEIPT_UPLOAD_FAILED",
        "Receipt upload failed before OCR could be queued.",
        HttpStatus.UNPROCESSABLE_ENTITY,
        { cause: error instanceof Error ? error.message : "Unknown error" }
      );
    }
  }

  async retry(userId: string, tripId: string, receiptId: string) {
    await this.access.requireMember(tripId, userId);
    const receipt = await this.prisma.receipt.findFirst({ where: { id: receiptId, tripId } });
    if (!receipt) throw DomainError.notFound("RECEIPT_NOT_FOUND", "Receipt not found.");
    if (receipt.ocrStatus !== ReceiptStatus.failed || !receipt.imageUrl.startsWith("local://")) {
      throw new DomainError(
        "RECEIPT_RETRY_NOT_ALLOWED",
        "Only failed stored receipts can be queued again.",
        HttpStatus.CONFLICT
      );
    }
    const updated = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        ocrStatus: ReceiptStatus.pending,
        ocrAttemptCount: 0,
        ocrNextAttemptAt: new Date(),
        ocrStartedAt: null,
        ocrCompletedAt: null,
        ocrLeaseExpiresAt: null,
        ocrLastError: null
      },
      include: receiptInclude
    });
    return this.present(updated);
  }

  async updateDraft(
    userId: string,
    tripId: string,
    receiptId: string,
    dto: UpdateReceiptDraftDto
  ) {
    await this.access.requireMember(tripId, userId);
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, tripId }
    });
    if (!receipt) {
      throw DomainError.notFound("RECEIPT_NOT_FOUND", "Receipt not found.");
    }
    if (receipt.ocrStatus !== ReceiptStatus.extracted || !receipt.extractedJson) {
      throw new DomainError(
        "RECEIPT_NOT_EDITABLE",
        "Only extracted receipt drafts can be edited.",
        HttpStatus.CONFLICT
      );
    }
    const extracted = receipt.extractedJson as Record<string, unknown>;
    const updated = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: { extractedJson: { ...extracted, ...dto } },
      include: receiptInclude
    });
    return this.present(updated);
  }

  async remove(userId: string, tripId: string, receiptId: string) {
    await this.access.requireMember(tripId, userId);
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, tripId },
      include: { confirmedExpense: true, proxyPurchases: { select: { id: true, status: true } } }
    });
    if (!receipt) {
      throw DomainError.notFound("RECEIPT_NOT_FOUND", "Receipt not found.");
    }
    if (receipt.confirmedExpense || receipt.ocrStatus === ReceiptStatus.confirmed) {
      throw new DomainError(
        "RECEIPT_ALREADY_CONFIRMED",
        "Confirmed receipts cannot be deleted.",
        HttpStatus.CONFLICT
      );
    }
    if (receipt.proxyPurchases.some((purchase) => purchase.status !== "cancelled")) {
      throw new DomainError(
        "RECEIPT_HAS_PROXY_PURCHASES",
        "Cancel receipt-linked proxy purchases before deleting this receipt.",
        HttpStatus.CONFLICT
      );
    }
    await this.prisma.receipt.delete({ where: { id: receiptId } });
    if (receipt.imageUrl.startsWith("local://")) {
      await this.storage.remove(receipt.imageUrl).catch(() => undefined);
    }
    return receipt;
  }

  async readImage(userId: string, tripId: string, receiptId: string) {
    await this.access.requireMember(tripId, userId);
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, tripId },
      select: {
        imageUrl: true,
        imageMimeType: true,
        imageOriginalName: true
      }
    });
    if (!receipt || !receipt.imageUrl.startsWith("local://")) {
      throw DomainError.notFound("RECEIPT_IMAGE_NOT_FOUND", "Receipt image not found.");
    }
    return {
      buffer: await this.storage.read(receipt.imageUrl),
      mimeType: receipt.imageMimeType || "application/octet-stream",
      originalName: receipt.imageOriginalName || "receipt"
    };
  }


  private validateFile(file: UploadFile): void {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    if (!allowed.has(file.mimeType)) {
      throw new DomainError(
        "UNSUPPORTED_RECEIPT_FILE",
        "Receipt must be a JPEG, PNG, WebP, or PDF file."
      );
    }
    if (file.buffer.length === 0 || file.buffer.length > 8 * 1024 * 1024) {
      throw new DomainError("INVALID_RECEIPT_SIZE", "Receipt file must be between 1 byte and 8 MB.");
    }
  }

  private maxAttempts(): number {
    const value = Number.parseInt(process.env.OCR_MAX_ATTEMPTS || "3", 10);
    return Number.isFinite(value) ? Math.min(10, Math.max(1, value)) : 3;
  }

  private present<T extends { id: string; tripId: string }>(receipt: T): T & { imageUrl: string } {
    const stored = receipt as T & { extractedJson?: unknown };
    const extractedJson = extractionWithNormalizedItems(stored.extractedJson);
    return {
      ...receipt,
      ...(extractedJson ? { extractedJson } : {}),
      imageUrl: `/api/trips/${receipt.tripId}/receipts/${receipt.id}/image`
    };
  }
}
