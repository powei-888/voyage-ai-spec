"use server";

import type { AuthSession } from "@voyage/shared";
import { redirect } from "next/navigation";
import { apiPublicSend, apiSend } from "../../lib/api";
import { formString, redirectWithError } from "../../lib/action-utils";
import { clearSession, saveSession } from "../../lib/session";

export async function loginAction(formData: FormData): Promise<void> {
  try {
    const session = await apiPublicSend<AuthSession>("/auth/login", {
      email: formString(formData, "email"),
      password: formString(formData, "password")
    });
    await saveSession(session);
    redirect("/");
  } catch (error) {
    redirectWithError("/login", error);
  }
}

export async function registerAction(formData: FormData): Promise<void> {
  try {
    const session = await apiPublicSend<AuthSession>("/auth/register", {
      displayName: formString(formData, "displayName"),
      email: formString(formData, "email"),
      password: formString(formData, "password")
    });
    await saveSession(session);
    redirect("/");
  } catch (error) {
    redirectWithError("/login?mode=register", error);
  }
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
