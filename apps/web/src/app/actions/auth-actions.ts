"use server";

import type { AuthRegistrationSession, AuthSession } from "@voyage/shared";
import { redirect } from "next/navigation";
import { apiPublicSend, apiSend } from "../../lib/api";
import { formString, optionalString, redirectWithError } from "../../lib/action-utils";
import { safeReturnPath } from "../../lib/navigation";
import { clearSession, saveSession } from "../../lib/session";

export async function loginAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnPath(formString(formData, "returnTo"));
  const inviteToken = optionalString(formData, "inviteToken");
  try {
    const session = await apiPublicSend<AuthSession>("/auth/login", {
      email: formString(formData, "email"),
      password: formString(formData, "password")
    });
    await saveSession(session);
    redirect(returnTo);
  } catch (error) {
    redirectWithError(authPath("login", returnTo, inviteToken), error);
  }
}

export async function registerAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnPath(formString(formData, "returnTo"));
  const inviteToken = optionalString(formData, "inviteToken");
  try {
    const session = await apiPublicSend<AuthRegistrationSession>("/auth/register", {
      displayName: formString(formData, "displayName"),
      email: formString(formData, "email"),
      password: formString(formData, "password"),
      inviteToken
    });
    await saveSession(session);
    if (session.joinedTripId) {
      redirect(`/trips/${session.joinedTripId}?notice=${encodeURIComponent("帳號已建立並加入旅程。")}`);
    }
    redirect(returnTo);
  } catch (error) {
    redirectWithError(authPath("register", returnTo, inviteToken), error);
  }
}

function authPath(
  mode: "login" | "register",
  returnTo: string,
  inviteToken?: string
): string {
  const query = new URLSearchParams();
  if (mode === "register") query.set("mode", "register");
  if (returnTo !== "/") query.set("next", returnTo);
  if (inviteToken) query.set("invite", inviteToken);
  const suffix = query.toString();
  return suffix ? `/login?${suffix}` : "/login";
}

export async function logoutAction(): Promise<void> {
  try {
    await apiSend("/auth/logout", "POST");
  } finally {
    await clearSession();
    redirect("/login");
  }
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const currentPassword = formString(formData, "currentPassword");
  const newPassword = formString(formData, "newPassword");
  const confirmPassword = formString(formData, "confirmPassword");
  if (newPassword !== confirmPassword) {
    redirect(`/account?error=${encodeURIComponent("新密碼與確認密碼不一致。")}`);
  }
  try {
    await apiSend("/auth/change-password", "POST", { currentPassword, newPassword });
    await clearSession();
    redirect(`/login?notice=${encodeURIComponent("密碼已更新，請重新登入。")}`);
  } catch (error) {
    redirectWithError("/account", error);
  }
}

export async function logoutAllAction(): Promise<void> {
  try {
    await apiSend("/auth/logout-all", "POST");
  } finally {
    await clearSession();
    redirect(`/login?notice=${encodeURIComponent("所有裝置都已登出。")}`);
  }
}
