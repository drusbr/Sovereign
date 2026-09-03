import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type { GameState } from "@/lib/gameState";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import {
  globalStandingColor,
  internationalPressureColor,
  recentGlobalStandingTrend,
} from "@/lib/diplomacy";
import { fmtInt, fmtScore } from "@/lib/format";

export function KpiStrip({ gameState }: { gameState: GameState }) {
  const trend = recentGlobalStandingTrend(gameState.diplomaticEvents, gameState.turn);
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : ArrowRight;
  const trendColor =
    trend === "up" ? "text-positive" : trend === "down" ? "text-danger" : "text-text-muted";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="text-[11px] uppercase tracking-widest text-text-muted">
          Global Standing
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <p
            className="text-2xl font-bold"
            style={{ color: globalStandingColor(gameState.globalStanding) }}
          >
            {fmtScore(gameState.globalStanding)}
          </p>
          <TrendIcon size={14} className={trendColor} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="text-[11px] uppercase tracking-widest text-text-muted">
          Active Negotiations
        </p>
        <p className="mt-1.5 text-2xl font-bold text-text">
          {fmtInt(gameState.activeNegotiations)}
        </p>
        <p className="mt-1 text-xs text-text-muted">ongoing diplomatic processes</p>
      </div>

      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="text-[11px] uppercase tracking-widest text-text-muted">
          International Pressure
        </p>
        <p
          className="mt-1.5 text-2xl font-bold"
          style={{ color: internationalPressureColor(gameState.internationalPressure) }}
        >
          {fmtScore(gameState.internationalPressure)}
        </p>
        <p className="mt-1 text-xs text-text-muted">external pressure index</p>
      </div>

      <div className="rounded-lg border border-border bg-panel/60 p-4">
        <p className="text-[11px] uppercase tracking-widest text-text-muted">
          Alliance Strength
        </p>
        <p className="mt-1.5 text-2xl font-bold text-text">
          {fmtScore(gameState.allianceStrength)}
        </p>
        <div className="mt-2">
          <ProgressBar value={gameState.allianceStrength} color="#3b82f6" />
        </div>
      </div>
    </div>
  );
}
