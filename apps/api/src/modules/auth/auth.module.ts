import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthAttemptLimiterService } from "./auth-attempt-limiter.service";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { TripInvitesModule } from "../trip-invites/trip-invites.module";

@Module({
  imports: [TripInvitesModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthAttemptLimiterService,
    { provide: APP_GUARD, useClass: AuthGuard }
  ],
  exports: [AuthService]
})
export class AuthModule {}
