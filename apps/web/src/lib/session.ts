import "server-only";
import type { AuthSession } from "@voyage/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "voyage_session";

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value || null;
}

export async function requireSession(): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect("/login");
  return token;
}

export async function saveSession(session: AuthSession): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    expires: new Date(session.expiresAt),
    path: "/"
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
