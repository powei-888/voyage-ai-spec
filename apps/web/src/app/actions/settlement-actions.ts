"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import { formString, optionalString, redirectWithError } from "../../lib/action-utils";

export async function createSettlementAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/expenses`;
  try {
    await apiSend(`/trips/${tripId}/settlements`, "POST", {
      fromMemberId: formString(formData, "fromMemberId"),
      toMemberId: formString(formData, "toMemberId"),
      amount: formString(formData, "amount"),
      currency: formString(formData, "currency"),
      settledAt: formString(formData, "settledAt"),
      note: optionalString(formData, "note")
    });
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=${encodeURIComponent("已記錄還款")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function deleteSettlementAction(
  tripId: string,
  settlementId: string
): Promise<void> {
  const path = `/trips/${tripId}/expenses`;
  try {
    await apiSend(`/trips/${tripId}/settlements/${settlementId}`, "DELETE");
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=${encodeURIComponent("已刪除還款紀錄")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
