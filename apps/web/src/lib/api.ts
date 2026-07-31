import "server-only";
import type { ApiEnvelope, ApiErrorPayload } from "@voyage/shared";

const API_BASE =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/api";
const USER_ID =
  process.env.DEMO_USER_ID ||
  process.env.NEXT_PUBLIC_DEMO_USER_ID ||
  "00000000-0000-4000-8000-000000000001";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: ApiErrorPayload
  ) {
    super(message);
  }
}

export async function apiGet<TData>(path: string): Promise<TData> {
  return request<TData>(path, { method: "GET" });
}

export async function apiSend<TData>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<TData> {
  return request<TData>(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export async function apiUpload<TData>(
  path: string,
  formData: FormData
): Promise<TData> {
  return request<TData>(path, { method: "POST", body: formData });
}

export async function safeApiGet<TData>(
  path: string
): Promise<{ data: TData | null; error: string | null }> {
  try {
    return { data: await apiGet<TData>(path), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unable to reach the Voyage API."
    };
  }
}

export function apiAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const publicBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
  return `${new URL(publicBase).origin}${path}`;
}

async function request<TData>(path: string, init: RequestInit): Promise<TData> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "x-user-id": USER_ID,
      ...init.headers
    }
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<TData>
    | { error: ApiErrorPayload }
    | null;

  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : undefined;
    throw new ApiClientError(
      error?.message || `Voyage API request failed (${response.status}).`,
      response.status,
      error
    );
  }
  if (!payload || !("data" in payload)) {
    throw new ApiClientError("Voyage API returned an invalid response.", response.status);
  }
  return payload.data;
}
