"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend, apiUpload } from "../../lib/api";
import { formString, formStrings, optionalString, redirectWithError } from "../../lib/action-utils";

export async function uploadReceiptAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/receipts`;
  try {
    await apiUpload(`/trips/${tripId}/receipts`, formData);
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=Receipt%20extracted%20and%20ready%20for%20review`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function confirmReceiptAction(
  tripId: string,
  receiptId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/receipts`;
  try {
    await apiSend(`/trips/${tripId}/receipts/${receiptId}/confirm`, "POST", {
      title: formString(formData, "title"),
      merchant: optionalString(formData, "merchant"),
      amount: formString(formData, "amount"),
      currency: formString(formData, "currency"),
      category: formString(formData, "category"),
      expenseDate: optionalString(formData, "expenseDate"),
      payerMemberId: formString(formData, "payerMemberId"),
      participantMemberIds: formStrings(formData, "participantMemberIds"),
      linkedEventId: optionalString(formData, "linkedEventId")
    });
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=Receipt%20confirmed%20and%20expense%20created`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
