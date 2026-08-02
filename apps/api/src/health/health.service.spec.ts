import { HealthService } from "./health.service";
import { PrismaService } from "../infra/database/prisma.service";

describe("HealthService", () => {
  it("returns an ok health payload", () => {
    const service = new HealthService({} as PrismaService);
    const result = service.getHealth();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("voyage-api");
    expect(result.version).toBeDefined();
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("reports database, storage, and receipt queue readiness", async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ result: 1 }]),
      receipt: { count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1).mockResolvedValueOnce(3) }
    };
    const service = new HealthService(prisma as unknown as PrismaService);

    const result = await service.getReadiness();

    expect(result.status).toBe("ok");
    expect(result.checks.database.status).toBe("ok");
    expect(result.checks.storage.status).toBe("ok");
    expect(result.checks.receiptQueue).toEqual({
      status: "ok",
      queued: 2,
      processing: 1,
      failed: 3
    });
  });

  it("returns degraded readiness when PostgreSQL is unavailable", async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockRejectedValue(new Error("offline")),
      receipt: { count: jest.fn().mockRejectedValue(new Error("offline")) }
    };
    const service = new HealthService(prisma as unknown as PrismaService);

    const result = await service.getReadiness();

    expect(result.status).toBe("degraded");
    expect(result.checks.database.status).toBe("error");
    expect(result.checks.receiptQueue.status).toBe("error");
  });
});
