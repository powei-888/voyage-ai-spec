export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options
  }).format(new Date(value));
}

export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start, { month: "short", day: "numeric" })} - ${formatDate(end, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })}`;
}

export function formatTime(value: string | null): string {
  if (!value) return "Any time";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Schedule later";
  return `${formatDate(value, { month: "short", day: "numeric" })}, ${formatTime(value)}`;
}

export function formatMoney(value: string | number, currency: string): string {
  const number = Number(value);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2
    }).format(number);
  } catch {
    return `${currency} ${number.toLocaleString("en-US")}`;
  }
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function toDateInput(value: string): string {
  return value.slice(0, 10);
}

export function toDateTimeInput(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}
