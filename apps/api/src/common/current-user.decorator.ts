import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { DEFAULT_DEMO_USER_ID } from "./constants";

type RequestHeaders = Record<string, string | string[] | undefined>;
type AuthenticatedRequest = {
  headers: RequestHeaders;
  user?: { id: string };
};

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.id) return request.user.id;
    const header = request.headers["x-user-id"];
    const value = Array.isArray(header) ? header[0] : header;

    return value?.trim() || process.env.DEMO_USER_ID || DEFAULT_DEMO_USER_ID;
  }
);
