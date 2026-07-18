import { type TextareaHTMLAttributes } from "react";

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`ui-input w-full px-0 py-2.5 text-sm ${className}`}
      {...props}
    />
  );
}
