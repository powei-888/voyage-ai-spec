import { Injectable } from "@nestjs/common";
import type { HealthPayload } from "./health.types";

@Injectable()
export class HealthService {
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
}
