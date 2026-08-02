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
          ? optionalString(formData, "payerMemberId")
          : undefined,
      paymentSource:
        purchaseState === "purchased"
          ? formString(formData, "paymentSource") || "member"
          : undefined,
      fundId:
        purchaseState === "purchased"
          ? optionalString(formData, "fundId")
          : undefined,
      purchasedAt:
        purchaseState === "purchased"
          ? formString(formData, "purchasedAt")
          : undefined
    });
    revalidateTrip(tripId);
    redirect(
      `${path}?notice=${encodeURIComponent(
        purchaseState === "purchased" ? "已建立代購單並記錄付款" : "已建立代購清單"
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
        paymentSource: formString(formData, "paymentSource") || "member",
        payerMemberId: optionalString(formData, "payerMemberId"),
        fundId: optionalString(formData, "fundId"),
        purchasedAt: formString(formData, "purchasedAt")
      }
    );
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已記錄代購付款")}`);
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
    if (formString(formData, "paymentSource") === "fund") {
      const fundId = formString(formData, "fundId");
      await apiSend(`/trips/${tripId}/funds/${fundId}/transactions`, "POST", {
        type: "collection",
        memberId: formString(formData, "fromMemberId"),
        amount: formString(formData, "amount"),
        transactionDate: formString(formData, "settledAt"),
        note: optionalString(formData, "note"),
        proxyPurchaseId: purchaseId
      });
    } else {
      await apiSend(`/trips/${tripId}/settlements`, "POST", {
        fromMemberId: formString(formData, "fromMemberId"),
        toMemberId: formString(formData, "toMemberId"),
        amount: formString(formData, "amount"),
        currency: formString(formData, "currency"),
        settledAt: formString(formData, "settledAt"),
        note: optionalString(formData, "note"),
        proxyPurchaseId: purchaseId
      });
    }
    revalidateTrip(tripId);
    redirect(`${path}?notice=${encodeURIComponent("已記錄代購收款")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function deleteProxyCollectionAction(
  tripId: string,
  collectionId: string,
  source: "member" | "fund",
  fundId: string | null,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/proxy-purchases`;
  try {
    if (source === "fund" && fundId) {
      await apiSend(
        `/trips/${tripId}/funds/${fundId}/transactions/${collectionId}`,
        "DELETE",
        { reason: formString(formData, "reason") || "使用者刪除代購收款" }
      );
    } else {
      await apiSend(`/trips/${tripId}/settlements/${collectionId}`, "DELETE");
    }
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
  revalidatePath(`/trips/${tripId}/funds`);
  revalidatePath(`/trips/${tripId}/members`);
}
