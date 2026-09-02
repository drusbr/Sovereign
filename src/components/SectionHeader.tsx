import type { ReactNode } from "react";

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 border-l-2 border-accent pl-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {title}
      </h2>
      {action}
    </div>
  );
}
