import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ok } from "../../common/api-response";
import { clientIp } from "../../common/client-ip";
import { CurrentUserId } from "../../common/current-user.decorator";
import { Public } from "../auth/public.decorator";
import { CreateTripInviteDto } from "./trip-invites.dto";
import { TripInvitesService } from "./trip-invites.service";

@Controller()
export class TripInvitesController {
  constructor(private readonly invites: TripInvitesService) {}

  @Get("trips/:tripId/invites")
  async list(@CurrentUserId() userId: string, @Param("tripId") tripId: string) {
    return ok(await this.invites.list(userId, tripId));
  }

  @Post("trips/:tripId/invites")
  async create(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Body() dto: CreateTripInviteDto
  ) {
    return ok(await this.invites.create(userId, tripId, dto));
  }

  @Post("trips/:tripId/invites/:inviteId/revoke")
  async revoke(
    @CurrentUserId() userId: string,
    @Param("tripId") tripId: string,
    @Param("inviteId") inviteId: string
  ) {
    return ok(await this.invites.revoke(userId, tripId, inviteId));
  }

  @Public()
  @Get("invites/:token")
  async preview(@Param("token") token: string, @Req() request: FastifyRequest) {
    return ok(await this.invites.preview(token, clientIp(request)));
  }

  @Post("invites/:token/accept")
  async accept(
    @CurrentUserId() userId: string,
    @Param("token") token: string,
    @Req() request: FastifyRequest
  ) {
    return ok(await this.invites.accept(userId, token, clientIp(request)));
  }
}
