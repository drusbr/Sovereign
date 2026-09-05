import { Building2, CalendarClock, Target } from "lucide-react";
import type { GameState } from "@/lib/gameState";
import { formatCopomDecision } from "@/lib/economy/monetaryPolicy";

export function CopomPanel({ gameState }: { gameState: GameState }) {
  const policy = gameState.monetaryPolicy;
  const latest = policy.decisionHistory.at(-1);
  const communication = latest ? formatCopomDecision(latest) : null;
  const stanceTone = policy.stanceClassification === "RESTRICTIVE"
    ? "text-amber-300" : policy.stanceClassification === "ACCOMMODATIVE"
      ? "text-positive" : "text-text-muted";

  return (
    <div className="grid grid-cols-1 border-y border-border bg-panel/35 lg:grid-cols-[1fr_1.5fr]">
      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-1">
        <div className="bg-[#0d1422] p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            <Building2 size={14} /> Selic target
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-light tabular-nums text-text">{policy.currentSelic.toFixed(2)}%</span>
            <span className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${stanceTone}`}>
              {policy.stanceClassification}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">{policy.monetaryStance >= 0 ? "+" : ""}{policy.monetaryStance.toFixed(2)} pp from calibrated neutral</p>
        </div>
        <div className="bg-[#0d1422] p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            <Target size={14} /> Inflation target
          </div>
          <p className="mt-2 text-2xl font-light tabular-nums text-text">{policy.inflationTarget.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-text-muted">Tolerance ±{policy.toleranceBand.toFixed(1)} pp</p>
        </div>
      </div>

      <div className="p-5 lg:border-l lg:border-border">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-400">Latest COPOM decision</p>
            <h3 className="mt-2 text-lg font-medium text-text">
              {communication?.headline ?? "No meeting held this campaign"}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <CalendarClock size={14} className="text-blue-400" />
            Next meeting: <span className="text-text">{policy.nextMeetingDate}</span>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-muted">
          {communication?.body ?? "COPOM will assess inflation, underlying price pressure and economic slack at its next scheduled meeting. The Presidency cannot set the policy rate."}
        </p>
        {latest && (
          <p className="mt-3 border-l border-blue-500/60 pl-3 text-xs text-text-muted">
            Decision recorded Turn {latest.turn} · {latest.date}
          </p>
        )}
      </div>
    </div>
  );
}
