"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { WorldEvent } from "@/lib/gameState";
import { SectionHeader } from "@/components/SectionHeader";

const DEFAULT_SHOWN = 10;

function ArchiveRow({ event }: { event: WorldEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/60 py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown size={13} className="shrink-0 text-text-muted" />
          ) : (
            <ChevronRight size={13} className="shrink-0 text-text-muted" />
          )}
          <span className="truncate text-sm font-medium text-text">
            {event.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[11px] text-text-muted">
          <span>Turn {event.resolvedOnTurn ?? event.startTurn}</span>
          <span
            className={
              event.status === "expired"
                ? "font-semibold text-amber-400"
                : "font-semibold text-positive"
            }
          >
            {event.status === "expired" ? "Expired" : "Resolved"}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 pl-5 text-sm text-text-muted">
          <p>{event.description}</p>
          <p className="mt-1.5">
            <span className="font-semibold text-text">Response: </span>
            {event.playerResponse ?? "No response was given."}
          </p>
        </div>
      )}
    </div>
  );
}

export function EventArchive({ events }: { events: WorldEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => (b.resolvedOnTurn ?? b.startTurn) - (a.resolvedOnTurn ?? a.startTurn)
  );
  const shown = showAll ? sorted : sorted.slice(0, DEFAULT_SHOWN);

  return (
    <div>
      <SectionHeader
        title={`Event Archive (${events.length})`}
        action={
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="text-[11px] font-semibold text-accent hover:underline"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        }
      />
      {!collapsed && (
        <div className="rounded-lg border border-border bg-panel/40 px-4">
          {shown.map((event) => (
            <ArchiveRow key={event.id} event={event} />
          ))}
          {!showAll && sorted.length > DEFAULT_SHOWN && (
            <div className="py-3 text-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Show all {sorted.length}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
