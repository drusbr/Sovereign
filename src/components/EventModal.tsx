"use client";

import { useGame } from "@/context/GameContext";

export function EventModal() {
  const { activeEvent, isResolvingEvent, eventError, resolveEvent } = useGame();

  if (!activeEvent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-lg border border-border bg-panel shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-danger">
            Urgent — Decision Required
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-text">
            {activeEvent.title}
          </h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-text-muted">
            {activeEvent.description}
          </p>

          {eventError && (
            <p className="mt-3 text-sm text-danger">{eventError}</p>
          )}

          <div className="mt-5 flex flex-col gap-2.5">
            {activeEvent.options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={isResolvingEvent}
                onClick={() => resolveEvent(option.id)}
                className="rounded-md border border-border bg-panel-2 px-4 py-3 text-left text-sm text-text transition hover:border-accent hover:bg-panel-2/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {option.label}
              </button>
            ))}
          </div>

          {isResolvingEvent && (
            <p className="mt-4 animate-pulse text-xs text-text-muted">
              Weighing the consequences…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
