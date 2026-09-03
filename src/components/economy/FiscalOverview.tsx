import type { GameState } from "@/lib/gameState";
import { activeFiscalPolicies, currentTurnFiscalFlows, fiscalCommitments } from "@/lib/fiscalPresentation";

function money(value: number): string { return `R$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 3 })}bn`; }
function label(value: string): string { return value.replace(/([A-Z])/g, " $1").replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()); }
function Stat({ label: name, value, tone = "text-text" }: { label: string; value: string; tone?: string }) { return <div className="rounded-lg border border-border bg-panel/60 p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{name}</p><p className={`mt-2 text-xl font-semibold ${tone}`}>{value}</p></div>; }

export function FiscalOverview({ gameState }: { gameState: GameState }) {
  const fiscal = gameState.fiscal;
  const spending = Object.entries(fiscal.spendingByCategory).sort((a, b) => b[1] - a[1]);
  const revenue = Object.entries(fiscal.revenueByCategory).sort((a, b) => b[1] - a[1]);
  const flows = currentTurnFiscalFlows(fiscal, gameState.turn);
  const policies = activeFiscalPolicies(fiscal);
  const commitments = fiscalCommitments(gameState);
  return <div className="space-y-6">
    <p className="text-xs leading-relaxed text-text-muted">Federal accounts · nominal Brazilian reais, billions · annual run-rate unless explicitly identified as current-turn cash flow</p>
    <section>
      <p className="mb-3 border-l-2 border-accent pl-3 text-[11px] font-semibold uppercase tracking-widest text-text">Fiscal position</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Annual Revenue" value={money(fiscal.annualRevenue)} /><Stat label="Annual Expenditure" value={money(fiscal.annualExpenditure)} />
        <Stat label="Primary Balance" value={`${fiscal.primaryBalance >= 0 ? "+" : "−"}${money(fiscal.primaryBalance)}`} tone={fiscal.primaryBalance >= 0 ? "text-positive" : "text-danger"}/><Stat label="Overall Balance" value={`${fiscal.nominalBalance >= 0 ? "+" : "−"}${money(fiscal.nominalBalance)}`} tone={fiscal.nominalBalance >= 0 ? "text-positive" : "text-danger"}/>
        <Stat label="Public Debt" value={money(fiscal.publicDebt)}/><Stat label="Debt / GDP" value={`${fiscal.debtToGDP.toFixed(1)}%`} tone={fiscal.debtToGDP > 100 ? "text-danger" : "text-amber-400"}/><Stat label="Interest Expense" value={money(fiscal.interestExpense)}/><Stat label="Discretionary Capacity" value={money(fiscal.discretionaryBudgetAvailable)} tone="text-accent"/>
      </div>
    </section>

    <section className="rounded-lg border border-border bg-panel/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-semibold uppercase tracking-wider text-text">Fiscal flows — current turn</h3><p className="mt-1 text-[11px] text-text-muted">Cash effects recorded this turn; recurring policy amounts are shown at one fifty-second of annual run-rate.</p></div><div className="flex gap-3 text-xs"><span className="text-positive">In {money(flows.revenue)}</span><span className="text-danger">Out {money(flows.expenditure)}</span><span className={flows.net >= 0 ? "text-positive" : "text-danger"}>Net {flows.net >= 0 ? "+" : "−"}{money(flows.net)}</span></div></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted"><tr><th className="pb-2">Date</th><th className="pb-2">Source / Item</th><th className="pb-2">Type</th><th className="pb-2">Category</th><th className="pb-2 text-right">Current-turn amount</th></tr></thead><tbody>{flows.entries.map((entry) => <tr key={entry.id} className="border-b border-border/60"><td className="py-2.5 text-text-muted">{entry.date}</td><td className="py-2.5 text-text">{entry.description}</td><td className="py-2.5 text-text-muted">{entry.currentTurnCashImpact >= 0 ? "Revenue" : "Expenditure"}{entry.timing !== "ONE_OFF" ? " · recurring" : ""}</td><td className="py-2.5 text-text-muted">{label(entry.category)}</td><td className={`py-2.5 text-right font-medium ${entry.currentTurnCashImpact >= 0 ? "text-positive" : "text-danger"}`}>{entry.currentTurnCashImpact >= 0 ? "+" : "−"}{money(entry.currentTurnCashImpact)}</td></tr>)}</tbody></table>{flows.entries.length === 0 && <p className="py-6 text-center text-xs italic text-text-muted">No new fiscal transactions were recorded this turn.</p>}</div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2"><CategoryTable title="Annual expenditure by category" rows={spending} total={fiscal.primaryExpenditure + fiscal.currentYearOneOffExpenditure}/><CategoryTable title="Annual revenue by category" rows={revenue} total={fiscal.primaryRevenue + fiscal.currentYearOneOffRevenue}/></div>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-panel/60 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-text">Authorised commitments</h3><p className="mt-1 text-[11px] text-text-muted">Authorised budgets are not cash already spent.</p><div className="mt-3 space-y-3">{commitments.map((item) => <div key={item.id} className="border-t border-border pt-3 text-xs"><div className="flex justify-between gap-3"><span className="font-medium text-text">{item.name}</span><span className="text-text-muted">{item.kind}</span></div><div className="mt-2 grid grid-cols-3 gap-2 text-[11px]"><span>Authorised<br/><b className="text-text">{money(item.authorised)}</b></span><span>Spent<br/><b className="text-text">{money(item.spent)}</b></span><span>Remaining<br/><b className="text-accent">{money(item.remaining)}</b></span></div></div>)}{commitments.length === 0 && <p className="mt-4 text-xs italic text-text-muted">No active project or operation commitments.</p>}</div></div>
      <div className="rounded-lg border border-border bg-panel/60 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-text">Active recurring policies</h3><p className="mt-1 text-[11px] text-text-muted">Annual policy effect and attributable weekly cash flow are shown separately.</p><div className="mt-3 space-y-3">{policies.map((entry) => <div key={entry.id} className="border-t border-border pt-3 text-xs"><p className="font-medium text-text">{entry.description}</p><div className="mt-2 flex justify-between"><span className="text-text-muted">Annual policy effect</span><span className={entry.annualRunRateImpact >= 0 ? "text-positive" : "text-danger"}>{entry.annualRunRateImpact >= 0 ? "+" : "−"}{money(entry.annualRunRateImpact)}/year</span></div><div className="mt-1 flex justify-between"><span className="text-text-muted">Current-turn cash effect</span><span className={entry.currentTurnCashImpact >= 0 ? "text-positive" : "text-danger"}>{entry.currentTurnCashImpact >= 0 ? "+" : "−"}{money(entry.currentTurnCashImpact)}</span></div></div>)}{policies.length === 0 && <p className="mt-4 text-xs italic text-text-muted">No recurring policies have been enacted.</p>}</div></div>
    </section>
  </div>;
}

function CategoryTable({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) { return <div className="rounded-lg border border-border bg-panel/60 p-4"><h3 className="text-xs font-semibold uppercase tracking-wider text-text">{title}</h3><div className="mt-3 space-y-2.5">{rows.map(([name, value]) => <div key={name}><div className="mb-1 flex justify-between text-xs"><span className="text-text-muted">{label(name)}</span><span className="font-medium text-text">{money(value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary"><div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.min(100, total > 0 ? value / total * 100 : 0)}%` }}/></div></div>)}</div></div>; }
