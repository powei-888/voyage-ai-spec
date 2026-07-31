"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import {
  formString,
  formStrings,
  nullableString,
  optionalString,
  redirectWithError
} from "../../lib/action-utils";

export async function createExpenseAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/expenses`;
  try {
    await apiSend(`/trips/${tripId}/expenses`, "POST", expensePayload(formData));
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=${encodeURIComponent("已新增支出")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function updateExpenseAction(
  tripId: string,
  expenseId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/expenses`;
  try {
    await apiSend(
      `/trips/${tripId}/expenses/${expenseId}`,
      "PATCH",
      expensePayload(formData, true)
    );
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=${encodeURIComponent("已更新支出")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function voidExpenseAction(
  tripId: string,
  expenseId: string
): Promise<void> {
  const path = `/trips/${tripId}/expenses`;
  try {
    await apiSend(`/trips/${tripId}/expenses/${expenseId}`, "DELETE");
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=${encodeURIComponent("已作廢支出")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

function expensePayload(formData: FormData, update = false) {
  return {
    title: formString(formData, "title"),
    merchant: formString(formData, "merchant"),
    amount: formString(formData, "amount"),
    currency: formString(formData, "currency"),
    category: formString(formData, "category") || "other",
    expenseDate: update ? nullableString(formData, "expenseDate") : optionalString(formData, "expenseDate"),
    payerMemberId: formString(formData, "payerMemberId"),
    participantMemberIds: formStrings(formData, "participantMemberIds"),
    linkedEventId: nullableString(formData, "linkedEventId")
  };
}
