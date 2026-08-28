import type { ReactNode } from "react";

const RISK_STYLES: Record<string, string> = {
  "Low Cooling Demand": "bg-cool-500/15 text-cool-400 ring-1 ring-cool-500/30",
  "Moderate Cooling Demand": "bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30",
  "High Cooling Demand": "bg-hot-500/15 text-hot-400 ring-1 ring-hot-500/30",
  "Extreme Cooling Demand": "bg-hot-600/20 text-hot-500 ring-1 ring-hot-600/40",
};

export function RiskBadge({ level }: { level: string }) {
  const style =
    RISK_STYLES[level] ?? "bg-ground-700 text-ground-200 ring-1 ring-ground-600";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${style}`}
    >
      {level}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ground-700 text-ground-200",
    success: "bg-cool-500/15 text-cool-400",
    warning: "bg-amber-500/15 text-amber-500",
    danger: "bg-hot-500/15 text-hot-400",
    info: "bg-ground-700 text-ground-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
