import type { ApiEnvelope, HealthStatus } from "@voyage/shared";

export function GET() {
  const payload: ApiEnvelope<HealthStatus> = {
    data: {
      status: "ok",
      service: "voyage-web",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0"
    },
    meta: {}
  };

  return Response.json(payload);
}
