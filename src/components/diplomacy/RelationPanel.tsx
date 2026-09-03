"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { DiplomaticEvent, DiplomaticRelation } from "@/lib/gameState";
import {
  PRESSURE_CAPACITY_DESCRIPTIONS,
  RELATIONSHIP_STATUS_STYLES,
  RELATION_TYPE_LABELS,
  explainInterest,
} from "@/lib/diplomacy";
import { fmtScore } from "@/lib/format";

export function RelationPanel({
  relation,
  events,
  onClose,
  onAction,
}: {
  relation: DiplomaticRelation | null;
  events: DiplomaticEvent[];
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const isOpen = relation !== null;

  const [displayed, setDisplayed] = useState<DiplomaticRelation | null>(relation);
  const [prevRelation, setPrevRelation] = useState(relation);
  if (relation !== prevRelation) {
    setPrevRelation(relation);
    if (relation) setDisplayed(relation);
  }

  const statusStyle = displayed
    ? RELATIONSHIP_STATUS_STYLES[displayed.relationshipStatus]
    : null;
  const history = displayed
    ? events.filter((e) => e.relationshipAffected === displayed.name)
    : [];

  return (
    <div
      className={`fixed inset-0 z-40 ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-border bg-panel shadow-2xl transition-transform duration-300 ease-out sm:w-[440px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {displayed && statusStyle && (
          <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="text-4xl leading-none">{displayed.flagEmoji}</span>
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    {displayed.name}
                  </h2>
                  <span className="mt-0.5 inline-block rounded-full border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                    {RELATION_TYPE_LABELS[displayed.type]}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-text-muted transition hover:bg-panel-2 hover:text-text"
                aria-label="Close relationship detail"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-6 px-6 py-5">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyle.text} ${statusStyle.bg} ${statusStyle.border}`}
                >
                  {statusStyle.label}
                </span>
                <span className="text-sm font-semibold text-text">
                  {fmtScore(displayed.relationshipScore)}/100
                </span>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                  Current Status
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text">
                  Relations with {displayed.name} are currently{" "}
                  <span className={statusStyle.text}>{displayed.relationshipStatus}</span>{" "}
                  and {displayed.trend}. {displayed.recentInteraction} most recently
                  defined the tenor of engagement between the two governments.
                </p>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                  Their Interests
                </h3>
                <ul className="mt-2 space-y-2.5">
                  {displayed.primaryInterests.map((interest) => (
                    <li key={interest} className="text-sm">
                      <span className="font-medium capitalize text-text">
                        {interest}
                      </span>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                        {explainInterest(interest)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                  Pressure Capacity
                </h3>
                <div className="mt-2 flex items-start gap-2">
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      displayed.pressureCapacity === "high"
                        ? "border-danger/30 bg-danger/10 text-danger"
                        : displayed.pressureCapacity === "medium"
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                          : "border-border bg-panel-2 text-text-muted"
                    }`}
                  >
                    {displayed.pressureCapacity}
                  </span>
                  <p className="text-xs leading-relaxed text-text-muted">
                    {PRESSURE_CAPACITY_DESCRIPTIONS[displayed.pressureCapacity]}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                  Relationship History
                </h3>
                {history.length === 0 ? (
                  <p className="mt-2 text-xs text-text-muted">
                    No recorded diplomatic events with {displayed.name} yet.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {[...history].reverse().map((event, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border bg-panel-2/60 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-text-muted">
                            T{event.turn} · {event.date}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
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
                        <p className="mt-1 text-xs text-text-muted">
                          {event.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 space-y-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  onAction("Issue this through the Orders page to take diplomatic action.")
                }
                className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
              >
                Issue Diplomatic Statement
              </button>
              <button
                type="button"
                onClick={() =>
                  onAction("Issue this through the Orders page to take diplomatic action.")
                }
                className="w-full rounded-md border border-border bg-panel-2 px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent/50 hover:text-accent"
              >
                Request Bilateral Meeting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
