import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DEFAULT_DEMO_USER_ID } from "../../common/constants";
import { DomainError } from "../../common/domain-error";
import { AuthService } from "./auth.service";
import { PUBLIC_ROUTE } from "./public.decorator";

type AuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string; email: string; displayName: string; avatarUrl: string | null };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = this.bearerToken(request.headers.authorization);
    if (token) {
      const user = await this.auth.authenticate(token);
      if (user) {
        request.user = user;
        return true;
      }
    }

    if (process.env.ALLOW_INSECURE_DEMO_AUTH === "true") {
      const value = request.headers["x-user-id"];
      request.user = {
        id: (Array.isArray(value) ? value[0] : value) ||
          process.env.DEMO_USER_ID ||
          DEFAULT_DEMO_USER_ID,
        email: "demo@voyage.local",
        displayName: "Demo Traveler",
        avatarUrl: null
      };
      return true;
    }

    throw new DomainError(
      "AUTH_REQUIRED",
      "A valid local session is required.",
      HttpStatus.UNAUTHORIZED
    );
  }

  private bearerToken(value: string | string[] | undefined): string | null {
    const header = Array.isArray(value) ? value[0] : value;
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice(7).trim() || null;
  }
}
