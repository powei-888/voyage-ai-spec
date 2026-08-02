import { Injectable } from "@nestjs/common";
import { mkdir, statfs } from "node:fs/promises";
import { resolve } from "node:path";
import { ReceiptStatus } from "@prisma/client";
import { PrismaService } from "../infra/database/prisma.service";
import type { HealthPayload, ReadinessPayload } from "./health.types";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): HealthPayload {
    return {
      status: "ok",
      service: "voyage-api",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      providers: {
        ai: process.env.AI_PROVIDER ?? "local",
        ocr: process.env.OCR_PROVIDER ?? "local",
        model: process.env.LOCAL_LLM_MODEL ?? "qwen3.5:9b"
      }
    };
  }

  async getReadiness(): Promise<ReadinessPayload> {
    const databaseStartedAt = Date.now();
    let databaseStatus: "ok" | "error" = "ok";
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1");
    } catch {
      databaseStatus = "error";
    }

    const minimumFreeBytes = this.minimumFreeBytes();
    let storageStatus: "ok" | "error" = "ok";
    let freeBytes: number | null = null;
    try {
      const uploadDir = resolve(process.env.UPLOAD_DIR || "uploads");
      await mkdir(uploadDir, { recursive: true });
      const stats = await statfs(uploadDir);
      freeBytes = stats.bavail * stats.bsize;
      if (freeBytes < minimumFreeBytes) storageStatus = "error";
    } catch {
      storageStatus = "error";
    }

    let queueStatus: "ok" | "error" = "ok";
    let queueCounts = { queued: 0, processing: 0, failed: 0 };
    try {
      const [queued, processing, failed] = await Promise.all([
        this.prisma.receipt.count({ where: { ocrStatus: ReceiptStatus.pending } }),
        this.prisma.receipt.count({ where: { ocrStatus: ReceiptStatus.processing } }),
        this.prisma.receipt.count({ where: { ocrStatus: ReceiptStatus.failed } })
      ]);
      queueCounts = { queued, processing, failed };
    } catch {
      queueStatus = "error";
    }

    const status =
      databaseStatus === "ok" && storageStatus === "ok" && queueStatus === "ok"
        ? "ok"
        : "degraded";
    return {
      status,
      service: "voyage-api",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: databaseStatus, latencyMs: Date.now() - databaseStartedAt },
        storage: { status: storageStatus, freeBytes, minimumFreeBytes },
        receiptQueue: { status: queueStatus, ...queueCounts }
      }
    };
  }

  private minimumFreeBytes(): number {
    const configured = Number.parseInt(process.env.HEALTH_MIN_FREE_BYTES || "536870912", 10);
    return Number.isFinite(configured) && configured >= 0 ? configured : 536_870_912;
  }
}
