import type { GameState } from "@/lib/gameState";
import {
  creditRatingStyle,
  publicInvestmentColor,
  sovereignDebtColor,
} from "@/lib/economy";

const INFLATION_TARGET = 3;

function genericThresholdColor(value: number): string {
  if (value >= 60) return "#10b981";
  if (value >= 40) return "#f59e0b";
  return "#ef4444";
}

function ScorecardRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-b-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="flex items-center gap-2 text-sm font-semibold text-text">
        {value}
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      </span>
    </div>
  );
}

export function HealthScorecard({ gameState }: { gameState: GameState }) {
  const ratingStyle = creditRatingStyle(gameState.creditRating);
  const inflationGap = gameState.inflation - INFLATION_TARGET;

  return (
    <div className="rounded-lg border border-border bg-panel/60 px-4">
      <ScorecardRow
        label="Sovereign Debt"
        value={`${gameState.sovereignDebt}% of GDP`}
        color={sovereignDebtColor(gameState.sovereignDebt)}
      />
      <ScorecardRow
        label="Public Investment"
        value={`${gameState.publicInvestment}% of GDP`}
        color={publicInvestmentColor(gameState.publicInvestment)}
      />
      <ScorecardRow
        label="Credit Rating"
        value={gameState.creditRating}
        color={
          ratingStyle.text === "text-positive"
            ? "#10b981"
            : ratingStyle.text === "text-amber-400"
              ? "#f59e0b"
              : "#ef4444"
        }
      />
      <ScorecardRow
        label="Inflation vs Target"
        value={`${gameState.inflation}% vs ${INFLATION_TARGET}% (${inflationGap > 0 ? "+" : ""}${inflationGap.toFixed(1)}pp)`}
        color={inflationGap > 2 ? "#ef4444" : inflationGap > 0 ? "#f59e0b" : "#10b981"}
      />
      <ScorecardRow
        label="Congressional Support (economic reforms)"
        value={`${gameState.congressionalSupport}%`}
        color={genericThresholdColor(gameState.congressionalSupport)}
      />
      <ScorecardRow
        label="Business Environment Index"
        value={`${gameState.civilLiberties}%`}
        color={genericThresholdColor(gameState.civilLiberties)}
      />
    </div>
  );
}
