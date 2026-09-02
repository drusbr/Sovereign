"use client";

import { useState } from "react";
import { X, MessageCircle } from "lucide-react";
import type { AdvisorDefinition } from "@/lib/advisors";
import type { AdvisorBriefing } from "@/context/GameContext";
import { useGame } from "@/context/GameContext";
import { AdvisorMeeting } from "@/components/advisors/AdvisorMeeting";

export function AdvisorPanel({
  advisor,
  briefing,
  isLoading,
  error,
  date,
  onClose,
}: {
  advisor: AdvisorDefinition | null;
  briefing: AdvisorBriefing | undefined;
  isLoading: boolean;
  error: string | undefined;
  date: string;
  onClose: () => void;
}) {
  const { gameState, spendActionPoints } = useGame();
  const isOpen = advisor !== null;

  // Keep rendering the last advisor's content while the panel slides shut,
  // instead of popping empty the instant `advisor` goes null. Adjusted
  // during render (React's recommended pattern) rather than in an effect.
  const [displayed, setDisplayed] = useState<AdvisorDefinition | null>(advisor);
  const [prevAdvisor, setPrevAdvisor] = useState(advisor);
  const [meetingActive, setMeetingActive] = useState(false);
  if (advisor !== prevAdvisor) {
    setPrevAdvisor(advisor);
    if (advisor) {
      setDisplayed(advisor);
      setMeetingActive(false); // switching advisors always drops any in-progress meeting view
    }
  }

  function handleRequestMeeting() {
    if (spendActionPoints(1)) {
      setMeetingActive(true);
    }
  }

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
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-border bg-panel shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* CONFIDENTIAL watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="-rotate-[24deg] select-none whitespace-nowrap text-[110px] font-black uppercase tracking-widest text-text opacity-[0.03]">
            Confidential
          </span>
        </div>

        {displayed && (
          <div className="relative flex h-full flex-col overflow-hidden">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold ${displayed.avatarTextClass}`}
                  style={{ backgroundColor: displayed.hex }}
                >
                  {displayed.initials}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    {displayed.name}
                  </h2>
                  <p className="text-xs text-text-muted">{displayed.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-text-muted transition hover:bg-panel-2 hover:text-text"
                aria-label="Close briefing"
              >
                <X size={18} />
              </button>
            </div>

            {meetingActive ? (
              <div className="min-h-0 flex-1">
                <AdvisorMeeting
                  key={displayed.id}
                  advisor={displayed}
                  onEndMeeting={() => setMeetingActive(false)}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-sm bg-danger/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-danger">
                    CLASSIFIED
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                    Briefing — {date}
                  </span>
                </div>

                {isLoading && (
                  <div className="animate-pulse space-y-3">
                    <p className="font-mono text-xs text-text-muted">
                      Preparing briefing…
                    </p>
                    <div className="h-3 w-5/6 rounded bg-panel-2" />
                    <div className="h-3 w-full rounded bg-panel-2" />
                    <div className="h-3 w-4/6 rounded bg-panel-2" />
                    <div className="h-3 w-full rounded bg-panel-2" />
                    <div className="h-3 w-3/6 rounded bg-panel-2" />
                  </div>
                )}

                {!isLoading && error && (
                  <p className="text-sm text-danger">{error}</p>
                )}

                {!isLoading && !error && briefing && (
                  <>
                    <div className="space-y-4 font-mono text-[13px] leading-relaxed text-text">
                      {briefing.report.split("\n\n").map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>

                    <div className="mt-6 rounded-lg border border-accent/30 bg-accent/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                        Key Recommendation
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-text">
                        {briefing.recommendation}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRequestMeeting}
                      disabled={gameState.actionPoints < 1}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-panel-2 px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <MessageCircle size={15} />
                      Request Meeting
                      <span className="text-xs font-normal text-text-muted">
                        (-1 AP)
                      </span>
                    </button>
                    {gameState.actionPoints < 1 && (
                      <p className="mt-2 text-center text-xs text-text-muted">
                        No action points remaining this turn.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
