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
    redirect(`${path}?notice=${encodeURIComponent("收據辨識完成，請確認內容")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function reviewReceiptAction(
  tripId: string,
  receiptId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/receipts`;
  try {
    if (formString(formData, "intent") === "save") {
      await apiSend(`/trips/${tripId}/receipts/${receiptId}`, "PATCH", {
        merchant: formString(formData, "merchant"),
        amount: formString(formData, "amount"),
        currency: formString(formData, "currency"),
        category: formString(formData, "category"),
        date: formString(formData, "expenseDate")
      });
      revalidatePath(path);
      redirect(`${path}?notice=${encodeURIComponent("已儲存收據草稿")}`);
    }

    const participantMemberIds = formStrings(formData, "participantMemberIds");
    await apiSend(`/trips/${tripId}/receipts/${receiptId}/confirm`, "POST", {
      title: formString(formData, "title"),
      merchant: optionalString(formData, "merchant"),
      amount: formString(formData, "amount"),
      currency: formString(formData, "currency"),
      category: formString(formData, "category"),
      expenseDate: optionalString(formData, "expenseDate"),
      payerMemberId: formString(formData, "payerMemberId"),
      splitMethod: formString(formData, "splitMethod") || "equal",
      participantMemberIds,
      splitShares: participantMemberIds
        .map((memberId) => ({
          memberId,
          shareAmount: formString(formData, "shareAmount:" + memberId)
        }))
        .filter((share) => share.shareAmount),
      linkedEventId: optionalString(formData, "linkedEventId")
    });
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=${encodeURIComponent("已確認收據並建立支出")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function deleteReceiptAction(
  tripId: string,
  receiptId: string
): Promise<void> {
  const path = `/trips/${tripId}/receipts`;
  try {
    await apiSend(`/trips/${tripId}/receipts/${receiptId}`, "DELETE");
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=${encodeURIComponent("已刪除收據草稿")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
