import { Module } from "@nestjs/common";
import { InviteRequestLimiterService } from "./invite-request-limiter.service";
import { TripInvitesController } from "./trip-invites.controller";
import { TripInvitesService } from "./trip-invites.service";

@Module({
  controllers: [TripInvitesController],
  providers: [TripInvitesService, InviteRequestLimiterService],
  exports: [TripInvitesService]
})
export class TripInvitesModule {}
