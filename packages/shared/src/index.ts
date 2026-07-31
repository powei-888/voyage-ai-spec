export const VOYAGE_APP_NAME = "Voyage AI" as const;

export type ApiEnvelope<TData> = {
  data: TData;
  meta?: Record<string, unknown>;
};

export type HealthStatus = {
  status: "ok";
  service: string;
  timestamp: string;
  version: string;
};
