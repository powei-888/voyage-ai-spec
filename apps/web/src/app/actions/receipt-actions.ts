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

export async function translateReceiptItemsAction(
  tripId: string,
  receiptId: string
): Promise<void> {
  const path = `/trips/${tripId}/receipts`;
  try {
    await apiSend(`/trips/${tripId}/receipts/${receiptId}/translate`, "POST");
    revalidatePath(path);
    redirect(`${path}?notice=${encodeURIComponent("明細已使用地端 AI 翻譯")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function saveReceiptTranslationsAction(
  tripId: string,
  receiptId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/receipts`;
  try {
    const indexes = formStrings(formData, "translationIndex");
    const translations = formStrings(formData, "translatedDescription");
    await apiSend(`/trips/${tripId}/receipts/${receiptId}/translations`, "PATCH", {
      items: indexes.map((index, position) => ({
        index: Number(index),
        translatedDescription: translations[position] || ""
      }))
    });
    revalidatePath(path);
    redirect(`${path}?notice=${encodeURIComponent("明細翻譯已儲存")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function createReceiptProxyPurchaseAction(
  tripId: string,
  receiptId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/receipts`;
  try {
    await apiSend(`/trips/${tripId}/receipts/${receiptId}/proxy-purchases`, "POST", {
      externalMemberId: optionalString(formData, "externalMemberId"),
      newExternalName: optionalString(formData, "newExternalName"),
      itemIndexes: formStrings(formData, "itemIndexes").map(Number),
      note: optionalString(formData, "note")
    });
    revalidatePath(path);
    revalidatePath(`/trips/${tripId}/proxy-purchases`);
    redirect(`${path}?notice=${encodeURIComponent("已建立收據來源代購單")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
