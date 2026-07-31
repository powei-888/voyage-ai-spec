import { Controller, Get } from "@nestjs/common";
import { Public } from "../modules/auth/public.decorator";
import { HealthService } from "./health.service";
import type { ApiEnvelope, HealthPayload } from "./health.types";

@Public()
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
