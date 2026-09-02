import type { DiplomaticEvent } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";

export function DiplomaticRecord({ events }: { events: DiplomaticEvent[] }) {
  const sorted = [...events].reverse();

  return (
    <div>
      <SectionHeader title="Diplomatic Record" />
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel/40 p-6 text-center text-sm text-text-muted">
          No significant diplomatic events recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((event, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel/40 p-3.5"
            >
              <div className="min-w-0">
                <span className="font-mono text-[11px] text-text-muted">
                  T{event.turn} · {event.date}
                </span>
                <p className="mt-0.5 text-sm text-text">{event.description}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Affected: {event.relationshipAffected}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold ${
                  event.scoreChange > 0
                    ? "text-positive"
                    : event.scoreChange < 0
                      ? "text-danger"
                      : "text-text-muted"
                }`}
              >
                {event.scoreChange > 0 ? "+" : ""}
                {event.scoreChange}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
