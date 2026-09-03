import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "./gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { applyFiscalAction, closeFiscalWeek } from "./fiscal.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { ensureLegislativeProceedings, resolveCongressVote } from "./congress.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { resolveTurn } from "./turn/resolveTurn.ts";
import type { ProposedAction } from "./actions/types.ts";
import type { TurnResult } from "./aiPrompts.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createDraftAction } from "./actions/types.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { inferExplicitFiscalAction } from "./actions/interpretation.ts";

function fiscalAction(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: "fiscal-health-20",
    actorId: "BRA",
    rawOrder: "Allocate R$20bn to healthcare.",
    actionType: "INCREASE_SPENDING",
    authority: { type: "EXECUTIVE" },
    targets: [{ id: "health", type: "SECTOR", name: "Health" }],
    parameters: { amountBRL: 20_000_000_000, spendingCategory: "health", timing: "ONE_OFF" },
    estimatedCosts: [],
    prerequisites: [],
    status: "PROPOSED",
    validationIssues: [],
    ...overrides,
  };
}

const zeroAI: TurnResult = {
  narrative: "The measure entered institutional processing.",
  effects: {}, organisationEffects: [], stateSecurityChanges: [],
  newOperation: null, newProject: null,
  situationSummary: "Fiscal policy remains under review.",
  eventSummary: "A fiscal measure was considered.",
};

test("one-off spending records expenditure, balance, financing and debt", () => {
  const state = createInitialGameState();
  const result = applyFiscalAction(state, fiscalAction());
  assert.equal(result.state.fiscal.currentYearOneOffExpenditure, 20);
  assert.equal(result.state.fiscal.annualExpenditure, state.fiscal.annualExpenditure + 20);
  assert.equal(result.state.fiscal.primaryBalance, state.fiscal.primaryBalance - 20);
  assert.equal(result.state.fiscal.financingRequirement, state.fiscal.financingRequirement + 20);
  assert.equal(result.state.fiscal.publicDebt, state.fiscal.publicDebt + 20);
});

test("explicit R$20bn healthcare order is interpreted into fiscal parameters", () => {
  const draft = createDraftAction({
    id: "natural-language-health",
    actorId: "BRA",
    rawOrder: "Allocate R$20bn in additional healthcare spending.",
  });
  const interpreted = inferExplicitFiscalAction(draft);
  assert.equal(interpreted?.actionType, "INCREASE_SPENDING");
  assert.equal(interpreted?.parameters.amountBRL, 20_000_000_000);
  assert.equal(interpreted?.parameters.spendingCategory, "health");
});

test("annual recurring spending changes run-rate and accrues only one week at close", () => {
  const state = createInitialGameState();
  const applied = applyFiscalAction(state, fiscalAction({ parameters: { annualAmountBRL: 52_000_000_000, spendingCategory: "health", timing: "ANNUAL_RECURRING" } })).state;
  assert.equal(applied.fiscal.primaryExpenditure, state.fiscal.primaryExpenditure + 52);
  assert.equal(applied.fiscal.publicDebt, state.fiscal.publicDebt);
  const closed = closeFiscalWeek(applied);
  const expectedWeeklyDeficit = -(applied.fiscal.primaryRevenue - applied.fiscal.primaryExpenditure - applied.fiscal.interestExpense) / 52;
  assert.equal(closed.fiscal.publicDebt, applied.fiscal.publicDebt + expectedWeeklyDeficit);
});

test("revenue increase improves balance", () => {
  const state = createInitialGameState();
  const action = fiscalAction({ actionType: "INCREASE_TAX", authority: { type: "LEGISLATIVE" }, parameters: { annualAmountBRL: 30_000_000_000, taxCategory: "personalIncomeTax" } });
  const result = applyFiscalAction(state, action, { legislationPassed: true }).state;
  assert.equal(result.fiscal.primaryRevenue, state.fiscal.primaryRevenue + 30);
  assert.equal(result.fiscal.nominalBalance, state.fiscal.nominalBalance + 30);
});

test("tax cut reduces revenue", () => {
  const state = createInitialGameState();
  const action = fiscalAction({ actionType: "DECREASE_TAX", authority: { type: "LEGISLATIVE" }, parameters: { annualAmountBRL: 15_000_000_000, taxCategory: "corporateTax" } });
  const result = applyFiscalAction(state, action, { legislationPassed: true }).state;
  assert.equal(result.fiscal.primaryRevenue, state.fiscal.primaryRevenue - 15);
});

test("deficit increases debt at weekly close", () => {
  const state = createInitialGameState();
  assert.ok(closeFiscalWeek(state).fiscal.publicDebt > state.fiscal.publicDebt);
});

test("legislative fiscal proposal changes no ledger before passage", () => {
  const state = createInitialGameState();
  const action = fiscalAction({ authority: { type: "LEGISLATIVE", institution: "National Congress" }, prerequisites: [{ type: "LEGISLATION", institution: "National Congress", description: "Passage required" }] });
  const result = resolveTurn({ state, actions: [action], aiResult: zeroAI });
  assert.equal(result.state.fiscal.ledger.some((entry) => entry.actionId.includes(action.id)), false);
  assert.equal(result.actionResolutions[0].status, "PENDING");
});

test("passed legislative fiscal action applies ledger effects", () => {
  const action = fiscalAction({ authority: { type: "LEGISLATIVE", institution: "National Congress" } });
  let state = createInitialGameState();
  state.congressionalSupport = 90;
  state = ensureLegislativeProceedings(state, [action], state.turn);
  const result = resolveCongressVote(state, state.legislativeProceedings[0].id);
  assert.equal(result.voteResult?.passed, true);
  assert.equal(result.state.fiscal.currentYearOneOffExpenditure, 20);
});

test("failed bill changes no fiscal state", () => {
  const action = fiscalAction({ authority: { type: "LEGISLATIVE", institution: "National Congress" } });
  let state = createInitialGameState();
  state.congressionalSupport = 10;
  state = ensureLegislativeProceedings(state, [action], state.turn);
  const before = structuredClone(state.fiscal);
  const result = resolveCongressVote(state, state.legislativeProceedings[0].id);
  assert.equal(result.voteResult?.passed, false);
  assert.deepEqual(result.state.fiscal, before);
});

test("executive-authorised allocation works", () => {
  const result = applyFiscalAction(createInitialGameState(), fiscalAction());
  assert.equal(result.validation.valid, true);
  assert.equal(result.entry?.funding, "CURRENT_ALLOCATION");
});

test("fiscal operations are pure and deterministic", () => {
  const state = createInitialGameState();
  const snapshot = structuredClone(state);
  const first = applyFiscalAction(state, fiscalAction());
  const second = applyFiscalAction(state, fiscalAction());
  assert.deepEqual(state, snapshot);
  assert.deepEqual(first, second);
});

test("old saves hydrate a coherent fiscal ledger", () => {
  const old = createInitialGameState() as Partial<ReturnType<typeof createInitialGameState>>;
  delete old.fiscal;
  const hydrated = hydrateGameState(old);
  assert.equal(hydrated.fiscal.unit, "BRL_BILLIONS");
  assert.equal(hydrated.sovereignDebt, hydrated.fiscal.debtToGDP);
});
