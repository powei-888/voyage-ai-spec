import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { CreateProposalDto } from "./ai-proposals.dto";
import { AiProposalsService } from "./ai-proposals.service";

@Controller("trips/:tripId/ai-proposals")
export class AiProposalsController {
  constructor(private readonly proposals: AiProposalsService) {}

  @Get()
  async list(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.proposals.list(userId, tripId));
  }

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: CreateProposalDto
  ) {
    return ok(await this.proposals.create(userId, tripId, dto));
  }

  @Get(":proposalId")
  async get(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("proposalId") proposalId: string
  ) {
    return ok(await this.proposals.get(userId, tripId, proposalId));
  }

  @Post(":proposalId/accept")
  async accept(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("proposalId") proposalId: string
  ) {
    return ok(await this.proposals.accept(userId, tripId, proposalId));
  }

  @Post(":proposalId/reject")
  async reject(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("proposalId") proposalId: string
  ) {
    return ok(await this.proposals.reject(userId, tripId, proposalId));
  }
}
