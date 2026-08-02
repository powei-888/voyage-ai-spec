import "server-only";
import type { ApiEnvelope, ApiErrorPayload } from "@voyage/shared";
import { redirect } from "next/navigation";
import { getSessionToken } from "./session";

const API_BASE =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/api";

const API_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "請檢查輸入內容。",
  AUTH_REQUIRED: "登入已失效，請重新登入。",
  INVALID_CREDENTIALS: "電子郵件或密碼不正確。",
  LOGIN_RATE_LIMITED: "登入失敗次數過多，請稍後再試。",
  EMAIL_ALREADY_REGISTERED: "此電子郵件已建立帳號。",
  INVITE_REQUIRED: "建立帳號需要有效的旅程邀請連結。",
  INVITE_NOT_FOUND: "找不到這份旅程邀請。",
  INVITE_REVOKED: "這份旅程邀請已被撤銷。",
  INVITE_EXPIRED: "這份旅程邀請已過期。",
  INVITE_FULL: "這份旅程邀請的名額已滿。",
  INVITE_UNAVAILABLE: "這份旅程邀請目前無法使用，請重新整理確認狀態。",
  INVITE_MAX_USES_INVALID: "群組邀請至少需要兩個名額。",
  INVITE_RATE_LIMITED: "邀請請求次數過多，請稍後再試。",
  TRIP_ARCHIVED: "此旅程已封存，無法再接受新成員。",
  INVALID_CURRENT_PASSWORD: "目前密碼不正確。",
  PASSWORD_UNCHANGED: "新密碼必須與目前密碼不同。",
  INVALID_DATE: "日期格式或日期內容不正確。",
  INVALID_TRIP_DATES: "開始日期必須早於結束日期。",
  TRIP_TOO_LONG: "旅程日期範圍過長。",
  TRIP_DATES_HAVE_EVENTS: "新日期範圍不能排除已有行程的日期。",
  TRIP_CURRENCY_LOCKED: "已有支出、公費或還款紀錄，不能直接變更基準幣別。",
  TRIP_ACCESS_DENIED: "你沒有存取此旅程的權限。",
  TRIP_OWNER_REQUIRED: "此操作僅限旅程擁有者。",
  INVALID_TRIP_MEMBER: "成員不屬於此旅程。",
  TRAVELER_REQUIRED: "此欄位只能選擇旅伴。",
  INVALID_AMOUNT: "金額必須是大於零的有效數字。",
  INVALID_CURRENCY_PRECISION: "金額的小數位數不符合幣別規則。",
  INVALID_EXPENSE_PAYMENT_SOURCE: "請選擇旅伴付款或公費付款，兩者不可同時使用。",
  INVALID_EXPENSE_FUND: "選擇的公費帳戶不屬於此旅程。",
  FUND_NOT_FOUND: "找不到這個公費帳戶。",
  FUND_TRANSACTION_NOT_FOUND: "找不到這筆公費流水。",
  FUND_INSUFFICIENT_BALANCE: "公費餘額不足，請先補繳或調整金額。",
  FUND_BALANCE_CHANGED: "公費餘額剛剛有變動，請重新整理後再試。",
  FUND_TRAVELER_REQUIRED: "公費繳交與退款必須選擇旅伴。",
  FUND_ADJUSTMENT_PARTY_NOT_ALLOWED: "公費調整不能指定成員或代購單。",
  INVALID_FUND_PROXY_COLLECTION: "這筆收款不符合公費支付的代購單。",
  EXPENSE_PARTICIPANTS_REQUIRED: "請至少選擇一位分攤成員。",
  DUPLICATE_EXPENSE_PARTICIPANT: "支出分攤成員不可重複。",
  CUSTOM_SPLIT_TOTAL_MISMATCH: "自訂分攤金額加總必須等於支出總額。",
  CURRENCY_MISMATCH: "幣別與旅程設定不一致。",
  INVALID_SETTLEMENT_MEMBERS: "付款人與收款人不可相同。",
  SETTLEMENT_NOT_FOUND: "找不到還款紀錄。",
  SETTLEMENT_EXCEEDS_BALANCE: "還款金額超過目前待結算餘額。",
  PROXY_PURCHASE_RECIPIENT_REQUIRED: "請選擇一位外部對象，或直接建立新對象。",
  PROXY_PURCHASE_ITEM_REQUIRED: "每個代購品項都必須填寫商品名稱。",
  EXTERNAL_MEMBER_REQUIRED: "代購對象必須是外部帳務對象。",
  PROXY_PURCHASE_PAYMENT_FIELDS_REQUIRED: "記錄已購買時，必須選擇墊付旅伴與購買日期。",
  PROXY_PURCHASE_LOCKED: "已購買的代購單不能再修改商品內容。",
  PROXY_PURCHASE_ALREADY_RECORDED: "這張代購單已完成購買或取消。",
  PROXY_PURCHASE_HAS_COLLECTIONS: "請先刪除這張代購單的收款紀錄。",
  INVALID_PROXY_PURCHASE_SETTLEMENT: "收款資料與代購單不一致。",
  PROXY_PURCHASE_COLLECTION_EXCEEDS_OUTSTANDING: "本次收款超過代購單待收金額。",
  PROXY_PURCHASE_SETTLEMENT_REQUIRED: "這筆帳款請從代購頁記錄收款。",
  PROXY_PURCHASE_EXPENSE_LOCKED: "這筆支出由代購單管理，請回代購頁操作。",
  INVALID_LINKED_EVENT: "關聯行程不屬於此旅程。",
  INVALID_EVENT_TIME: "行程結束時間必須晚於開始時間。",
  INVALID_EVENT_ORDER: "行程排序資料不正確。",
  INVALID_EVENT_POSITION: "行程移動位置不正確。",
  EVENT_HAS_LINKED_RECORDS: "此行程已有支出或預訂關聯，無法刪除。",
  INVALID_BOOKING_TIME: "預訂結束時間必須晚於開始時間。",
  MEMBER_ALREADY_EXISTS: "此成員已在旅程中。",
  EXTERNAL_MEMBER_EMAIL_NOT_ALLOWED: "外部代購對象不能設定登入信箱。",
  EXTERNAL_MEMBER_ROLE_INVALID: "外部代購對象不能取得旅程權限。",
  CANNOT_REMOVE_OWNER: "無法移除旅程建立者。",
  OWNER_ROLE_REQUIRED: "旅程建立者必須保留擁有者角色。",
  MEMBER_HAS_RECORDS: "此成員已有相關紀錄，無法移除。",
  RECEIPT_FILE_REQUIRED: "請選擇收據檔案。",
  RECEIPT_UPLOAD_FAILED: "收據檔案儲存失敗，尚未加入辨識佇列。",
  RECEIPT_RETRY_NOT_ALLOWED: "這張收據目前不能重新排入辨識。",
  INVALID_RECEIPT_SIZE: "收據檔案大小必須介於 1 byte 與 8 MB。",
  UNSUPPORTED_RECEIPT_FILE: "不支援此收據檔案格式。",
  RECEIPT_NOT_READY: "收據尚未完成辨識，無法確認。",
  RECEIPT_NOT_EDITABLE: "此收據草稿目前無法編輯。",
  RECEIPT_ALREADY_CONFIRMED: "已確認的收據不能刪除。",
  RECEIPT_HAS_PROXY_PURCHASES: "請先取消這張收據尚未入帳的代購單。",
  RECEIPT_ITEMS_REQUIRED: "這張收據沒有可翻譯的商品明細。",
  INVALID_RECEIPT_ITEM: "選取的收據明細不存在。",
  INVALID_RECEIPT_ITEM_AMOUNT: "代購明細的實際分攤金額不正確。",
  RECEIPT_ITEM_ALREADY_ASSIGNED: "其中一項收據明細已指派給其他代購單。",
  RECEIPT_TRANSLATION_FAILED: "地端 AI 翻譯失敗，請稍後重試或人工輸入。",
  RECEIPT_PROXY_PURCHASE_LOCKED: "收據來源代購單請回收據頁管理。",
  RECEIPT_PROXY_TOTAL_EXCEEDS_AMOUNT: "代購明細小計超過收據總額，請先核對金額。",
  RECEIPT_PROXY_PURCHASE_CHANGED: "代購單狀態已變更，請重新整理後再確認。",
  RECEIPT_OCR_FAILED: "收據辨識失敗，請重新排入辨識。",
  LOCAL_AI_UNAVAILABLE: "地端 AI 暫時無法回應，請稍後再試。",
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
  return request<TData>(path, { method: "GET" }, true);
}

