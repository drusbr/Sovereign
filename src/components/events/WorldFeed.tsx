import { Globe, Landmark } from "lucide-react";
import type { WorldEvent } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";

function FeedItem({ event }: { event: WorldEvent }) {
  const isInternational = event.type === "international";
  const isRelevant = Boolean(event.brazilImpact) || !isInternational;

  return (
    <div className="flex items-start gap-3 border-b border-border/60 py-3 last:border-b-0">
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          isRelevant ? "bg-accent" : "bg-text-muted/40"
        }`}
        title={isRelevant ? "Relevant to Brazil" : "Low relevance to Brazil"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          {isInternational ? <Globe size={10} /> : <Landmark size={10} />}
          {isInternational ? "International" : "Domestic"}
          <span className="text-text-muted/60">·</span>
          <span>{event.location}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-text">{event.title}</p>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {event.description}
        </p>
      </div>
    </div>
  );
}

export function WorldFeed({ events }: { events: WorldEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div>
      <SectionHeader title="World Feed" />
      <div className="rounded-lg border border-border bg-panel/40 px-4">
        {[...events].reverse().map((event) => (
          <FeedItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
