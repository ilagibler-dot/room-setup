import { type LabelHTMLAttributes } from "react";

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1 block text-xs font-semibold text-[var(--foreground-muted)] ${className}`}
      {...props}
    />
  );
}
