import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { validateAction } from "../actions/validation.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { developPolicyOptions } from "./generate.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { compileDevelopedOption } from "./compile.ts";

const state = createInitialGameState();
const options = developPolicyOptions(state, "REDUCE_INFLATION", ["PRESERVE_INFRASTRUCTURE_INVESTMENT"], "req-compile");
const request = { objectiveId: "REDUCE_INFLATION" };

function findOption(approach: string) {
  const option = options.find((o: { approach: string }) => o.approach === approach);
  assert.ok(option, `expected a ${approach} option to be generated`);
  return option;
}

test("expenditure option compiles into valid, EXECUTIVE ProposedAction(s)", () => {
  const option = findOption("EXPENDITURE_LED");
  const actions = compileDevelopedOption(option, request, state);
  assert.ok(actions.length > 0);
  for (const action of actions) {
    assert.equal(action.actionType, "DECREASE_SPENDING");
    assert.equal(action.authority.type, "EXECUTIVE");
    assert.equal(action.objectiveId, "REDUCE_INFLATION");
    assert.equal(action.actionDefinitionId, "fiscal_consolidation_for_disinflation");
    assert.equal(action.instrumentId, "SPENDING_ADJUSTMENT");
    const result = validateAction({ countryName: "Brazil" }, action);
    assert.equal(result.valid, true, JSON.stringify(result.issues));
  }
});

test("revenue option compiles into a LEGISLATIVE ProposedAction requiring Congress", () => {
  const option = findOption("REVENUE_LED");
  const actions = compileDevelopedOption(option, request, state);
  assert.equal(actions.length, 1);
  const [action] = actions;
  assert.equal(action.actionType, "INCREASE_TAX");
  assert.equal(action.authority.type, "LEGISLATIVE");
  assert.equal(action.actionDefinitionId, "federal_revenue_consolidation_measure");
  assert.equal(action.instrumentId, "FEDERAL_TAX_LEGISLATION");
  assert.ok(action.prerequisites.some((p: { type: string }) => p.type === "LEGISLATION"));
  // Structurally valid on its own terms — Congress passage (not yet obtained) is what
  // the REQUIRES_LEGISLATION issue below represents, matching an ordinary tax bill.
  const result = validateAction({ countryName: "Brazil" }, action);
  assert.equal(result.status, "BLOCKED");
  assert.ok(result.issues.some((i: { code: string }) => i.code === "REQUIRES_LEGISLATION"));
});

test("mixed option compiles both an expenditure and a revenue action", () => {
  const option = findOption("MIXED");
  const actions = compileDevelopedOption(option, request, state);
  assert.ok(actions.some((a: { actionType: string }) => a.actionType === "DECREASE_SPENDING"));
  assert.ok(actions.some((a: { actionType: string }) => a.actionType === "INCREASE_TAX"));
  assert.ok(actions.length >= 2);
});

test("compiled actions include Country Knowledge ids and pass existing validation", () => {
  for (const option of options) {
    for (const action of compileDevelopedOption(option, request, state)) {
      assert.ok(action.actionDefinitionId);
      assert.ok(action.instrumentId);
      assert.equal(action.objectiveId, "REDUCE_INFLATION");
      assert.equal(action.status, "PROPOSED");
      assert.deepEqual(action.validationIssues, []);
    }
  }
});
