export const PROPOSAL_META: Record<
  string,
  {
    label: string;
    fallbackTitle: string;
    placeholder: string;
    href: string;
    actionLabel: string;
  }
> = {
  itinerary_check: {
    label: "行程檢查",
    fallbackTitle: "行程安排檢查結果",
    placeholder: "例如：檢查第 2 天是否太緊湊，並確認移動時間是否合理。",
    href: "timeline",
    actionLabel: "前往行程表"
  },
  itinerary_update: {
    label: "行程調整",
    fallbackTitle: "行程調整建議",
    placeholder: "例如：把第 3 天改成雨天備案，保留已預訂的活動。",
    href: "timeline",
    actionLabel: "前往行程表"
  },
  expense_summary: {
    label: "支出摘要",
    fallbackTitle: "旅程支出分析",
    placeholder: "例如：找出目前花費最高的分類，並檢查是否接近預算。",
    href: "expenses",
    actionLabel: "前往支出"
  },
  receipt_review: {
    label: "收據檢查",
    fallbackTitle: "收據審核建議",
    placeholder: "例如：整理目前待確認收據，列出應優先核對的內容。",
    href: "receipts",
    actionLabel: "前往收據"
  },
  booking_parse: {
    label: "預訂解析",
    fallbackTitle: "預訂資料整理建議",
    placeholder: "例如：檢查目前預訂資料缺少哪些時間、地點或確認碼。",
    href: "bookings",
    actionLabel: "前往預訂"
  }
};

const FIELD_LABELS: Record<string, string> = {
  observations: "重點觀察",
  warnings: "需要留意",
  suggestions: "建議調整",
  missingFields: "缺少資料",
  metrics: "分析指標",
  details: "補充分析",
  operations: "可套用操作",
  restGaps: "休息空檔",
  dayDensity: "每日密度",
  timeOverlap: "時間重疊",
  movementReasonability: "移動合理性",
  movementAnalysis: "移動分析",
  budgetAnalysis: "預算分析",
  budgetUsage: "預算使用情況",
  budgetUsagePercent: "預算使用率",
  categoryTotals: "分類支出",
  checkedDays: "檢查天數",
  activeExpenseCount: "有效支出筆數",
  pendingReceiptCount: "待確認收據",
  recordedTotal: "已記錄總額",
  budgetAmount: "旅程預算",
  largestCategory: "最高支出分類",
  largestCategoryAmount: "最高分類金額",
  currency: "幣別",
  available: "目前可用",
  priority: "優先順序",
  reason: "原因",
  date: "日期",
  eventCount: "行程數量",
  totalEvents: "行程總數",
  eventsWithTime: "已設定時間",
  invalidTimeEvents: "時間異常",
  eventsWithoutLocation: "未設定地點",
  emptyDays: "空白天數",
  totalDays: "旅程天數",
  daysWithEvents: "已有行程天數",
  conflicts: "衝突數量",
  startTime: "開始時間",
  endTime: "結束時間",
  locationName: "地點",
  title: "名稱",
  amount: "金額",
  category: "分類"
};

const TECHNICAL_KEYS = new Set(["kind", "source", "model"]);
const FIELD_PRIORITY: Record<string, number> = {
  warnings: 10,
  observations: 20,
  suggestions: 30,
  missingFields: 40,
  metrics: 50,
  details: 60
};

export type ProposalDisplayField = {
  key: string;
  label: string;
  value: unknown;
  scalar: boolean;
};

export function getProposalMeta(type: string) {
  return PROPOSAL_META[type] ?? {
    label: "AI 分析",
    fallbackTitle: "旅程分析結果",
    placeholder: "補充希望 AI 協助檢查的內容。",
    href: "",
    actionLabel: "返回旅程總覽"
  };
}

export function proposalHeadline(summary: string, type: string): string {
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (!normalized) return getProposalMeta(type).fallbackTitle;

  const sentence = normalized.match(/^.{1,64}?[。！？!?]/u)?.[0]?.trim();
  if (sentence) return sentence;
  if (normalized.length <= 64) return normalized;
  return `${normalized.slice(0, 63).trimEnd()}…`;
}

export function proposalFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const day = key.match(/^day[_-]?(\d+)$/i);
  if (day) return `第 ${day[1]} 天`;

  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words || "補充資訊";
}

export function proposalDisplayFields(value: Record<string, unknown>): ProposalDisplayField[] {
  return Object.entries(value)
    .filter(([key, item]) => !TECHNICAL_KEYS.has(key) && isMeaningful(item))
    .filter(([key, item]) => key !== "operations" || (Array.isArray(item) && item.length > 0))
    .map(([key, item]) => ({
      key,
      label: proposalFieldLabel(key),
      value: item,
      scalar: item === null || ["string", "number", "boolean"].includes(typeof item)
    }))
    .sort(
      (left, right) =>
        (FIELD_PRIORITY[left.key] ?? 45) - (FIELD_PRIORITY[right.key] ?? 45)
    );
}

export function proposalTechnicalFields(value: Record<string, unknown>) {
  const source = value.source === "local_ollama" ? "地端 Ollama" : value.source;
  return [
    { label: "執行來源", value: source },
    { label: "模型", value: value.model }
  ].filter((item) => isMeaningful(item.value));
}

export function proposalStatusLabel(status: string): string {
  if (status === "accepted") return "已保留";
  if (status === "rejected") return "已略過";
  if (status === "expired") return "已失效";
  return "待審核";
}

export function proposalDestination(tripId: string, type: string): string {
  const segment = getProposalMeta(type).href;
  return segment ? `/trips/${tripId}/${segment}` : `/trips/${tripId}`;
}

export function localizeProposalText(value: string): string {
  const terms: Array<[RegExp, string]> = [
    [/\bstartTime\b/gi, "開始時間"],
    [/\bendTime\b/gi, "結束時間"],
    [/\blocationName\b/gi, "地點"],
    [/\bdayIndex\b/gi, "旅程日序"],
    [/\beventCount\b/gi, "行程數量"]
  ];
  let localized = value.replace(
    /(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}(?:\.\d{3})?Z/g,
    "$1 $2"
  );
  for (const [pattern, label] of terms) localized = localized.replace(pattern, label);
  return localized;
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}
