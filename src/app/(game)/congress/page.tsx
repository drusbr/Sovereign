"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Landmark, Scale, XCircle } from "lucide-react";
import { useGame } from "@/context/GameContext";
import {
  calculateCongressSupport,
  type CongressAction,
  type LegislativeProceeding,
} from "@/lib/congress";
import { fmtPct } from "@/lib/format";

function statusClass(status: LegislativeProceeding["status"]): string {
  if (status === "PASSED") return "border-positive/30 bg-positive/10 text-positive";
  if (status === "FAILED" || status === "WITHDRAWN") return "border-danger/30 bg-danger/10 text-danger";
  return "border-accent/30 bg-accent/10 text-accent";
}

function SupportBar({ label, support, threshold, quorum, total }: { label: string; support: number; threshold: number; quorum: number; total: number }) {
  const percentage = Math.round((support / total) * 100);
  const thresholdPercent = (threshold / total) * 100;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="font-medium text-text">{label}</span>
        <span className="text-text-muted">Projected {support} · approval {threshold} · quorum {quorum}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-panel-2">
        <div className={`h-full rounded-full ${support >= threshold ? "bg-positive" : "bg-accent"}`} style={{ width: `${percentage}%` }} />
        <span className="absolute inset-y-0 w-px bg-amber-300" style={{ left: `${thresholdPercent}%` }} />
      </div>
    </div>
  );
}

const ACTIONS: { id: CongressAction; label: string; detail: string; tone?: string }[] = [
  { id: "NEGOTIATE", label: "Negotiate with coalition", detail: "1 AP · +6 Chamber / +4 Senate support" },
  { id: "CONCEDE", label: "Offer policy concessions", detail: "1 AP · strong support, weaker policy and -2 approval" },
  { id: "AMEND", label: "Amend and soften proposal", detail: "1 AP · favours Senate, reduces proposal strength" },
  { id: "PUBLIC_PRESSURE", label: "Apply public pressure", detail: "1 AP · effectiveness depends on approval" },
  { id: "CALL_VOTE", label: "Call bicameral vote", detail: "1 AP · resolves both chambers", tone: "bg-accent text-white" },
  { id: "WITHDRAW", label: "Withdraw bill", detail: "No AP · permanently closes proceeding" },
];

