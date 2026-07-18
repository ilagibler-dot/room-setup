import { type InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`ui-input w-full px-0 py-2.5 text-sm ${className}`}
      {...props}
    />
  );
}
