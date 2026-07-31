import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUserId } from "../../common/current-user.decorator";
import { PrismaService } from "../../infra/database/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";
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
  async register(@Body() dto: RegisterDto) {
    return ok(await this.auth.register(dto));
  }

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto) {
    return ok(await this.auth.login(dto));
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
}
