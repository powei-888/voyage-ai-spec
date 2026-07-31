const LABELS: Record<string, string> = {
  active: "進行中",
  archived: "已封存",
  voided: "已作廢",
  pending: "待處理",
  accepted: "已接受",
  rejected: "已拒絕",
  extracted: "待確認",
  confirmed: "已確認",
  failed: "失敗",
  owner: "擁有者",
  member: "成員",
  attraction: "景點",
  restaurant: "餐廳",
  hotel: "住宿",
  transport: "交通",
  activity: "活動",
  shopping: "購物",
  free_time: "自由活動",
  other: "其他",
  food: "餐飲",
  ticket: "票券",
  flight: "航班",
  train: "火車",
  bus: "巴士",
  car_rental: "租車",
  itinerary_check: "行程檢查",
  itinerary_update: "行程調整",
  expense_summary: "支出摘要",
  receipt_review: "收據檢查",
  booking_parse: "預訂解析",
  warnings: "注意事項",
  high_event_count: "行程數量偏高",
  operations: "建議操作",
  activeExpenseCount: "有效支出筆數",
  pendingReceiptCount: "待確認收據",
  draft: "草稿",
  available: "可用狀態"
};

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options
  }).format(new Date(value));
}

export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start, { month: "short", day: "numeric" })} 至 ${formatDate(end, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })}`;
}

export function formatTime(value: string | null): string {
  if (!value) return "時間未定";
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value) return "待安排";
  return `${formatDate(value, { month: "short", day: "numeric" })} ${formatTime(value)}`;
}

export function formatMoney(value: string | number, currency: string): string {
  const number = Number(value);
  try {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2
    }).format(number);
  } catch {
    return `${currency} ${number.toLocaleString("zh-TW")}`;
  }
}

export function titleCase(value: string): string {
  return LABELS[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function toDateInput(value: string): string {
  return value.slice(0, 10);
}

export function toDateTimeInput(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}
