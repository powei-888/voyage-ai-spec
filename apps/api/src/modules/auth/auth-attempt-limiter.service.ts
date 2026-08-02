import { HttpStatus, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { DomainError } from "../../common/domain-error";

type AttemptState = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number | null;
};

const MAX_TRACKED_ATTEMPTS = 10_000;

const integerEnv = (name: string, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

@Injectable()
export class AuthAttemptLimiterService {
  private readonly attempts = new Map<string, AttemptState>();
  private readonly maxFailures = integerEnv("AUTH_MAX_LOGIN_FAILURES", 5, 3, 20);
  private readonly windowMs = integerEnv("AUTH_LOGIN_WINDOW_MS", 900_000, 60_000, 3_600_000);
  private readonly blockMs = integerEnv("AUTH_LOGIN_BLOCK_MS", 900_000, 60_000, 86_400_000);

  assertAllowed(ipAddress: string, email: string): void {
    const key = this.key(ipAddress, email);
    const state = this.attempts.get(key);
    if (!state) return;
    const now = Date.now();
    if (state.blockedUntil && state.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((state.blockedUntil - now) / 1000);
      throw new DomainError(
        "LOGIN_RATE_LIMITED",
        "Too many failed sign-in attempts. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
        { retryAfterSeconds }
      );
    }
    if (state.blockedUntil || now - state.windowStartedAt > this.windowMs) {
      this.attempts.delete(key);
    }
  }

  recordFailure(ipAddress: string, email: string): void {
    const key = this.key(ipAddress, email);
    const now = Date.now();
    const current = this.attempts.get(key);
    const state = !current || now - current.windowStartedAt > this.windowMs
      ? { failures: 0, windowStartedAt: now, blockedUntil: null }
      : current;
    state.failures += 1;
    if (state.failures >= this.maxFailures) state.blockedUntil = now + this.blockMs;
    this.attempts.set(key, state);
    if (this.attempts.size > MAX_TRACKED_ATTEMPTS) this.prune(now);
  }

  reset(ipAddress: string, email: string): void {
    this.attempts.delete(this.key(ipAddress, email));
  }

  private key(ipAddress: string, email: string): string {
    return createHash("sha256")
      .update(`${ipAddress.trim()}\n${email.trim().toLowerCase()}`)
      .digest("hex");
  }

  private prune(now: number): void {
    for (const [key, state] of this.attempts) {
      const expiredBlock = state.blockedUntil !== null && state.blockedUntil <= now;
      const expiredWindow = now - state.windowStartedAt > this.windowMs;
      if (expiredBlock || expiredWindow) this.attempts.delete(key);
    }
    while (this.attempts.size > MAX_TRACKED_ATTEMPTS) {
      const oldest = this.attempts.keys().next().value as string | undefined;
      if (!oldest) break;
      this.attempts.delete(oldest);
    }
  }
}
