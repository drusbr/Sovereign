"use client";

import { useState } from "react";
import type { IntelligenceEvent } from "@/lib/gameState";
import { INTEL_CATEGORY_STYLES, SEVERITY_DOT_COLORS } from "@/lib/intelligence";
import { SectionHeader } from "@/components/SectionHeader";

const VISIBLE_CAP = 15;

export function IntelligenceLog({
  events,
  title = "Recent Intelligence",
  emptyMessage = "No significant intelligence events recorded",
}: {
  events: IntelligenceEvent[];
  title?: string;
  emptyMessage?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  // Push order is chronological (oldest first) — show most recent first.
  const sorted = [...events].reverse();
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_CAP);

  return (
    <div>
      <SectionHeader title={title} />
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel/40 p-6 text-center text-sm text-text-muted">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((event, i) => {
              const catStyle = INTEL_CATEGORY_STYLES[event.category];
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-panel/40 p-3.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: SEVERITY_DOT_COLORS[event.severity] }}
                    />
                    <span className="font-mono text-[11px] text-text-muted">
                      T{event.turn} · {event.date}
                    </span>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${catStyle.text} ${catStyle.bg} ${catStyle.border}`}
                    >
                      {catStyle.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-text">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{event.summary}</p>
                </div>
              );
            })}
          </div>

          {sorted.length > VISIBLE_CAP && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-3 w-full rounded-md border border-border bg-panel-2 py-2 text-xs font-semibold text-text-muted transition hover:text-text"
            >
              {expanded ? "Show Less" : `View Full Archive (${sorted.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
