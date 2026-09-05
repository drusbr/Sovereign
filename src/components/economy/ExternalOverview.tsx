import { ArrowDownRight, ArrowUpRight, Globe2, Minus, PackageOpen, Ship } from "lucide-react";
import type { GameState } from "@/lib/gameState";
import { fmtBRL } from "@/lib/format";

function condition(index: number): { label: string; tone: string } {
  if (index > 103) return { label: "Strengthening", tone: "text-positive" };
  if (index < 97) return { label: "Weakening", tone: "text-danger" };
  return { label: "Near normal", tone: "text-text-muted" };
}

function IndexTrend({ value }: { value: number }) {
  const status = condition(value);
  const Icon = value > 103 ? ArrowUpRight : value < 97 ? ArrowDownRight : Minus;
  return (
    <span className={`mt-2 flex items-center gap-1 text-xs ${status.tone}`}>
      <Icon size={13} /> {status.label}
    </span>
  );
}

export function ExternalOverview({ gameState }: { gameState: GameState }) {
  const external = gameState.externalEconomy;
  const realIsWeak = external.exchangeRateBrlPerUsd > external.equilibriumExchangeRate * 1.02;
  const realIsStrong = external.exchangeRateBrlPerUsd < external.equilibriumExchangeRate * 0.98;

  return (
    <div className="grid grid-cols-1 border-y border-border bg-panel/35 sm:grid-cols-2 xl:grid-cols-4">
      <div className="border-b border-border p-4 sm:border-r xl:border-b-0">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-muted">
          <Globe2 size={14} className="text-accent" /> BRL / USD
        </div>
        <p className="tabular mt-2 text-2xl font-semibold text-text">
          R${external.exchangeRateBrlPerUsd.toFixed(2)}
        </p>
        <p className={`mt-1 text-xs ${realIsWeak ? "text-amber-400" : realIsStrong ? "text-positive" : "text-text-muted"}`}>
          {realIsWeak ? "Real below medium-term anchor" : realIsStrong ? "Real above medium-term anchor" : "Near medium-term anchor"}
        </p>
      </div>

      <div className="border-b border-border p-4 xl:border-b-0 xl:border-r">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-muted">
          <Ship size={14} className="text-accent" /> External Balance
        </div>
        <p className={`tabular mt-2 text-2xl font-semibold ${gameState.tradeBalance >= 0 ? "text-positive" : "text-danger"}`}>
          {fmtBRL(Math.abs(gameState.tradeBalance))}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {gameState.tradeBalance >= 0 ? "Trade surplus" : "Trade deficit"} · R$bn per turn
        </p>
      </div>

      <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-muted">
          <Globe2 size={14} className="text-accent" /> Foreign Demand
        </div>
        <p className="tabular mt-2 text-2xl font-semibold text-text">
          {external.foreignDemandIndex.toFixed(1)}
        </p>
        <IndexTrend value={external.foreignDemandIndex} />
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-muted">
          <PackageOpen size={14} className="text-accent" /> Commodities
        </div>
        <p className="tabular mt-2 text-2xl font-semibold text-text">
          {external.commodityConditionsIndex.toFixed(1)}
        </p>
        <IndexTrend value={external.commodityConditionsIndex} />
      </div>
    </div>
  );
}
