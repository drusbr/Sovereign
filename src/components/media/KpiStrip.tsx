import { Globe2 } from "lucide-react";
import type { GameState } from "@/lib/gameState";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { fmtPct, fmtScore } from "@/lib/format";

function sentimentColor(value: number): string {
  if (value > 60) return "#10b981";
  if (value >= 40) return "#f59e0b";
  return "#ef4444";
}

function internationalColor(value: number): string {
  if (value > 50) return "#10b981";
  if (value >= 25) return "#f59e0b";
  return "#64748b";
}

export function KpiStrip({ gameState }: { gameState: GameState }) {
  const pendingCount = gameState.pendingInterviews.filter(
    (i) => i.accepted === null
  ).length;
  const hasUrgentDeadline = gameState.pendingInterviews.some(
    (i) =>
      i.accepted === null &&
      i.deadline - gameState.turn <= 2 &&
      i.deadline >= gameState.turn
  );

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="text-[11px] uppercase tracking-widest text-text-muted">
          Press Sentiment
        </p>
        <p
          className="mt-1.5 text-2xl font-bold"
          style={{ color: sentimentColor(gameState.mediaSentiment) }}
        >
          {fmtPct(gameState.mediaSentiment)}
        </p>
        <p className="mt-1 text-xs text-text-muted">of coverage is favourable</p>
      </div>

      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="text-[11px] uppercase tracking-widest text-text-muted">
          Coverage Index
        </p>
        <p className="mt-1.5 text-2xl font-bold text-text">
          {fmtScore(gameState.pressCoverage)}
          <span className="text-sm font-normal text-text-muted">/100</span>
        </p>
        <div className="mt-2">
          <ProgressBar value={gameState.pressCoverage} color="#3b82f6" />
        </div>
        <p className="mt-1.5 text-xs text-text-muted">national media presence</p>
      </div>

      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="text-[11px] uppercase tracking-widest text-text-muted">
          Dominant Narrative
        </p>
        <span className="mt-2 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          {gameState.dominantNarrative}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-text-muted">
          <Globe2 size={12} />
          International Attention
        </p>
        <p
          className="mt-1.5 text-2xl font-bold"
          style={{ color: internationalColor(gameState.internationalCoverage) }}
        >
          {fmtPct(gameState.internationalCoverage)}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-text-muted">
          Pending Requests
          {hasUrgentDeadline && (
            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          )}
        </p>
        <p className="mt-1.5 text-2xl font-bold text-text">{pendingCount}</p>
      </div>
    </div>
  );
}
