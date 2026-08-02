import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "../../lib/session";

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login?error=" + encodeURIComponent("登入已失效，請重新登入。"), request.url)
  );
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
