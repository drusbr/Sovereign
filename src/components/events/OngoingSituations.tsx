import { Globe, Landmark } from "lucide-react";
import type { WorldEvent } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";
import {
  SEVERITY_STYLES,
  formatCategoryLabel,
  turnsRemaining,
} from "@/lib/worldEvents";

function OngoingCard({
  event,
  currentTurn,
}: {
  event: WorldEvent;
  currentTurn: number;
}) {
  const severityStyle = SEVERITY_STYLES[event.severity];
  const remaining = turnsRemaining(event, currentTurn);
  const isInternational = event.type === "international";

  return (
    <div className="rounded-lg border border-border bg-panel/60 p-4">
      <div className="flex items-center gap-1.5">
        {isInternational ? (
          <Globe size={12} className="text-accent" />
        ) : (
          <Landmark size={12} className="text-text-muted" />
        )}
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${severityStyle.text} ${severityStyle.bg} ${severityStyle.border}`}
        >
          {severityStyle.label}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-text">{event.title}</h3>
      <p className="mt-0.5 text-[11px] text-text-muted">
        {event.location} · {formatCategoryLabel(event.category)}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        {event.description}
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-text-muted">Continues to develop</span>
        <span className="text-text-muted">{remaining}t remaining</span>
      </div>
    </div>
  );
}

export function OngoingSituations({
  events,
  currentTurn,
}: {
  events: WorldEvent[];
  currentTurn: number;
}) {
  if (events.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Ongoing Situations" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <OngoingCard key={event.id} event={event} currentTurn={currentTurn} />
        ))}
      </div>
    </div>
  );
}
