import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns an ok health payload", () => {
    const service = new HealthService();
    const result = service.getHealth();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("voyage-api");
    expect(result.version).toBeDefined();
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
  });
});
