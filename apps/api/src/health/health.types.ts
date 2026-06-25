export type ApiEnvelope<TData> = {
  data: TData;
  meta?: Record<string, unknown>;
};

export type HealthPayload = {
  status: "ok";
  service: string;
  timestamp: string;
  version: string;
};
