import { DomainError } from "../../common/domain-error";

const ZERO_DECIMAL = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]);
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

export function currencyExponent(currency: string): number {
  const normalized = currency.toUpperCase();
  if (ZERO_DECIMAL.has(normalized)) return 0;
  if (THREE_DECIMAL.has(normalized)) return 3;
  return 2;
}

export function toMinorUnits(value: string, currency: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new DomainError("INVALID_AMOUNT", "Amount must be a positive decimal value.");
  }
  const exponent = currencyExponent(currency);
  const parts = normalized.split(".");
  const whole = parts[0] ?? "0";
  const fraction = parts[1] ?? "";
  if (fraction.length > exponent) {
    throw new DomainError(
      "INVALID_CURRENCY_PRECISION",
      `${currency.toUpperCase()} supports at most ${exponent} decimal places.`
    );
  }
  const minor = BigInt(whole) * 10n ** BigInt(exponent) +
    BigInt((fraction + "0".repeat(exponent)).slice(0, exponent) || "0");
  if (minor <= 0n) {
    throw new DomainError("INVALID_AMOUNT", "Amount must be greater than zero.");
  }
  return minor;
}

export function fromMinorUnits(value: bigint, currency: string): string {
  const exponent = currencyExponent(currency);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  if (exponent === 0) return `${negative ? "-" : ""}${absolute}`;
  const divisor = 10n ** BigInt(exponent);
  const whole = absolute / divisor;
  const fraction = (absolute % divisor).toString().padStart(exponent, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function addMoney(values: string[], currency: string): string {
  return fromMinorUnits(
    values.reduce((sum, value) => sum + toMinorUnits(value, currency), 0n),
    currency
  );
}
