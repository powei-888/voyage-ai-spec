"use client";

import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  pendingLabel = "處理中…",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button {...props} disabled={pending || props.disabled}>
      {pending ? <LoaderCircle className="spin" size={16} /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
