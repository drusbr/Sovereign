"use client";

import Link from "next/link";
import { useGame } from "@/context/GameContext";
import { KNOWN_POLICY_CONSTRAINTS } from "@/lib/policyDevelopment/types";

function totalFiscalScale(actionDrafts: { parameters: Record<string, unknown> }[]): number {
  return actionDrafts.reduce((sum, draft) => sum + Number(draft.parameters.amountBRLBillions ?? 0), 0);
}

/** Surfaces active, unexpired READY PolicyDevelopmentRequests — the Advisers page is
 *  where the player experiences "my government developed these options," not a
 *  standalone Policy Development page. Selecting an option queues it into the same
 *  shared pending-action queue Orders reviews. */
export function PolicyDevelopmentSection() {
  const { gameState, selectPolicyOption } = useGame();
  const activeRequests = gameState.policyDevelopmentRequests.filter(
    (request) => request.status === "READY" && gameState.turn <= request.expiresOnTurn
  );

  if (activeRequests.length === 0) return null;

  return (
    <section className="mt-6 border-y border-border bg-panel/25 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text">Policy Development</h2>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">Developed by your economic team</span>
      </div>

      <div className="mt-3 space-y-5">
        {activeRequests.map((request) => (
          <div key={request.id} className="border-t border-border pt-3">
            <p className="text-sm text-text">
              Presidential objective: <span className="font-semibold">&ldquo;{request.rawInstruction}&rdquo;</span>
            </p>
            {request.constraintIds.length > 0 && (
              <p className="mt-1 text-xs text-text-muted">
                Constraint:{" "}
                {request.constraintIds
                  .map((id) => KNOWN_POLICY_CONSTRAINTS[id]?.label ?? id)
                  .join(", ")}
              </p>
            )}
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {request.options.map((option) => (
                <div
                  key={option.id}
                  className="flex flex-col justify-between border border-border bg-panel-2/60 p-3"
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brass">
                      {option.approach.replace("_", "-")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text">{option.title}</p>
                    <p className="mt-1.5 text-xs leading-5 text-text-muted">{option.summary}</p>
                    <p className="mt-2 text-[11px] text-text-muted">
                      Fiscal scale: R${totalFiscalScale(option.actionDrafts).toFixed(1)}bn annually across{" "}
                      {option.actionDrafts.length} measure{option.actionDrafts.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectPolicyOption(request.id, option.id)}
                    className="mt-3 w-full border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-text-muted">
        Selecting an option adds it to your Presidential Agenda —{" "}
        <Link href="/orders" className="font-semibold text-accent underline underline-offset-2">
          review it on Orders
        </Link>{" "}
        before executing the turn.
      </p>
    </section>
  );
}
