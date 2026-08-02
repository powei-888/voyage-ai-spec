"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import {
  formString,
  formStrings,
  optionalString,
  nullableString,
  redirectWithError
} from "../../lib/action-utils";

export async function createEventAction(
  tripId: string,
  dayId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/timeline?day=${dayId}`;
  try {
    await apiSend(`/trips/${tripId}/itinerary-days/${dayId}/events`, "POST", {
      title: formString(formData, "title"),
      category: formString(formData, "category") || "other",
      startTime: optionalString(formData, "startTime"),
      endTime: optionalString(formData, "endTime"),
      locationName: optionalString(formData, "locationName"),
      address: optionalString(formData, "address"),
      notes: optionalString(formData, "notes"),
      estimatedCostAmount: optionalString(formData, "estimatedCostAmount"),
      estimatedCostCurrency: optionalString(formData, "estimatedCostCurrency"),
      participantMemberIds: formStrings(formData, "participantMemberIds")
    });
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}&notice=${encodeURIComponent("已新增行程")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function updateEventAction(
  tripId: string,
  dayId: string,
  eventId: string,
  formData: FormData
): Promise<void> {
  let targetDayId = dayId;
  let path = `/trips/${tripId}/timeline?day=${dayId}`;
  try {
    targetDayId = formString(formData, "targetDayId") || dayId;
    const estimatedCostAmount = nullableString(formData, "estimatedCostAmount");
    await apiSend(`/trips/${tripId}/events/${eventId}`, "PATCH", {
      title: formString(formData, "title"),
      category: formString(formData, "category"),
      startTime: nullableString(formData, "startTime"),
      endTime: nullableString(formData, "endTime"),
      locationName: formString(formData, "locationName"),
      address: formString(formData, "address"),
      notes: formString(formData, "notes"),
      estimatedCostAmount,
      estimatedCostCurrency:
        estimatedCostAmount === null
          ? null
          : optionalString(formData, "estimatedCostCurrency"),
      participantMemberIds: formStrings(formData, "participantMemberIds")
    });
    if (targetDayId !== dayId) {
      await apiSend(`/trips/${tripId}/events/${eventId}/move`, "POST", {
        targetDayId
      });
      path = `/trips/${tripId}/timeline?day=${targetDayId}`;
    }
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}&notice=${encodeURIComponent("已更新行程")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function moveEventAction(
  tripId: string,
  eventId: string,
  targetDayId: string,
  targetIndex: number
): Promise<void> {
  await apiSend(`/trips/${tripId}/events/${eventId}/move`, "POST", {
    targetDayId,
    targetIndex
  });
  revalidatePath(`/trips/${tripId}/timeline`);
}

export async function reorderEventsAction(
  tripId: string,
  dayId: string,
  eventIds: string[]
): Promise<void> {
  const path = `/trips/${tripId}/timeline?day=${dayId}`;
  try {
    await apiSend(
      `/trips/${tripId}/itinerary-days/${dayId}/events/reorder`,
      "POST",
      { eventIds }
    );
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}&notice=${encodeURIComponent("已更新行程順序")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function deleteEventAction(
  tripId: string,
  dayId: string,
  eventId: string
): Promise<void> {
  const path = `/trips/${tripId}/timeline?day=${dayId}`;
  try {
    await apiSend(`/trips/${tripId}/events/${eventId}`, "DELETE");
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}&notice=${encodeURIComponent("已刪除行程")}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
