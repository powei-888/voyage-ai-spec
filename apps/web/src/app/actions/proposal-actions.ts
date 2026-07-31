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
    redirect(`${path}?notice=${encodeURIComponent("已建立提案，等待審核")}`);
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
    const notice = decision === "accept" ? "已接受提案" : "已拒絕提案";
    redirect(`${path}?notice=${encodeURIComponent(notice)}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
