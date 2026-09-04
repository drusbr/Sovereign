"use client";

import { useMemo, useState } from "react";
import { Newspaper } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { RequiresAttention } from "@/components/events/RequiresAttention";
import { OngoingSituations } from "@/components/events/OngoingSituations";
import { WorldFeed } from "@/components/events/WorldFeed";
import { EventArchive } from "@/components/events/EventArchive";
import {
  isOngoingSituation,
  isWorldFeedItem,
  requiresAttention,
} from "@/lib/worldEvents";
import { PageHeader } from "@/components/PageHeader";

type TypeFilter = "all" | "domestic" | "international";

export default function EventsPage() {
  const {
    gameState,
    respondToWorldEvent,
    respondingWorldEventId,
    worldEventResponseError,
  } = useGame();
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<{
    title: string;
    text: string;
  } | null>(null);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return gameState.worldEvents;
    return gameState.worldEvents.filter((e) => e.type === filter);
  }, [gameState.worldEvents, filter]);

  const attentionEvents = filteredEvents.filter((event) =>
    requiresAttention(event, gameState.turn)
  );
  const ongoingEvents = filteredEvents.filter((event) =>
    isOngoingSituation(event, gameState.turn)
  );
  const feedEvents = filteredEvents.filter((event) =>
    isWorldFeedItem(event, gameState.turn)
  );

  const isEmpty =
    attentionEvents.length === 0 &&
    ongoingEvents.length === 0 &&
    feedEvents.length === 0;

  async function handleRespond(eventId: string, optionId: string) {
    const event = gameState.worldEvents.find((e) => e.id === eventId);
    const result = await respondToWorldEvent(eventId, optionId);
    if (result) {
      setNarrative({ title: event?.title ?? "Response Recorded", text: result });
      setToast("Response recorded. Consequences will unfold over coming turns.");
      setTimeout(() => setToast(null), 5000);
    }
  }

  return (
    <div className="sovereign-page space-y-7">
      <PageHeader eyebrow="World / Developments" title="World Events" description="Domestic developments and external events requiring presidential awareness." actions={<div className="flex items-center gap-1 border border-border bg-panel-2 p-1">
          {(["all", "domestic", "international"] as TypeFilter[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === opt
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>} />

      {worldEventResponseError && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {worldEventResponseError}
        </div>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-panel/40 py-16 text-center">
          <Newspaper size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">
            The world is quiet today, Mr. President.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <RequiresAttention
            events={attentionEvents}
            currentTurn={gameState.turn}
            actionPoints={gameState.actionPoints}
            respondingWorldEventId={respondingWorldEventId}
            onRespond={handleRespond}
          />
          <OngoingSituations events={ongoingEvents} currentTurn={gameState.turn} />
          <WorldFeed events={feedEvents} />
        </div>
      )}

      <EventArchive events={gameState.resolvedWorldEvents} />

      {narrative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-lg border border-accent/30 bg-panel p-5 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
              {narrative.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text">
              {narrative.text}
            </p>
            <button
              type="button"
              onClick={() => setNarrative(null)}
              className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-lg border border-accent/30 bg-panel px-4 py-3 text-sm text-text shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
