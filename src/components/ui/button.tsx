import { type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const variants = {
  primary:
    "border border-transparent bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[0_10px_24px_rgba(0,0,0,0.14)]",
  secondary:
    "border border-[var(--line-strong)] bg-transparent text-[var(--foreground)] hover:bg-white/40",
  danger:
    "border border-transparent bg-[var(--highlight)] text-white hover:bg-[#c62828] shadow-[0_10px_24px_rgba(229,57,53,0.2)]",
  ghost:
    "border border-transparent text-[var(--foreground-muted)] hover:bg-white/35 hover:text-[var(--foreground)]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-[0.35rem] px-4 py-2.5 text-sm font-medium tracking-[0.02em] transition active:scale-[0.99] disabled:opacity-45 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
