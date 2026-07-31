"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "../../lib/api";
import { formString, optionalString, redirectWithError } from "../../lib/action-utils";

export async function createProposalAction(
  tripId: string,
  formData: FormData
): Promise<void> {
  const path = `/trips/${tripId}/ai`;
  try {
    await apiSend(`/trips/${tripId}/ai-proposals`, "POST", {
      type: formString(formData, "type"),
      inputText: optionalString(formData, "inputText")
    });
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=Proposal%20created%20for%20review`);
  } catch (error) {
    redirectWithError(path, error);
  }
}

export async function decideProposalAction(
  tripId: string,
  proposalId: string,
  decision: "accept" | "reject"
): Promise<void> {
  const path = `/trips/${tripId}/ai`;
  try {
    await apiSend(
      `/trips/${tripId}/ai-proposals/${proposalId}/${decision}`,
      "POST"
    );
    revalidatePath(`/trips/${tripId}`);
    redirect(`${path}?notice=Proposal%20${decision}ed`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
