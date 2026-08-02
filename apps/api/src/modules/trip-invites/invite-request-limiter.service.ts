import { createHash } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainError } from "../../common/domain-error";

type InviteRequestKind = "preview" | "redeem";
type RequestBucket = { count: number; resetAt: number };

const MAX_BUCKETS = 10_000;
const WINDOW_MS = 10 * 60 * 1000;

const limitFor = (kind: InviteRequestKind): number => {
  const name = kind === "preview" ? "INVITE_PREVIEW_RATE_LIMIT" : "INVITE_REDEEM_RATE_LIMIT";
  const fallback = kind === "preview" ? 120 : 20;
  const parsed = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(parsed) ? Math.min(1_000, Math.max(5, parsed)) : fallback;
};

@Injectable()
export class InviteRequestLimiterService {
  private readonly buckets = new Map<string, RequestBucket>();

  assertAllowed(kind: InviteRequestKind, ipAddress: string): void {
    const now = Date.now();
    const key = createHash("sha256")
      .update(`${kind}\n${ipAddress.trim()}`)
      .digest("hex");
    const current = this.buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + WINDOW_MS }
      : current;
    bucket.count += 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > MAX_BUCKETS) this.prune(now);
    if (bucket.count > limitFor(kind)) {
      throw new DomainError(
        "INVITE_RATE_LIMITED",
        "Too many invitation requests. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
        { retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
      );
    }
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    while (this.buckets.size > MAX_BUCKETS) {
      const oldest = this.buckets.keys().next().value as string | undefined;
      if (!oldest) break;
      this.buckets.delete(oldest);
    }
  }
}
