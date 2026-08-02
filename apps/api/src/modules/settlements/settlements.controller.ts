import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { CreateSettlementDto } from "./settlements.dto";
import { SettlementsService } from "./settlements.service";

@Controller("trips/:tripId/settlements")
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Get()
  async list(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.settlements.list(userId, tripId));
  }

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: CreateSettlementDto
  ) {
    return ok(await this.settlements.create(userId, tripId, dto));
  }

  @Delete(":settlementId")
  async remove(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("settlementId") settlementId: string
  ) {
    return ok(await this.settlements.remove(userId, tripId, settlementId));
  }
}
