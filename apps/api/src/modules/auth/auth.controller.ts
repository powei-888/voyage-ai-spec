import { Body, Controller, Get, Headers, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ok } from "../../common/api-response";
import { clientIp } from "../../common/client-ip";
import { CurrentUserId } from "../../common/current-user.decorator";
import { PrismaService } from "../../infra/database/prisma.service";
import { ChangePasswordDto, LoginDto, RegisterDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService
  ) {}

  @Public()
  @Post("register")
  async register(@Body() dto: RegisterDto, @Req() request: FastifyRequest) {
    return ok(await this.auth.register(dto, clientIp(request)));
  }

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto, @Req() request: FastifyRequest) {
    return ok(await this.auth.login(dto, request.ip));
  }

  @Get("me")
  async me(@CurrentUserId() userId: string) {
    return ok(
      await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, email: true, displayName: true, avatarUrl: true }
      })
    );
  }

  @Post("logout")
  async logout(@Headers("authorization") authorization?: string) {
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (token) await this.auth.logout(token);
    return ok({ loggedOut: true });
  }

  @Post("logout-all")
  async logoutAll(@CurrentUserId() userId: string) {
    return ok(await this.auth.logoutAll(userId));
  }

  @Post("change-password")
  async changePassword(
    @CurrentUserId() userId: string,
    @Body() dto: ChangePasswordDto
  ) {
    return ok(await this.auth.changePassword(userId, dto));
  }
}