function BillCard({ bill }: { bill: LegislativeProceeding }) {
  const { gameState, manageLegislation } = useGame();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const projection = useMemo(() => calculateCongressSupport(gameState, bill), [gameState, bill]);
  const closed = ["PASSED", "FAILED", "WITHDRAWN"].includes(bill.status);
  const enactedEntries = gameState.fiscal.ledger.filter(
    (entry) => entry.proceedingId === bill.id || entry.actionId === bill.actionId
  );

  async function act(action: CongressAction) {
    setBusy(true); setError(null);
    try { setMessage(await manageLegislation(bill.id, action)); }
    catch (err) { setError(err instanceof Error ? err.message : "Congressional action failed."); }
    finally { setBusy(false); }
  }

  return (
    <article className="rounded-lg border border-border bg-panel/80 p-5 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wider ${statusClass(bill.status)}`}>{bill.status.replaceAll("_", " ")}</span>
            <span className="rounded border border-border px-2 py-0.5 text-[10px] text-text-muted">ORDINARY BILL</span>
            <span className="text-[11px] text-text-muted">Introduced Turn {bill.proposedTurn}</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-text">{bill.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{bill.description}</p>
        </div>
        <div className="text-right text-xs text-text-muted">
          <p>Proposal integrity</p>
          <p className="mt-1 text-lg font-semibold text-text">{fmtPct(bill.proposalStrength)}</p>
        </div>
      </div>

      {bill.voteResult ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {([['Chamber of Deputies', bill.voteResult.chamber], ['Federal Senate', bill.voteResult.senate]] as const).map(([name, vote]) => (
            <div key={name} className="rounded-md border border-border bg-panel-2/70 p-4">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-text">{name}</p>{vote.passed ? <CheckCircle2 size={16} className="text-positive" /> : <XCircle size={16} className="text-danger" />}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div><p className="text-positive">YES</p><p className="mt-1 text-base font-semibold text-text">{vote.yes}</p></div><div><p className="text-danger">NO</p><p className="mt-1 text-base font-semibold text-text">{vote.no}</p></div><div><p className="text-text-muted">ABSTAIN</p><p className="mt-1 text-base font-semibold text-text">{vote.abstain}</p></div></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-4 rounded-md border border-border bg-[#0a0f1e]/60 p-4">
          <SupportBar label="Chamber of Deputies" support={projection.chamber.support} threshold={projection.chamber.projectedApprovalThreshold} quorum={projection.chamber.quorum} total={projection.chamber.totalSeats} />
          <SupportBar label="Federal Senate" support={projection.senate.support} threshold={projection.senate.projectedApprovalThreshold} quorum={projection.senate.quorum} total={projection.senate.totalSeats} />
          <div className="grid gap-3 border-t border-border pt-3 text-xs md:grid-cols-2">
            <div><p className="font-semibold uppercase tracking-wider text-positive">Sources of support</p>{projection.sources.map((text) => <p key={text} className="mt-1 text-text-muted">• {text}</p>)}</div>
            <div><p className="font-semibold uppercase tracking-wider text-amber-400">Political resistance</p>{projection.resistance.map((text) => <p key={text} className="mt-1 text-text-muted">• {text}</p>)}</div>
          </div>
        </div>
      )}

      {bill.concessions.length > 0 && <div className="mt-4"><p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Negotiation record</p>{bill.concessions.map((item) => <p key={item.id} className="mt-1 text-xs text-text-muted">Turn {item.turn}: {item.description}</p>)}</div>}

      {bill.status === "PASSED" && enactedEntries.length > 0 && (
        <div className="mt-5 rounded-md border border-positive/20 bg-positive/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-positive">Enacted effects</p>
            <Link href="/economy" className="text-[11px] font-medium text-accent hover:text-blue-300">View in Economy →</Link>
          </div>
          <div className="mt-3 space-y-3">
            {enactedEntries.map((entry) => (
              <div key={entry.id} className="grid gap-2 border-t border-positive/10 pt-3 text-xs sm:grid-cols-3">
                <div><p className="text-text-muted">Policy</p><p className="mt-1 font-medium text-text">{entry.description}</p></div>
                <div><p className="text-text-muted">Annual policy effect</p><p className={`mt-1 font-semibold ${entry.annualRunRateImpact >= 0 ? "text-positive" : "text-danger"}`}>{entry.annualRunRateImpact >= 0 ? "+" : "−"}R${Math.abs(entry.annualRunRateImpact).toFixed(2)}bn/year</p></div>
                <div><p className="text-text-muted">Current-turn cash effect</p><p className={`mt-1 font-semibold ${entry.currentTurnCashImpact >= 0 ? "text-positive" : "text-danger"}`}>{entry.currentTurnCashImpact >= 0 ? "+" : "−"}R${Math.abs(entry.currentTurnCashImpact).toFixed(3)}bn</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!closed && <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ACTIONS.map((action) => <button key={action.id} type="button" disabled={busy || (action.id !== "WITHDRAW" && gameState.actionPoints < 1)} onClick={() => act(action.id)} className={`rounded-md border border-border px-3 py-2 text-left transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40 ${action.tone ?? "bg-panel-2 text-text"}`}><span className="block text-xs font-semibold">{action.label}</span><span className={`mt-0.5 block text-[10px] ${action.tone ? "text-blue-100" : "text-text-muted"}`}>{action.detail}</span></button>)}</div>}
      {message && <p className="mt-4 rounded border border-positive/20 bg-positive/5 px-3 py-2 text-xs text-positive">{message}</p>}
      {error && <p className="mt-4 rounded border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p>}
      <p className="mt-4 border-t border-border pt-3 text-[11px] text-text-muted">{bill.actionResolution.reason}</p>
    </article>
  );
}

export default function CongressPage() {
  const { gameState } = useGame();
  const bills = gameState.legislativeProceedings ?? [];
  const active = bills.filter((bill) => !["PASSED", "FAILED", "WITHDRAWN"].includes(bill.status));
  const history = bills.filter((bill) => ["PASSED", "FAILED", "WITHDRAWN"].includes(bill.status)).reverse();
  return <div className="mx-auto max-w-6xl space-y-7 p-6"><header className="flex items-start justify-between border-b border-border pb-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">National Congress</p><h1 className="mt-1 text-xl font-semibold text-text">Legislative Proceedings</h1><p className="mt-1 text-sm text-text-muted">Chamber of Deputies · Federal Senate</p></div><div className="rounded-md border border-border bg-panel px-3 py-2 text-right"><p className="text-[10px] uppercase tracking-wider text-text-muted">Action Points</p><p className="text-lg font-semibold text-text">{gameState.actionPoints} / 3</p></div></header>
    {active.length === 0 ? <div className="flex flex-col items-center rounded-lg border border-border bg-panel/50 py-16 text-center"><Landmark className="text-text-muted" size={32}/><p className="mt-3 text-sm font-medium text-text">No legislation before Congress</p><p className="mt-1 max-w-md text-xs text-text-muted">Legislative orders issued from the Orders page will appear here as persistent proceedings.</p></div> : <section className="space-y-4"><div className="border-l-2 border-accent pl-3"><h2 className="text-xs font-semibold uppercase tracking-widest text-text">Active docket</h2></div>{active.map((bill) => <BillCard key={bill.id} bill={bill}/>)}</section>}
    {history.length > 0 && <section className="space-y-4"><div className="flex items-center gap-2 border-l-2 border-text-muted pl-3"><Scale size={14} className="text-text-muted"/><h2 className="text-xs font-semibold uppercase tracking-widest text-text">Legislative record</h2></div>{history.map((bill) => <BillCard key={bill.id} bill={bill}/>)}</section>}
  </div>;
}
