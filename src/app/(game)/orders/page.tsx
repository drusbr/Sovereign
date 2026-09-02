"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { TurnHistoryCard } from "@/components/orders/TurnHistoryCard";

export default function OrdersPage() {
  const { gameState, isLoading, error, lastResult, issueOrders } = useGame();
  const [orders, setOrders] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orders.trim() || isLoading) return;
    await issueOrders(orders);
    setOrders("");
  }

  // Exclude only the record currently shown in the briefing panel above (matched by
  // narrative, since an event resolved without a follow-up order can leave the newest
  // history entry different from `lastResult`).
  const previousTurns = gameState.history
    .filter((record) => record.narrative !== lastResult?.narrative)
    .slice(-3)
    .reverse();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="border-b border-border pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          Issue Presidential Orders
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="text-lg font-semibold text-text">
            {gameState.countryName} — Turn {gameState.turn}
          </h1>
          <span className="text-xs text-text-muted">{gameState.date}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={orders}
          onChange={(e) => setOrders(e.target.value)}
          disabled={isLoading}
          placeholder="Enter your orders, Mr. President..."
          rows={7}
          className="w-full resize-y rounded-lg border border-border bg-panel px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
        />
        <div className="flex items-center justify-between">
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : (
            <span className="text-xs text-text-muted">
              Orders are logged and carried into future briefings.
            </span>
          )}
          <button
            type="submit"
            disabled={isLoading || !orders.trim()}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-text-muted"
          >
            {isLoading ? "Deliberating…" : "Issue Orders"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-border bg-panel-2/60">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-danger/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-danger">
              CLASSIFIED
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Situation Briefing
            </span>
          </div>
          {lastResult && (
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  lastResult.approvalChange > 0
                    ? "bg-positive/15 text-positive"
                    : lastResult.approvalChange < 0
                      ? "bg-danger/15 text-danger"
                      : "bg-panel text-text-muted"
                }`}
              >
                {lastResult.approvalChange > 0 ? "+" : ""}
                {lastResult.approvalChange}% approval
              </span>
              {lastResult.securityIndexChange !== 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    lastResult.securityIndexChange > 0
                      ? "bg-accent/15 text-accent"
                      : "bg-danger/15 text-danger"
                  }`}
                >
                  {lastResult.securityIndexChange > 0 ? "+" : ""}
                  {lastResult.securityIndexChange} security
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-5">
          {isLoading && (
            <p className="animate-pulse font-mono text-xs text-text-muted">
              Compiling intelligence from the field…
            </p>
          )}

          {!isLoading && lastResult && (
            <div className="space-y-4 font-mono text-[13px] leading-relaxed text-text">
              {lastResult.narrative.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}

          {!isLoading && !lastResult && !error && (
            <p className="font-mono text-xs text-text-muted">
              No orders issued yet. The presidency awaits your first move.
            </p>
          )}
        </div>
      </div>

      {previousTurns.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
            Turn History
          </h2>
          <div className="space-y-2">
            {previousTurns.map((record, i) => (
              <TurnHistoryCard key={`${record.turn}-${i}`} record={record} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
