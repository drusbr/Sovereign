import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { resolveInterpretedOrder } from "./pendingOrderInterpretation.ts";
import type { ProposedAction } from "./types.ts";

const state = { countryName: "Brazil" };

function draftAction(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: "order-1",
    actorId: "BRA",
    rawOrder: "Direct the Health Ministry to publish hospital waiting-time data.",
    actionType: "UNKNOWN",
    authority: { type: "UNKNOWN" },
    targets: [],
    parameters: {},
    estimatedCosts: [],
    prerequisites: [],
    status: "DRAFT",
    validationIssues: [],
    ...overrides,
  };
}

const interpretedAction: ProposedAction = {
  id: "order-1",
  actorId: "BRA",
  rawOrder: "Direct the Health Ministry to publish hospital waiting-time data.",
  actionType: "POLICY_DIRECTIVE",
  authority: { type: "EXECUTIVE", institution: "Ministry of Health" },
  targets: [{ id: "health", type: "INSTITUTION", name: "Ministry of Health" }],
  parameters: {},
  estimatedCosts: [],
  prerequisites: [],
  status: "PROPOSED",
  validationIssues: [],
};

test("a successful interpretation transitions a checking order to resolved", () => {
  const resolution = resolveInterpretedOrder(draftAction(), "checking", interpretedAction, state);
  assert.ok(resolution);
  assert.equal(resolution!.interpretationState, "resolved");
});

test("the resolved action reflects the interpreted result, not the draft", () => {
  const resolution = resolveInterpretedOrder(draftAction(), "checking", interpretedAction, state);
  assert.equal(resolution!.action.actionType, "POLICY_DIRECTIVE");
  assert.equal(resolution!.action.authority.type, "EXECUTIVE");
  assert.equal(resolution!.action.authority.institution, "Ministry of Health");
});

test("a failed interpretation (null result) with no deterministic fallback transitions to unknown, not stuck", () => {
  const resolution = resolveInterpretedOrder(draftAction(), "checking", null, state);
  assert.ok(resolution);
  assert.equal(resolution!.interpretationState, "unknown");
});

test("a failed interpretation still uses the deterministic fiscal fallback when the order text matches", () => {
  const fiscalOrder = draftAction({ rawOrder: "Increase healthcare spending by R$20bn annually." });
  const resolution = resolveInterpretedOrder(fiscalOrder, "checking", null, state);
  assert.ok(resolution);
  assert.equal(resolution!.interpretationState, "resolved");
  assert.equal(resolution!.action.actionType, "INCREASE_SPENDING");
});

test("a duplicate/late resolution for an order that already resolved is a no-op", () => {
  const first = resolveInterpretedOrder(draftAction(), "checking", interpretedAction, state);
  assert.ok(first);
  // Simulate a second interpretation response arriving for the same order id after
  // the first one already resolved it — must not produce a second update.
  const second = resolveInterpretedOrder(first!.action, first!.interpretationState, interpretedAction, state);
  assert.equal(second, null);
});

test("a stale failed response cannot overwrite a newer success", () => {
  // The order already resolved successfully (e.g. from an earlier response)...
  const alreadyResolved = draftAction({ actionType: "POLICY_DIRECTIVE", authority: { type: "EXECUTIVE" } });
  // ...then a late/stale failed response for the same id arrives. It must be ignored,
  // not downgrade the order to "unknown".
  const resolution = resolveInterpretedOrder(alreadyResolved, "resolved", null, state);
  assert.equal(resolution, null);
});

test("a stale response cannot re-resolve an order that already reached 'unknown'", () => {
  const alreadyUnknown = draftAction({ authority: { type: "UNKNOWN" } });
  const resolution = resolveInterpretedOrder(alreadyUnknown, "unknown", interpretedAction, state);
  assert.equal(resolution, null);
});
