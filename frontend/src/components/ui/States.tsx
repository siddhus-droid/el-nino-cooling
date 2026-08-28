import type { ReactNode } from "react";
import { AlertTriangle, Inbox, WifiOff } from "lucide-react";
import { Button } from "./Button";
import type { NormalizedApiError } from "../../api/types";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="rounded-full bg-ground-800 p-3.5 mb-4">
        <Icon size={22} className="text-ground-400" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-ground-100 font-semibold text-base mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-ground-400 text-sm max-w-sm leading-relaxed mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: NormalizedApiError;
  onRetry?: () => void;
}) {
  const Icon = error.isNetworkError ? WifiOff : AlertTriangle;
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="rounded-full bg-hot-500/10 p-3.5 mb-4">
        <Icon size={22} className="text-hot-500" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-ground-100 font-semibold text-base mb-1">
        {error.isNetworkError ? "Backend unreachable" : "Something went wrong"}
      </h3>
      <p className="text-ground-400 text-sm max-w-md leading-relaxed mb-4">
        {error.message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-ground-800 rounded animate-pulse ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card-surface rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card-surface rounded-xl p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
