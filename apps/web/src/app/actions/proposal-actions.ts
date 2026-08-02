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
    redirect(`${path}?notice=${encodeURIComponent("分析完成，已加入待審核提案")}`);
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
    const notice = decision === "accept"
      ? "已保留建議，旅程資料沒有被修改"
      : "已略過建議，可在提案歷史中查看";
    redirect(`${path}?notice=${encodeURIComponent(notice)}`);
  } catch (error) {
    redirectWithError(path, error);
  }
}
