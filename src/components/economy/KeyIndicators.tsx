import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import type { GameState } from "@/lib/gameState";
import {
  gdpGrowthColor,
  inflationColor,
  informalEconomyColor,
  unemploymentColor,
} from "@/lib/economy";
import { fmtBRL, fmtDelta, fmtPct } from "@/lib/format";

function trendOf(delta: number): { Icon: LucideIcon; className: string } {
  if (delta > 0.05) return { Icon: ArrowUp, className: "text-positive" };
  if (delta < -0.05) return { Icon: ArrowDown, className: "text-danger" };
  return { Icon: Minus, className: "text-text-muted" };
}

function StatCard({
  label,
  value,
  color,
  subtitle,
  delta,
}: {
  label: string;
  value: string;
  color: string;
  subtitle?: string;
  delta?: number;
}) {
  const trend = delta !== undefined ? trendOf(delta) : null;

  return (
    <div className="min-w-0 border-r border-border px-3 py-3 last:border-r-0">
      <p className="text-[11px] uppercase tracking-widest text-text-muted">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="tabular text-xl font-semibold" style={{ color }}>
          {value}
        </p>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend.className}`}>
            <trend.Icon size={12} />
            {fmtDelta(delta)}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
    </div>
  );
}

export function KeyIndicators({ gameState }: { gameState: GameState }) {
  const gdpDelta =
    gameState.gdpGrowth - gameState.gdpHistory[gameState.gdpHistory.length - 1];
  const fdiDelta =
    gameState.fdiFlow - gameState.fdiHistory[gameState.fdiHistory.length - 1];

  return (
    <div className="grid grid-cols-2 border-y border-border bg-panel/35 md:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="GDP Growth"
        value={fmtPct(gameState.gdpGrowth)}
        color={gdpGrowthColor(gameState.gdpGrowth)}
        delta={gdpDelta}
      />
      <StatCard
        label="Inflation"
        value={fmtPct(gameState.inflation)}
        color={inflationColor(gameState.inflation)}
        subtitle={gameState.inflation > 5 ? "Above target" : "Within target"}
      />
      <StatCard
        label="Unemployment"
        value={fmtPct(gameState.unemployment)}
        color={unemploymentColor(gameState.unemployment)}
      />
      <StatCard
        label="Trade Balance"
        value={fmtBRL(Math.abs(gameState.tradeBalance))}
        color={gameState.tradeBalance >= 0 ? "#10b981" : "#ef4444"}
        subtitle={gameState.tradeBalance >= 0 ? "Surplus" : "Deficit"}
      />
      <StatCard
        label="FDI Flow"
        value={fmtBRL(gameState.fdiFlow)}
        color="#3b82f6"
        subtitle="this turn"
        delta={fdiDelta}
      />
      <StatCard
        label="Informal Economy"
        value={fmtPct(gameState.informalEconomy)}
        color={informalEconomyColor(gameState.informalEconomy)}
        subtitle="of workforce off-books"
      />
    </div>
  );
}
