export type ApiEnvelope<TData> = {
  data: TData;
  meta: Record<string, unknown>;
};

export function ok<TData>(
  data: TData,
  meta: Record<string, unknown> = {}
): ApiEnvelope<TData> {
  return { data, meta };
}
