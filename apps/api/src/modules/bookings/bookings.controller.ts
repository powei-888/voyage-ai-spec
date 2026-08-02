import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto, UpdateBookingDto } from "./bookings.dto";

@Controller("trips/:tripId/bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  async list(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string
  ) {
    return ok(await this.bookings.list(userId, tripId));
  }

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: CreateBookingDto
  ) {
    return ok(await this.bookings.create(userId, tripId, dto));
  }

  @Get(":bookingId")
  async get(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("bookingId") bookingId: string
  ) {
    return ok(await this.bookings.get(userId, tripId, bookingId));
  }

  @Patch(":bookingId")
  async update(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("bookingId") bookingId: string,
    @Body() dto: UpdateBookingDto
  ) {
    return ok(await this.bookings.update(userId, tripId, bookingId, dto));
  }

  @Delete(":bookingId")
  async remove(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("bookingId") bookingId: string
  ) {
    return ok(await this.bookings.remove(userId, tripId, bookingId));
  }
}
