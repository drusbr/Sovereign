import type { AdvisorDefinition } from "@/lib/advisors";

export function AdvisorCard({
  advisor,
  preview,
  isUpToDate,
  onClick,
}: {
  advisor: AdvisorDefinition;
  preview: string;
  isUpToDate: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-3 rounded-lg border bg-panel/60 p-4 text-left transition hover:border-accent/50 hover:bg-panel-2/60 ${
        advisor.cardBorderClass ?? "border-border"
      }`}
    >
      <div className="flex w-full items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${advisor.avatarTextClass}`}
          style={{ backgroundColor: advisor.hex }}
        >
          {advisor.initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">
            {advisor.name}
          </p>
          <p className="truncate text-xs text-text-muted">{advisor.title}</p>
        </div>
      </div>

      {isUpToDate ? (
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-text-muted/60" />
          Up to date
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          New Briefing
        </span>
      )}

      <p className="line-clamp-1 text-xs leading-relaxed text-text-muted">
        {preview}
      </p>
    </button>
  );
}
