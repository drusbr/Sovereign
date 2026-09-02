"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/context/GameContext";
import { getAdvisorById } from "@/lib/advisors";

const ROCHA = getAdvisorById("rocha")!;

export function SpinRoom() {
  const { spinRoomAssessment, spinRoomLoading, spinRoomError, fetchSpinRoomAssessment } =
    useGame();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void fetchSpinRoomAssessment();
  }, [fetchSpinRoomAssessment]);

  return (
    <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
        Chief of Staff Assessment
      </p>

      <div className="mt-3 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ROCHA.avatarTextClass}`}
          style={{ backgroundColor: ROCHA.hex }}
        >
          {ROCHA.initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-text">{ROCHA.name}</p>
          <p className="text-xs text-text-muted">{ROCHA.title}</p>
        </div>
      </div>

      <div className="mt-3">
        {spinRoomLoading && (
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-full rounded bg-panel-2" />
            <div className="h-3 w-5/6 rounded bg-panel-2" />
            <div className="h-3 w-4/6 rounded bg-panel-2" />
          </div>
        )}

        {!spinRoomLoading && spinRoomError && (
          <p className="text-sm text-danger">{spinRoomError}</p>
        )}

        {!spinRoomLoading && !spinRoomError && spinRoomAssessment && (
          <p className="text-sm leading-relaxed text-text">
            {spinRoomAssessment.text}
          </p>
        )}
      </div>
    </div>
  );
}
