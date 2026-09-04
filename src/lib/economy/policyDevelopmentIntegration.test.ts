import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { applyFiscalAction } from "../fiscal.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createLegislativeProceeding, resolveCongressVote } from "../congress.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createPolicyDevelopmentRequest } from "../policyDevelopment/request.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { compileDevelopedOption } from "../policyDevelopment/compile.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceEconomy } from "./advanceEconomy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { ECONOMY_OWNED_MACRO_KEYS } from "./types.ts";
import type { GameState } from "../gameState.ts";

function findOption<T extends { approach: string }>(request: { options: T[] }, approach: string): T {
  const option = request.options.find((o) => o.approach === approach);
  assert.ok(option, `expected a ${approach} option`);
  return option!;
}

test("no compiled Policy Development action ever carries a macro-owned parameter key", () => {
  const state: GameState = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.");
  assert.ok(request);
  for (const option of request!.options) {
    for (const action of compileDevelopedOption(option, request!, state)) {
      for (const macroKey of ECONOMY_OWNED_MACRO_KEYS) {
        assert.equal(macroKey in action.parameters, false);
      }
      assert.equal("gdpGrowth" in action, false);
      assert.equal("inflation" in action, false);
      assert.equal("unemployment" in action, false);
    }
  }
});

test("applyFiscalAction alone never changes gdpGrowth/inflation/unemployment — only advanceEconomy does", () => {
  const state: GameState = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.")!;
  const expenditureOption = findOption(request, "EXPENDITURE_LED");
  const [action] = compileDevelopedOption(expenditureOption, request, state);
  const result = applyFiscalAction(state, action);
  assert.equal(result.state.gdpGrowth, state.gdpGrowth);
  assert.equal(result.state.inflation, state.inflation);
  assert.equal(result.state.unemployment, state.unemployment);
});

test("expenditure-led option enters the normal fiscal engine and then affects demand pressure", () => {
  const state: GameState = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.")!;
  const expenditureOption = findOption(request, "EXPENDITURE_LED");
  const actions = compileDevelopedOption(expenditureOption, request, state);

  let fiscalState = state;
  for (const action of actions) {
    assert.equal(action.authority.type, "EXECUTIVE");
    fiscalState = applyFiscalAction(fiscalState, action).state;
  }
  assert.ok(fiscalState.fiscal.primaryExpenditure < state.fiscal.primaryExpenditure);

  const economyResult = advanceEconomy(fiscalState);
  assert.ok(economyResult.dynamics.demandPressure < 0);
});

test("revenue-led option only affects demand pressure after Congress actually passes it", () => {
  const state: GameState = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.")!;
  const revenueOption = findOption(request, "REVENUE_LED");
  const [action] = compileDevelopedOption(revenueOption, request, state);
  assert.equal(action.authority.type, "LEGISLATIVE");

  // Before passage: applyFiscalAction refuses (matches ordinary tax-bill behaviour),
  // fiscal state is untouched, and the economy sees zero revenue-side stance.
  const beforePassage = applyFiscalAction(state, action);
  assert.equal(beforePassage.validation.valid, false);
  assert.equal(beforePassage.state.fiscal.primaryRevenue, state.fiscal.primaryRevenue);
  const economyBefore = advanceEconomy(beforePassage.state);
  assert.equal(Math.abs(economyBefore.demandContributions.recurringRevenueMeasures), 0);

  // After passage: Congress applies it exactly like any hand-typed tax bill.
  let withProceeding: GameState = {
    ...state,
    legislativeProceedings: [createLegislativeProceeding(action, state.turn)],
    congressionalSupport: 75,
    actionPoints: 3,
  };
  withProceeding = {
    ...withProceeding,
    legislativeProceedings: withProceeding.legislativeProceedings.map((bill) => ({
      ...bill, supportModifier: 20, senateModifier: 20,
    })),
  };
  const voteResult = resolveCongressVote(withProceeding, withProceeding.legislativeProceedings[0].id);
  assert.equal(voteResult.voteResult?.passed, true);
  assert.ok(voteResult.state.fiscal.primaryRevenue > state.fiscal.primaryRevenue);

  const economyAfter = advanceEconomy(voteResult.state);
  assert.ok(economyAfter.demandContributions.recurringRevenueMeasures < 0);
});

test("mixed option combines both channels once both parts are actually enacted", () => {
  const state: GameState = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.")!;
  const mixedOption = findOption(request, "MIXED");
  const actions = compileDevelopedOption(mixedOption, request, state);
  const expenditureActions = actions.filter((a) => a.actionType === "DECREASE_SPENDING");
  const revenueAction = actions.find((a) => a.actionType === "INCREASE_TAX")!;
  assert.ok(expenditureActions.length > 0);
  assert.ok(revenueAction);

  let fiscalState = state;
  for (const action of expenditureActions) {
    fiscalState = applyFiscalAction(fiscalState, action).state;
  }
  const afterExpenditureOnly = advanceEconomy(fiscalState);

  let withProceeding: GameState = {
    ...fiscalState,
    legislativeProceedings: [createLegislativeProceeding(revenueAction, fiscalState.turn)],
    congressionalSupport: 75,
    actionPoints: 3,
  };
  withProceeding = {
    ...withProceeding,
    legislativeProceedings: withProceeding.legislativeProceedings.map((bill) => ({
      ...bill, supportModifier: 20, senateModifier: 20,
    })),
  };
  const voteResult = resolveCongressVote(withProceeding, withProceeding.legislativeProceedings[0].id);
  assert.equal(voteResult.voteResult?.passed, true);

  const afterBoth = advanceEconomy(voteResult.state);
  assert.ok(afterExpenditureOnly.dynamics.demandPressure < 0, "expenditure-only stance should already be contractionary");
  assert.ok(
    afterBoth.dynamics.demandPressure <= afterExpenditureOnly.dynamics.demandPressure,
    "adding the revenue measure should not make the stance less contractionary"
  );
});
