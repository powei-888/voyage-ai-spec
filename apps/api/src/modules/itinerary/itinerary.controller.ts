import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { CreateEventDto, MoveEventDto, ReorderEventsDto, UpdateEventDto } from "./itinerary.dto";
import { ItineraryService } from "./itinerary.service";

@Controller("trips/:tripId")
export class ItineraryController {
  constructor(private readonly itinerary: ItineraryService) {}

  @Get("itinerary-days")
  async listDays(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.itinerary.listDays(userId, tripId));
  }

  @Post("itinerary-days/:dayId/events")
  async createEvent(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("dayId") dayId: string,
    @Body() dto: CreateEventDto
  ) {
    return ok(await this.itinerary.createEvent(userId, tripId, dayId, dto));
  }

  @Post("itinerary-days/:dayId/events/reorder")
  async reorder(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("dayId") dayId: string,
    @Body() dto: ReorderEventsDto
  ) {
    return ok(await this.itinerary.reorder(userId, tripId, dayId, dto));
  }

  @Get("events/:eventId")
  async getEvent(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("eventId") eventId: string
  ) {
    return ok(await this.itinerary.getEvent(userId, tripId, eventId));
  }

  @Patch("events/:eventId")
  async updateEvent(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("eventId") eventId: string,
    @Body() dto: UpdateEventDto
  ) {
    return ok(await this.itinerary.updateEvent(userId, tripId, eventId, dto));
  }

  @Post("events/:eventId/move")
  async moveEvent(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("eventId") eventId: string,
    @Body() dto: MoveEventDto
  ) {
    return ok(await this.itinerary.moveEvent(userId, tripId, eventId, dto));
  }

  @Delete("events/:eventId")
  async deleteEvent(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("eventId") eventId: string
  ) {
    return ok(await this.itinerary.deleteEvent(userId, tripId, eventId));
  }
}
