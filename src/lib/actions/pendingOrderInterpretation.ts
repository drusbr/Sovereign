import type { GameState } from "@/lib/gameState";
import type { ProposedAction } from "./types";
import { applyActionValidation } from "./validation";
import { inferExplicitFiscalAction, inferExplicitLegislativeAction } from "./interpretation";

/**
 * Pure decision logic for what a pending order becomes once its `/api/action-
 * interpretation` request settles. Deliberately has no React/closure state of its
 * own — the caller (OrdersPage) passes in the order's *current* values read fresh
 * at call time, which is what makes this safe against the stale-closure bug this
 * module exists to fix (see the "Pending Order Stuck on Interpreting" report).
 */
export interface InterpretationResolution {
  action: ProposedAction;
  interpretationState: "resolved" | "unknown";
}

/**
 * Returns the order's next `{action, interpretationState}`, or `null` when there's
 * nothing to apply. `null` covers two cases:
 *  - the order is no longer in "checking" (it already resolved) — an idempotency
 *    guard so a stale or duplicate interpretation response for the same order id
 *    can never overwrite a result that already landed;
 *  - (implicitly, by the caller not finding the order at all — not this function's
 *    concern, since it only runs once a live order has been located).
 */
export function resolveInterpretedOrder(
  currentAction: ProposedAction,
  currentInterpretationState: string,
  interpreted: ProposedAction | null,
  state: Pick<GameState, "countryName">
): InterpretationResolution | null {
  if (currentInterpretationState !== "checking") return null;

  if (!interpreted) {
    const fallback = inferExplicitFiscalAction(currentAction) ?? inferExplicitLegislativeAction(currentAction);
    if (fallback) {
      return { action: applyActionValidation(state, fallback), interpretationState: "resolved" };
    }
    const unknown = applyActionValidation(state, { ...currentAction, status: "PROPOSED" });
    return { action: unknown, interpretationState: "unknown" };
  }

  return { action: applyActionValidation(state, interpreted), interpretationState: "resolved" };
}
