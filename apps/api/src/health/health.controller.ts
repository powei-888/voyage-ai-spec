import { Controller, Get, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { Public } from "../modules/auth/public.decorator";
import { HealthService } from "./health.service";
import type { ApiEnvelope, HealthPayload, ReadinessPayload } from "./health.types";

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

  @Get("live")
  getLiveness(): ApiEnvelope<HealthPayload> {
    return { data: this.healthService.getHealth(), meta: {} };
  }

  @Get("ready")
  async getReadiness(
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<ApiEnvelope<ReadinessPayload>> {
    const data = await this.healthService.getReadiness();
    reply.status(data.status === "ok" ? 200 : 503);
    return { data, meta: {} };
  }
}
