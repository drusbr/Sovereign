import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { resolveTurn, finalizeTurn } from "../turn/resolveTurn.ts";
import type { TurnResult } from "../aiPrompts.ts";

const noOrderResult: TurnResult = {
  narrative: "", effects: {}, organisationEffects: [], stateSecurityChanges: [],
  newOperation: null, newProject: null, situationSummary: "", eventSummary: "",
};

test("50-turn no-order calibration produces varied easing and an explainable debt path", () => {
  let state = createInitialGameState();
  for (let i = 0; i < 50; i++) {
    const draft = resolveTurn({ state, actions: [], aiResult: noOrderResult });
    state = finalizeTurn(draft, {
      plan: { deterministicEvents: [], randomSeeds: [], generateNovel: false, cooldownUpdates: {} },
    }).state;
  }
  const decisions = state.monetaryPolicy.decisionHistory.map((record) => record.decision);
  assert.ok(decisions.length >= 6);
  assert.ok(new Set(decisions).size >= 2, `expected varying decision sizes, got ${decisions.join(" → ")}`);
  assert.equal(decisions.every((decision) => decision === "CUT_100"), false);
  // nominalGDP now evolves turn-by-turn from real growth + inflation (Slice 5) instead
  // of staying fixed, so it should have grown somewhat over 50 turns near baseline
  // growth/inflation, and debtToGDP reflects that larger denominator.
  assert.ok(state.fiscal.nominalGDP > 10_900);
  assert.ok(state.fiscal.debtToGDP > 90 && state.fiscal.debtToGDP < 96);
});
