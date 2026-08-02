"use server";

import type { Trip } from "@voyage/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import { formString, optionalString, redirectWithError } from "../../lib/action-utils";

export async function createTripAction(formData: FormData): Promise<void> {
  try {
    const trip = await apiSend<Trip>("/trips", "POST", {
      name: formString(formData, "name"),
      destinationCountry: optionalString(formData, "destinationCountry"),
      destinationCity: optionalString(formData, "destinationCity"),
      startDate: formString(formData, "startDate"),
      endDate: formString(formData, "endDate"),
      baseCurrency: formString(formData, "baseCurrency") || "USD",
      budgetAmount: optionalString(formData, "budgetAmount")
    });
    revalidatePath("/");
    redirect(`/trips/${trip.id}`);
  } catch (error) {
    redirectWithError("/", error);
  }
}

export async function updateTripAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/settings`;
  try {
    const budgetAmount = optionalString(formData, "budgetAmount");
    await apiSend(`/trips/${tripId}`, "PATCH", {
      name: formString(formData, "name"),
      destinationCountry: formString(formData, "destinationCountry"),
      destinationCity: formString(formData, "destinationCity"),
      startDate: formString(formData, "startDate"),
      endDate: formString(formData, "endDate"),
      baseCurrency: formString(formData, "baseCurrency"),
      budgetAmount,
      ...(budgetAmount === undefined ? { clearBudget: null } : {})
    });
    revalidatePath(`/trips/${tripId}`, "layout");
    redirect(`${path}?notice=${encodeURIComponent("已儲存旅程設定")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function archiveTripAction(tripId: string): Promise<void> {
  try {
    await apiSend(`/trips/${tripId}/archive`, "POST");
    revalidatePath("/");
    redirect(`/?notice=${encodeURIComponent("已封存旅程")}`);
  } catch (error) {
    redirectWithError(`/trips/${tripId}/settings`, error);
  }
}
