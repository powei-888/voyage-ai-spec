import { apiDownload } from "../../../../lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ tripId: string; receiptId: string }> }
) {
  const { tripId, receiptId } = await context.params;
  const response = await apiDownload(
    `/trips/${tripId}/receipts/${receiptId}/image`
  );
  if (!response.ok) {
    return new Response(null, { status: response.status });
  }
  return new Response(response.body, {
    headers: {
      "content-type": response.headers.get("content-type") || "application/octet-stream",
      "cache-control": "private, no-store"
    }
  });
}
