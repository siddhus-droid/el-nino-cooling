import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <p className="text-cool-500 text-xs font-semibold uppercase tracking-wider mb-1.5 font-mono-data">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold text-ground-50">{title}</h2>
        {description && (
          <p className="text-ground-400 text-sm mt-1.5 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
