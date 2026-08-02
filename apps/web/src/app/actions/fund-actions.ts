"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import { formString, optionalString, redirectWithError } from "../../lib/action-utils";

export async function createFundAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/funds`;
  try {
    await apiSend(`/trips/${tripId}/funds`, "POST", {
      name: optionalString(formData, "name"),
      currency: formString(formData, "currency")
    });
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已建立旅程公費")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function createFundTransactionAction(
  tripId: string,
  fundId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/funds`;
  try {
    await apiSend(`/trips/${tripId}/funds/${fundId}/transactions`, "POST", {
      type: formString(formData, "type"),
      memberId: optionalString(formData, "memberId"),
      amount: formString(formData, "amount"),
      transactionDate: formString(formData, "transactionDate"),
      note: optionalString(formData, "note"),
      proxyPurchaseId: optionalString(formData, "proxyPurchaseId")
    });
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已記錄公費流水")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function voidFundTransactionAction(
  tripId: string,
  fundId: string,
  transactionId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/funds`;
  try {
    await apiSend(
      `/trips/${tripId}/funds/${fundId}/transactions/${transactionId}`,
      "DELETE",
      { reason: formString(formData, "reason") || "使用者於公費帳本作廢" }
    );
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已作廢公費流水")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/funds`);
  revalidatePath(`/trips/${tripId}/expenses`);
  revalidatePath(`/trips/${tripId}/proxy-purchases`);
  revalidatePath(`/trips/${tripId}/receipts`);
}
