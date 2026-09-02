import type { ScheduledDiplomaticEvent } from "@/lib/gameState";
import { EVENT_TYPE_LABELS, IMPORTANCE_STYLES } from "@/lib/diplomacy";
import { SectionHeader } from "@/components/SectionHeader";

export function DiplomaticCalendar({
  events,
  currentTurn,
}: {
  events: ScheduledDiplomaticEvent[];
  currentTurn: number;
}) {
  const sorted = [...events].sort((a, b) => a.dueTurn - b.dueTurn);

  return (
    <div>
      <SectionHeader title="Diplomatic Calendar" />
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel/40 p-6 text-center text-sm text-text-muted">
          No scheduled diplomatic events.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {sorted.map((event) => {
            const importance = IMPORTANCE_STYLES[event.importance];
            const remaining = event.dueTurn - currentTurn;
            const urgent = remaining <= 2;
            return (
              <div
                key={event.id}
                className={`w-72 shrink-0 rounded-lg border bg-panel/60 p-4 ${
                  urgent ? "border-l-2 border-l-danger border-border" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    {EVENT_TYPE_LABELS[event.type]}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${importance.text} ${importance.bg} ${importance.border}`}
                  >
                    {importance.label}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-text">{event.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {event.description}
                </p>
                <p
                  className={`mt-3 text-xs font-medium ${urgent ? "text-danger" : "text-text-muted"}`}
                >
                  Due Turn {event.dueTurn} ·{" "}
                  {remaining > 0 ? `${remaining} turns remaining` : "Due now"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
