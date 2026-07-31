import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma, ReceiptStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { parseDateOnly } from "../../common/date-utils";
import { DomainError } from "../../common/domain-error";
import { TripAccessService } from "../../common/trip-access.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { SplitCalculatorService } from "../expenses/split-calculator.service";
import { OCR_PROVIDER, OcrProvider } from "./ocr-provider";
import { RECEIPT_STORAGE, ReceiptStorage } from "./receipt-storage";
import { ConfirmReceiptDto } from "./receipts.dto";

const receiptInclude = {
  uploadedByMember: { select: { id: true, displayName: true } },
  confirmedByMember: { select: { id: true, displayName: true } },
  confirmedExpense: { select: { id: true, title: true, amount: true, currency: true } }
} as const;

const confirmedExpenseInclude = {
  participants: true,
  payerMember: { select: { id: true, displayName: true } }
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
    private readonly split: SplitCalculatorService,
    @Inject(OCR_PROVIDER) private readonly ocr: OcrProvider,
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
        ocrStatus: ReceiptStatus.pending
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
      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: { imageUrl: storageKey, ocrStatus: ReceiptStatus.processing }
      });
      const extraction = await this.ocr.extract({
        buffer: file.buffer,
        originalName: file.originalName,
        mimeType: file.mimeType,
        fallbackCurrency: trip.baseCurrency,
        fallbackDate: trip.startDate.toISOString().slice(0, 10)
      });
      const receipt = await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          ocrStatus: ReceiptStatus.extracted,
          extractedJson: extraction,
          confidenceScore: extraction.confidenceScore.toFixed(2)
        },
        include: receiptInclude
      });
      return this.present(receipt);
    } catch (error) {
      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          imageUrl: storageKey || "failed://upload",
          ocrStatus: ReceiptStatus.failed
        }
      });
      throw new DomainError(
        "RECEIPT_OCR_FAILED",
        "Receipt extraction failed.",
        HttpStatus.UNPROCESSABLE_ENTITY,
        { cause: error instanceof Error ? error.message : "Unknown error" }
      );
    }
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

  async confirm(
    userId: string,
    tripId: string,
    receiptId: string,
    dto: ConfirmReceiptDto
  ) {
    const actor = await this.access.requireMember(tripId, userId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { baseCurrency: true }
    });
    if (!trip) {
      throw DomainError.notFound("TRIP_NOT_FOUND", "Trip not found.");
    }
    if (dto.currency !== trip.baseCurrency) {
      throw new DomainError(
        "CURRENCY_MISMATCH",
        `v0.1 expenses must use the trip base currency (${trip.baseCurrency}).`
      );
    }
    await this.access.assertMembersBelongToTrip(tripId, [
      dto.payerMemberId,
      ...dto.participantMemberIds
    ]);
    const shares = this.split.equalSplit(
      dto.amount,
      dto.currency,
      dto.payerMemberId,
      dto.participantMemberIds
    );

    try {
      const expenseId = await this.prisma.$transaction(
        async (tx) => {
          const receipt = await tx.receipt.findFirst({
            where: { id: receiptId, tripId },
            include: { confirmedExpense: true }
          });
          if (!receipt) {
            throw DomainError.notFound("RECEIPT_NOT_FOUND", "Receipt not found.");
          }
          if (receipt.ocrStatus === ReceiptStatus.confirmed && receipt.confirmedExpense) {
            return receipt.confirmedExpense.id;
          }
          if (receipt.ocrStatus !== ReceiptStatus.extracted) {
            throw new DomainError(
              "RECEIPT_NOT_READY",
              "Only extracted receipts can be confirmed.",
              HttpStatus.CONFLICT
            );
          }
          if (dto.linkedEventId) {
            const event = await tx.itineraryEvent.findFirst({
              where: { id: dto.linkedEventId, tripId },
              select: { id: true }
            });
            if (!event) {
              throw new DomainError("INVALID_LINKED_EVENT", "Linked event is not in this trip.");
            }
          }

          const expense = await tx.expense.create({
            data: {
              tripId,
              title: dto.title.trim(),
              merchant: dto.merchant?.trim() || null,
              amount: dto.amount,
              currency: dto.currency,
              category: dto.category,
              expenseDate: dto.expenseDate ? parseDateOnly(dto.expenseDate) : null,
              payerMemberId: dto.payerMemberId,
              linkedReceiptId: receiptId,
              linkedEventId: dto.linkedEventId || null,
              createdByMemberId: actor.id,
              participants: { create: shares }
            },
            select: { id: true }
          });
          await tx.receipt.update({
            where: { id: receiptId },
            data: {
              ocrStatus: ReceiptStatus.confirmed,
              confirmedAt: new Date(),
              confirmedByMemberId: actor.id
            }
          });
          return expense.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return this.prisma.expense.findUniqueOrThrow({
        where: { id: expenseId },
        include: confirmedExpenseInclude
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code)
      ) {
        const existing = await this.prisma.expense.findUnique({
          where: { linkedReceiptId: receiptId },
          include: confirmedExpenseInclude
        });
        if (existing) return existing;
      }
      throw error;
    }
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

  private present<T extends { id: string; tripId: string }>(receipt: T): T & { imageUrl: string } {
    return {
      ...receipt,
      imageUrl: `/api/trips/${receipt.tripId}/receipts/${receipt.id}/image`
    };
  }
}
