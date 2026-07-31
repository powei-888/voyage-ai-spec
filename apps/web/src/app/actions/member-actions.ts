"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import { formString, optionalString, redirectWithError } from "../../lib/action-utils";

export async function addMemberAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/members`;
  try {
    await apiSend(`/trips/${tripId}/members`, "POST", {
      displayName: formString(formData, "displayName"),
      email: optionalString(formData, "email")
    });
    revalidatePath(path);
    redirect(`${path}?notice=${encodeURIComponent("已新增成員")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function updateMemberAction(
  tripId: string,
  memberId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/members`;
  try {
    await apiSend(`/trips/${tripId}/members/${memberId}`, "PATCH", {
      displayName: formString(formData, "displayName"),
      role: formString(formData, "role")
    });
    revalidatePath(path);
    redirect(`${path}?notice=${encodeURIComponent("已更新成員")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function removeMemberAction(
  tripId: string,
  memberId: string
): Promise<void> {
  const path = `/trips/${tripId}/members`;
  try {
    await apiSend(`/trips/${tripId}/members/${memberId}`, "DELETE");
    revalidatePath(path);
    redirect(`${path}?notice=${encodeURIComponent("已移除成員")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
