"use server";

import type { ProxyPurchase } from "@voyage/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import { formString, optionalString, redirectWithError } from "../../lib/action-utils";

export async function createProxyPurchaseAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/proxy-purchases`;
  try {
    const purchaseState = formString(formData, "purchaseState");
    await apiSend<ProxyPurchase>(`/trips/${tripId}/proxy-purchases`, "POST", {
      externalMemberId:
        formString(formData, "partyMode") === "existing"
          ? formString(formData, "externalMemberId")
          : undefined,
      newExternalName:
        formString(formData, "partyMode") === "new"
          ? formString(formData, "newExternalName")
          : undefined,
      items: purchaseItems(formData),
      note: optionalString(formData, "note"),
      payerMemberId:
        purchaseState === "purchased"
          ? formString(formData, "payerMemberId")
          : undefined,
      purchasedAt:
        purchaseState === "purchased"
          ? formString(formData, "purchasedAt")
          : undefined
    });
    revalidateTrip(tripId);
    redirect(
      `${path}?notice=${encodeURIComponent(
        purchaseState === "purchased" ? "已建立代購單並記錄墊付款" : "已建立代購清單"
      )}`
    );
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function updateProxyPurchaseAction(
  tripId: string,
  purchaseId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/proxy-purchases`;
  try {
    await apiSend(`/trips/${tripId}/proxy-purchases/${purchaseId}`, "PATCH", {
      externalMemberId: formString(formData, "externalMemberId"),
      items: purchaseItems(formData),
      note: optionalString(formData, "note")
    });
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已更新代購清單")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function confirmProxyPurchaseAction(
  tripId: string,
  purchaseId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/proxy-purchases`;
  try {
    await apiSend(
      `/trips/${tripId}/proxy-purchases/${purchaseId}/confirm`,
      "POST",
      {
        payerMemberId: formString(formData, "payerMemberId"),
        purchasedAt: formString(formData, "purchasedAt")
      }
    );
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已記錄代購墊付款")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function collectProxyPurchaseAction(
  tripId: string,
  purchaseId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/proxy-purchases`;
  try {
    await apiSend(`/trips/${tripId}/settlements`, "POST", {
      fromMemberId: formString(formData, "fromMemberId"),
      toMemberId: formString(formData, "toMemberId"),
      amount: formString(formData, "amount"),
      currency: formString(formData, "currency"),
      settledAt: formString(formData, "settledAt"),
      note: optionalString(formData, "note"),
      proxyPurchaseId: purchaseId
    });
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已記錄代購收款")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function deleteProxyCollectionAction(
  tripId: string,
  settlementId: string
): Promise<void> {
  const path = `/trips/${tripId}/proxy-purchases`;
  try {
    await apiSend(`/trips/${tripId}/settlements/${settlementId}`, "DELETE");
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已刪除代購收款紀錄")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function cancelProxyPurchaseAction(
  tripId: string,
  purchaseId: string
): Promise<void> {
  const path = `/trips/${tripId}/proxy-purchases`;
  try {
    await apiSend(`/trips/${tripId}/proxy-purchases/${purchaseId}`, "DELETE");
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已取消代購單")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

function purchaseItems(formData: FormData) {
  const descriptions = formData.getAll("itemDescription").map(String);
  const quantities = formData.getAll("itemQuantity").map(String);
  const unitPrices = formData.getAll("itemUnitPrice").map(String);
  const notes = formData.getAll("itemNote").map(String);
  return descriptions.map((description, index) => ({
    description: description.trim(),
    quantity: Number(quantities[index] || "1"),
    unitPrice: String(unitPrices[index] || "").trim(),
    note: String(notes[index] || "").trim() || undefined
  }));
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/proxy-purchases`);
  revalidatePath(`/trips/${tripId}/expenses`);
  revalidatePath(`/trips/${tripId}/members`);
}
