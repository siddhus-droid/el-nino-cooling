import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Card({
  children,
  className = "",
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <Component className={`card-surface rounded-xl ${className}`}>
      {children}
    </Component>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-1">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 shrink-0 rounded-lg bg-ground-800 p-2 text-cool-500">
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
        <div>
          <h3 className="font-display font-semibold text-ground-50 text-base leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-ground-400 text-sm mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  accent = "cool",
  loading = false,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  icon?: LucideIcon;
  accent?: "cool" | "hot" | "amber" | "neutral";
  loading?: boolean;
}) {
  const accentClass: Record<string, string> = {
    cool: "text-cool-500",
    hot: "text-hot-500",
    amber: "text-amber-500",
    neutral: "text-ground-200",
  };

  return (
    <Card className="p-4 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-ground-400 text-xs font-medium uppercase tracking-wide truncate">
          {label}
        </span>
        {Icon && <Icon size={15} className={accentClass[accent]} strokeWidth={2} />}
      </div>
      {loading ? (
        <div className="h-7 w-20 rounded bg-ground-800 animate-pulse" />
      ) : (
        <div className="flex items-baseline gap-1 min-w-0">
          <span
            className={`font-mono-data text-2xl font-semibold tabular-nums truncate ${
              value === null ? "text-ground-500" : "text-ground-50"
            }`}
          >
            {value === null ? "—" : value}
          </span>
          {suffix && value !== null && (
            <span className="text-ground-400 text-sm">{suffix}</span>
          )}
        </div>
      )}
    </Card>
  );
}
