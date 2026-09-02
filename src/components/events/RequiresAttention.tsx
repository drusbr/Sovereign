import { Globe, Landmark } from "lucide-react";
import type { WorldEvent } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";
import {
  SEVERITY_STYLES,
  formatCategoryLabel,
  turnsRemaining,
} from "@/lib/worldEvents";

function EventCard({
  event,
  currentTurn,
  actionPoints,
  isResponding,
  onRespond,
}: {
  event: WorldEvent;
  currentTurn: number;
  actionPoints: number;
  isResponding: boolean;
  onRespond: (eventId: string, optionId: string) => void;
}) {
  const severityStyle = SEVERITY_STYLES[event.severity];
  const remaining = turnsRemaining(event, currentTurn);
  const isInternational = event.type === "international";

  return (
    <div
      className={`rounded-lg border p-5 ${
        isInternational
          ? "border-accent/40 bg-panel-2/60"
          : "border-danger/40 bg-danger/[0.06]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isInternational
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-panel-2 text-text-muted"
            }`}
          >
            {isInternational ? <Globe size={11} /> : <Landmark size={11} />}
            {isInternational ? "International" : "Domestic"}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${severityStyle.text} ${severityStyle.bg} ${severityStyle.border}`}
          >
            {severityStyle.label}
          </span>
        </div>
        <span
          className={`text-[11px] font-semibold ${
            remaining <= 1 ? "text-danger" : "text-text-muted"
          }`}
        >
          Expires in {remaining} turn{remaining === 1 ? "" : "s"}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-text">{event.title}</h3>
      <p className="mt-0.5 text-xs text-text-muted">
        {event.location} · {formatCategoryLabel(event.category)}
      </p>

      <p className="mt-3 text-sm leading-relaxed text-text">
        {event.description}
      </p>
      {event.context && (
        <p className="mt-2 text-sm italic leading-relaxed text-text-muted">
          {event.context}
        </p>
      )}

      {isInternational && event.brazilImpact && (
        <div className="mt-3 rounded-md border border-accent/30 bg-accent/[0.08] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
            Impact on Brazil
          </p>
          <p className="mt-1 text-sm text-text">
            {event.brazilImpact.description}
          </p>
          {event.brazilImpact.affectedAreas.length > 0 && (
            <p className="mt-1.5 text-xs text-text-muted">
              Affected: {event.brazilImpact.affectedAreas.join(", ")}
            </p>
          )}
          <p className="mt-1.5 text-xs text-text-muted">
            Suggested response: {event.brazilImpact.suggestedResponse}
          </p>
        </div>
      )}

      {event.responseOptions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Choose a Response
          </p>
          {event.responseOptions.map((option) => {
            const disabled =
              isResponding || actionPoints < option.requiresActionPoints;
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onRespond(event.id, option.id)}
                className="w-full rounded-md border border-border bg-panel px-3 py-2.5 text-left transition hover:border-accent/50 hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text">
                    {option.label}
                  </span>
                  <span className="shrink-0 rounded-full border border-border bg-panel-2 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                    {option.requiresActionPoints} AP
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RequiresAttention({
  events,
  currentTurn,
  actionPoints,
  respondingWorldEventId,
  onRespond,
}: {
  events: WorldEvent[];
  currentTurn: number;
  actionPoints: number;
  respondingWorldEventId: string | null;
  onRespond: (eventId: string, optionId: string) => void;
}) {
  if (events.length === 0) return null;

  return (
    <div>
      <SectionHeader
        title={`Requires Attention (${events.length})`}
        action={
          <span className="text-[10px] font-semibold uppercase tracking-wider text-danger">
            Presidential Response Needed
          </span>
        }
      />
      <div className="space-y-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            currentTurn={currentTurn}
            actionPoints={actionPoints}
            isResponding={respondingWorldEventId === event.id}
            onRespond={onRespond}
          />
        ))}
      </div>
    </div>
  );
}
