import { ArrowDownRight, ArrowUpRight, Landmark, Minus, ShoppingBag } from "lucide-react";
import type { GameState } from "@/lib/gameState";
import { fmtBRL } from "@/lib/format";

/** High-level status only — no raw index/contribution values shown by default, per
 *  Economic V2's "not a Bloomberg terminal" UI constraint. */
function status(index: number): { label: string; tone: string } {
  if (index > 103) return { label: "Strong", tone: "text-positive" };
  if (index < 97) return { label: "Weak", tone: "text-danger" };
  return { label: "Stable", tone: "text-text-muted" };
}

function investmentStatus(index: number): { label: string; tone: string } {
  if (index > 103) return { label: "Expanding", tone: "text-positive" };
  if (index < 97) return { label: "Contracting", tone: "text-danger" };
  return { label: "Stable", tone: "text-text-muted" };
}

function Trend({ value }: { value: number }) {
  const Icon = value > 103 ? ArrowUpRight : value < 97 ? ArrowDownRight : Minus;
  return <Icon size={13} />;
}

export function PrivateEconomyOverview({ gameState }: { gameState: GameState }) {
  const priv = gameState.privateEconomy;
  const householdStatus = status(priv.consumptionIndex);
  const investmentStat = investmentStatus(priv.investmentIndex);

  return (
    <div className="grid grid-cols-1 border-y border-border bg-panel/35 sm:grid-cols-3">
      <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-muted">
          <ShoppingBag size={14} className="text-accent" /> Household Demand
        </div>
        <p className={`mt-2 flex items-center gap-1 text-2xl font-semibold ${householdStatus.tone}`}>
          {householdStatus.label} <Trend value={priv.consumptionIndex} />
        </p>
        <p className="mt-1 text-xs text-text-muted">Consumer spending conditions</p>
      </div>

      <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-muted">
          <Landmark size={14} className="text-accent" /> Private Investment
        </div>
        <p className={`mt-2 flex items-center gap-1 text-2xl font-semibold ${investmentStat.tone}`}>
          {investmentStat.label} <Trend value={priv.investmentIndex} />
        </p>
        <p className="mt-1 text-xs text-text-muted">Business investment conditions</p>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-muted">
          <Landmark size={14} className="text-accent" /> Nominal GDP
        </div>
        <p className="tabular mt-2 text-2xl font-semibold text-text">
          {fmtBRL(gameState.fiscal.nominalGDP)}
        </p>
        <p className="mt-1 text-xs text-text-muted">Current-price gross domestic product</p>
      </div>
    </div>
  );
}
