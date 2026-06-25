import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";
import type { ApiEnvelope, HealthPayload } from "./health.types";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): ApiEnvelope<HealthPayload> {
    return {
      data: this.healthService.getHealth(),
      meta: {}
    };
  }
}
