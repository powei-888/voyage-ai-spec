import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Notice({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null;
  const isError = Boolean(error);

  return (
    <div className={`notice ${isError ? "notice-error" : "notice-success"}`} role="status">
      {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{error || notice}</span>
    </div>
  );
}
