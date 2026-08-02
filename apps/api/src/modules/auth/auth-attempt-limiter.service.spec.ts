import { AuthAttemptLimiterService } from "./auth-attempt-limiter.service";

describe("AuthAttemptLimiterService", () => {
  const originalMax = process.env.AUTH_MAX_LOGIN_FAILURES;

  beforeEach(() => {
    process.env.AUTH_MAX_LOGIN_FAILURES = "3";
  });

  afterAll(() => {
    if (originalMax === undefined) delete process.env.AUTH_MAX_LOGIN_FAILURES;
    else process.env.AUTH_MAX_LOGIN_FAILURES = originalMax;
  });

  it("blocks an IP and email pair after repeated failures", () => {
    const limiter = new AuthAttemptLimiterService();
    for (let index = 0; index < 3; index += 1) {
      limiter.recordFailure("192.168.200.10", "user@example.com");
    }

    expect(() => limiter.assertAllowed("192.168.200.10", "user@example.com")).toThrow(
      expect.objectContaining({ code: "LOGIN_RATE_LIMITED", status: 429 })
    );
    expect(() => limiter.assertAllowed("192.168.200.11", "user@example.com")).not.toThrow();
  });

  it("clears failures after a successful login", () => {
    const limiter = new AuthAttemptLimiterService();
    limiter.recordFailure("192.168.200.10", "user@example.com");
    limiter.reset("192.168.200.10", "user@example.com");

    expect(() => limiter.assertAllowed("192.168.200.10", "user@example.com")).not.toThrow();
  });
});
