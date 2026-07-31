import { DomainError } from "./domain-error";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(value: string): Date {
  if (!DATE_ONLY.test(value)) {
    throw new DomainError("INVALID_DATE", "Dates must use YYYY-MM-DD format.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new DomainError("INVALID_DATE", "The supplied calendar date is invalid.");
  }
  return date;
}

export function enumerateDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