export async function apiSend<TData>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<TData> {
  return request<TData>(
    path,
    {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    true
  );
}

export async function apiPublicSend<TData>(
  path: string,
  body: unknown
): Promise<TData> {
  return request<TData>(
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    },
    false
  );
}

export async function apiPublicGet<TData>(path: string): Promise<TData> {
  return request<TData>(path, { method: "GET" }, false);
}

export async function apiUpload<TData>(
  path: string,
  formData: FormData
): Promise<TData> {
  return request<TData>(path, { method: "POST", body: formData }, true);
}

export async function apiDownload(path: string): Promise<Response> {
  const token = await getSessionToken();
  return fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: token ? { authorization: `Bearer ${token}` } : undefined
  });
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
  const match = path.match(/^\/api\/trips\/([^/]+)\/receipts\/([^/]+)\/image$/);
  if (match) return `/receipt-assets/${match[1]}/${match[2]}`;
  return path;
}

async function request<TData>(
  path: string,
  init: RequestInit,
  authenticated: boolean
): Promise<TData> {
  const token = authenticated ? await getSessionToken() : null;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<TData>
    | { error: ApiErrorPayload }
    | null;

  if (!response.ok) {
    if (authenticated && response.status === 401) redirect("/session-expired");
    const error = payload && "error" in payload ? payload.error : undefined;
    throw new ApiClientError(
      error
        ? API_ERROR_MESSAGES[error.code] ?? error.message
        : `Voyage API 請求失敗（${response.status}）。`,
      response.status,
      error
    );
  }
  if (!payload || !("data" in payload)) {
    throw new ApiClientError("Voyage API 回傳了無效資料。", response.status);
  }
  return payload.data;
}
