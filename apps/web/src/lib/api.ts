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

const API_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "請檢查輸入內容。",
  INVALID_DATE: "日期格式或日期內容不正確。",
  INVALID_TRIP_DATES: "開始日期必須早於結束日期。",
  TRIP_TOO_LONG: "旅程日期範圍過長。",
  TRIP_DATES_HAVE_EVENTS: "新日期範圍不能排除已有行程的日期。",
  TRIP_ACCESS_DENIED: "你沒有存取此旅程的權限。",
  TRIP_OWNER_REQUIRED: "此操作僅限旅程擁有者。",
  INVALID_TRIP_MEMBER: "成員不屬於此旅程。",
  INVALID_AMOUNT: "金額必須是大於零的有效數字。",
  INVALID_CURRENCY_PRECISION: "金額的小數位數不符合幣別規則。",
  EXPENSE_PARTICIPANTS_REQUIRED: "請至少選擇一位分攤成員。",
  DUPLICATE_EXPENSE_PARTICIPANT: "支出分攤成員不可重複。",
  CURRENCY_MISMATCH: "幣別與旅程設定不一致。",
  INVALID_LINKED_EVENT: "關聯行程不屬於此旅程。",
  INVALID_EVENT_TIME: "行程結束時間必須晚於開始時間。",
  INVALID_EVENT_ORDER: "行程排序資料不正確。",
  EVENT_HAS_LINKED_RECORDS: "此行程已有支出或預訂關聯，無法刪除。",
  INVALID_BOOKING_TIME: "預訂結束時間必須晚於開始時間。",
  MEMBER_ALREADY_EXISTS: "此成員已在旅程中。",
  CANNOT_REMOVE_OWNER: "無法移除旅程建立者。",
  OWNER_ROLE_REQUIRED: "旅程建立者必須保留擁有者角色。",
  MEMBER_HAS_RECORDS: "此成員已有相關紀錄，無法移除。",
  RECEIPT_FILE_REQUIRED: "請選擇收據檔案。",
  INVALID_RECEIPT_SIZE: "收據檔案大小必須介於 1 byte 與 8 MB。",
  UNSUPPORTED_RECEIPT_FILE: "不支援此收據檔案格式。",
  RECEIPT_NOT_READY: "收據尚未完成辨識，無法確認。",
  RECEIPT_OCR_FAILED: "收據辨識失敗，請重新上傳。",
  PROPOSAL_ALREADY_DECIDED: "此提案已完成決策。",
  NOT_FOUND: "找不到指定資料。",
  CONFLICT: "已有相同資料。",
  INTERNAL_ERROR: "系統發生未預期的錯誤。"
};

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
      error: error instanceof Error ? error.message : "無法連線至 Voyage API。"
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
      error ? API_ERROR_MESSAGES[error.code] ?? error.message : `Voyage API 請求失敗（${response.status}）。`,
      response.status,
      error
    );
  }
  if (!payload || !("data" in payload)) {
    throw new ApiClientError("Voyage API 回傳了無效資料。", response.status);
  }
  return payload.data;
}
