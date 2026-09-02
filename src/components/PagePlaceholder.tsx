import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-panel">
        <Icon size={24} className="text-accent" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-text">{title}</h1>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Coming Soon
      </p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-text-muted">
        {description}
      </p>
    </div>
  );
}
