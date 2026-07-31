"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import { formString, nullableString, optionalString, redirectWithError } from "../../lib/action-utils";

export async function createBookingAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/bookings`;
  try {
    await apiSend(`/trips/${tripId}/bookings`, "POST", bookingPayload(formData));
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=Booking%20added`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function updateBookingAction(
  tripId: string,
  bookingId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/bookings`;
  try {
    await apiSend(
      `/trips/${tripId}/bookings/${bookingId}`,
      "PATCH",
      bookingPayload(formData, true)
    );
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=Booking%20updated`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function deleteBookingAction(
  tripId: string,
  bookingId: string
): Promise<void> {
  const path = `/trips/${tripId}/bookings`;
  try {
    await apiSend(`/trips/${tripId}/bookings/${bookingId}`, "DELETE");
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=Booking%20removed`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

function bookingPayload(formData: FormData, update = false) {
  return {
    type: formString(formData, "type"),
    title: formString(formData, "title"),
    provider: formString(formData, "provider"),
    confirmationCode: formString(formData, "confirmationCode"),
    startTime: update ? nullableString(formData, "startTime") : optionalString(formData, "startTime"),
    endTime: update ? nullableString(formData, "endTime") : optionalString(formData, "endTime"),
    location: formString(formData, "location"),
    attachmentUrl: update ? nullableString(formData, "attachmentUrl") : optionalString(formData, "attachmentUrl"),
    linkedEventId: nullableString(formData, "linkedEventId")
  };
}
