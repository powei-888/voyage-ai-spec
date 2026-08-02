export type ApiEnvelope<TData> = {
  data: TData;
  meta?: Record<string, unknown>;
};

export type HealthPayload = {
  status: "ok";
  service: string;
  timestamp: string;
  version: string;
  providers: {
    ai: string;
    ocr: string;
    model: string;
  };
};

export type ReadinessPayload = {
  status: "ok" | "degraded";
  service: string;
  timestamp: string;
  checks: {
    database: { status: "ok" | "error"; latencyMs: number };
    storage: {
      status: "ok" | "error";
      freeBytes: number | null;
      minimumFreeBytes: number;
    };
    receiptQueue: {
      status: "ok" | "error";
      queued: number;
      processing: number;
      failed: number;
    };
  };
};
