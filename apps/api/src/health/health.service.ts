import { Injectable } from "@nestjs/common";
import type { HealthPayload } from "./health.types";

@Injectable()
export class HealthService {
  getHealth(): HealthPayload {
    return {
      status: "ok",
      service: "voyage-api",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0"
    };
  }
}
