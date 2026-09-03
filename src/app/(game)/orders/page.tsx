"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/context/GameContext";
import { TurnHistoryCard } from "@/components/orders/TurnHistoryCard";
import {
  PendingOrderCard,
  type PendingOrder,
} from "@/components/orders/PendingOrderCard";
import {
  canonicalActorIdForCountry,
  createDraftAction,
  type ProposedAction,
} from "@/lib/actions/types";
import { applyActionValidation } from "@/lib/actions/validation";
import { inferExplicitFiscalAction, inferExplicitLegislativeAction } from "@/lib/actions/interpretation";
import { renderEvent } from "@/lib/proceduralWriter";

const AUTHORITY_CHECK_DELAY_MS = 800;

function makeOrderId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function OrdersPage() {
  const { gameState, isLoading, error, lastResult, issueOrders } = useGame();
  const [draft, setDraft] = useState("");
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function updateInterpretedAction(id: string, action: ProposedAction | null) {
    if (!mountedRef.current) return;
    setPendingOrders((prev) =>
      prev.map((order) => {
        if (order.action.id !== id) return order;
        if (!action) {
          const fallback = inferExplicitFiscalAction(order.action) ?? inferExplicitLegislativeAction(order.action);
          if (fallback) {
            return {
              action: applyActionValidation(gameState, fallback),
              interpretationState: "resolved",
            };
          }
          const unknown = applyActionValidation(gameState, {
            ...order.action,
            status: "PROPOSED",
          });
          return { action: unknown, interpretationState: "unknown" };
        }
        return {
          action: applyActionValidation(gameState, action),
          interpretationState: "resolved",
        };
      })
    );
  }

  function interpretAction(action: ProposedAction) {
    setTimeout(async () => {
      try {
        const res = await fetch("/api/action-interpretation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: action.id,
            actorId: action.actorId,
            rawOrder: action.rawOrder,
          }),
        });
        const data = await res.json();
        updateInterpretedAction(action.id, res.ok ? (data as ProposedAction) : null);
      } catch {
        updateInterpretedAction(action.id, null);
      }
    }, AUTHORITY_CHECK_DELAY_MS);
  }

  function handleAddToAgenda() {
    const text = draft.trim();
    if (!text) return;
    const action = createDraftAction({
      id: makeOrderId(),
      actorId: canonicalActorIdForCountry(gameState.countryName),
      rawOrder: text,
    });
    setPendingOrders((prev) => [
      ...prev,
      { action, interpretationState: "checking" },
    ]);
    setDraft("");
    interpretAction(action);
  }

  function handleRemove(id: string) {
    setPendingOrders((prev) => prev.filter((o) => o.action.id !== id));
  }

  async function handleExecuteTurn() {
    if (
      pendingOrders.length === 0 ||
      isLoading ||
      pendingOrders.some((order) => order.interpretationState === "checking")
    ) return;
    await issueOrders(pendingOrders.map((order) => order.action));
    if (mountedRef.current) setPendingOrders([]);
  }

  // Exclude only the record currently shown in the briefing panel above (matched by
  // narrative, since an event resolved without a follow-up order can leave the newest
  // history entry different from `lastResult`).
  const previousTurns = gameState.history
    .filter((record) => record.narrative !== lastResult?.narrative)
    .slice(-3)
    .reverse();
  const isInterpreting = pendingOrders.some(
    (order) => order.interpretationState === "checking"
  );
  const latestRecord = gameState.history.at(-1);
  const briefingEvents = (latestRecord?.eventFactIds ?? [])
    .map((id) => gameState.eventHistory.find((event) => event.id === id))
    .filter((event): event is NonNullable<typeof event> => Boolean(event?.surfacedToPresident));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
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

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col gap-3 lg:w-[60%]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Order Drafting Area
          </h2>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isLoading}
            placeholder="Enter your orders, Mr. President..."
            rows={7}
            className="w-full resize-y rounded-lg border border-border bg-panel px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleAddToAgenda}
            disabled={!draft.trim() || isLoading}
            className="self-start rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-border disabled:text-text-muted"
          >
            Add to Agenda
          </button>
          <p className="text-xs text-text-muted">
            Write one order at a time. Build your full agenda before executing.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:w-[40%]">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Presidential Agenda
            </h2>
          </div>

          <div className="flex-1 rounded-lg border border-border bg-panel-2/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                Pending Orders
              </span>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                {pendingOrders.length}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {pendingOrders.length === 0 ? (
                <p className="py-6 text-center text-xs italic text-text-muted">
                  No orders queued. Write your first order on the left.
                </p>
              ) : (
                pendingOrders.map((order, i) => (
                  <PendingOrderCard
                    key={order.action.id}
                    index={i}
                    order={order}
                    onRemove={handleRemove}
                  />
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleExecuteTurn}
              disabled={pendingOrders.length === 0 || isLoading || isInterpreting}
              className="mt-4 w-full rounded-md bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-text-muted"
            >
              {isLoading
                ? "Deliberating…"
                : isInterpreting
                  ? "Checking institutional authority…"
                : `Execute Turn (${pendingOrders.length} order${
                    pendingOrders.length === 1 ? "" : "s"
                  })`}
            </button>
            <p className="mt-2 text-[11px] text-text-muted">
              All orders will be submitted together and resolved as a single
              government session.
            </p>
          </div>
        </div>
      </div>

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
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}

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

      {briefingEvents.length > 0 && (
        <section className="rounded-lg border border-accent/20 bg-panel/50 p-4">
          <h2 className="border-l-2 border-accent pl-2 text-xs font-semibold uppercase tracking-widest text-accent">
            Presidential Briefing
          </h2>
          <div className="mt-3 space-y-3">
            {briefingEvents.map((event) => {
              const rendered = renderEvent(event, "PRESIDENTIAL_BRIEFING", { recentTemplateIds: gameState.proceduralTemplateHistory });
              return <article key={event.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0"><h3 className="text-sm font-semibold text-text">{rendered.headline}</h3><p className="mt-1 text-xs leading-relaxed text-text-muted">{rendered.body}</p></article>;
            })}
          </div>
        </section>
      )}

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
