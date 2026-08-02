"use server";

import type {
  TripInvite,
  TripInviteAcceptResult,
  TripInviteCreateResult
} from "@voyage/shared";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import { formString, redirectWithError } from "../../lib/action-utils";

export type InviteCreateActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  created: { invite: TripInvite; shareUrl: string } | null;
};

export async function createTripInviteAction(
  tripId: string,
  _previousState: InviteCreateActionState,
  formData: FormData
): Promise<InviteCreateActionState> {
  try {
    const result = await apiSend<TripInviteCreateResult>(
      `/trips/${tripId}/invites`,
      "POST",
      {
        mode: formString(formData, "mode"),
        expiresInDays: Number(formString(formData, "expiresInDays")),
        maxUses: formString(formData, "mode") === "group"
          ? Number(formString(formData, "maxUses"))
          : undefined
      }
    );
    const shareUrl = new URL(`/invite/${encodeURIComponent(result.token)}`, await appOrigin()).toString();
    revalidatePath(`/trips/${tripId}/members`);
    return {
      status: "success",
      message: "邀請已建立。這是唯一一次顯示完整連結，請立即分享或下載 QR Code。",
      created: { invite: result.invite, shareUrl }
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "無法建立邀請。",
      created: null
    };
  }
}

export async function revokeTripInviteAction(
  tripId: string,
  inviteId: string
): Promise<void> {
  const path = `/trips/${tripId}/members`;
  try {
    await apiSend(`/trips/${tripId}/invites/${inviteId}/revoke`, "POST");
    revalidatePath(path);
    redirect(`${path}?notice=${encodeURIComponent("邀請已撤銷")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function acceptTripInviteAction(token: string): Promise<void> {
  const returnPath = `/invite/${encodeURIComponent(token)}`;
  try {
    const result = await apiSend<TripInviteAcceptResult>(
      `/invites/${encodeURIComponent(token)}/accept`,
      "POST"
    );
    const notice = result.alreadyMember ? "你已經是此旅程的成員。" : "已加入旅程，歡迎一起出發。";
    redirect(`/trips/${result.tripId}?notice=${encodeURIComponent(notice)}`);
  } catch (error) {
    redirectWithError(returnPath, error);
  }
}

async function appOrigin(): Promise<string> {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  }
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "localhost:3000";
  return `${forwardedProto || "http"}://${host}`;
}
