import "server-only";
import { redirect } from "next/navigation";
import { ApiClientError } from "./api";

export function formString(formData: FormData, name: string): string {
  return String(formData.get(name) || "").trim();
}

export function optionalString(
  formData: FormData,
  name: string
): string | undefined {
  const value = formString(formData, name);
  return value || undefined;
}

export function nullableString(
  formData: FormData,
  name: string
): string | null {
  return optionalString(formData, name) || null;
}

export function formStrings(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function redirectWithError(path: string, error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String(error.digest).startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
  const message =
    error instanceof ApiClientError
      ? error.message
      : error instanceof Error
        ? error.message
        : "The action could not be completed.";
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}
