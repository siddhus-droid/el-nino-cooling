import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cool-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const variants: Record<string, string> = {
    primary:
      "bg-cool-500 text-ground-950 hover:bg-cool-400 shadow-lg shadow-cool-500/10",
    secondary:
      "bg-ground-800 text-ground-100 hover:bg-ground-700 border border-ground-600",
    ghost: "bg-transparent text-ground-300 hover:bg-ground-800 hover:text-ground-50",
    danger: "bg-hot-600 text-white hover:bg-hot-500",
  };

  const sizes: Record<string, string> = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2.5",
    lg: "text-base px-6 py-3",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
