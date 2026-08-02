import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { CreateTripDto, UpdateTripDto } from "./trips.dto";
import { TripsService } from "./trips.service";

@Controller("trips")
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  async create(@CurrentUserId() userId: string, @Body() dto: CreateTripDto) {
    return ok(await this.trips.create(userId, dto));
  }

  @Get()
  async list(@CurrentUserId() userId: string) {
    return ok(await this.trips.list(userId));
  }

  @Get(":tripId/dashboard")
  async dashboard(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.trips.dashboard(userId, tripId));
  }

  @Get(":tripId")
  async get(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.trips.get(userId, tripId));
  }

  @Patch(":tripId")
  async update(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: UpdateTripDto
  ) {
    return ok(await this.trips.update(userId, tripId, dto));
  }

  @Post(":tripId/archive")
  async archive(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.trips.archive(userId, tripId));
  }
}
