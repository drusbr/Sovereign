import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "./gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceNominalGDP, applyFiscalAction, closeFiscalWeek, postLifecycleExpenditure } from "./fiscal.ts";
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

test("interest expense enters debt exactly once through the weekly nominal balance", () => {
  const state = createInitialGameState();
  const closed = closeFiscalWeek(state);
  const expected = (state.fiscal.primaryExpenditure + state.fiscal.interestExpense - state.fiscal.primaryRevenue) / 52;
  assert.ok(Math.abs((closed.fiscal.publicDebt - state.fiscal.publicDebt) - expected) < 1e-9);
  assert.equal(expected, 820 / 52);
});

test("a R$10bn lifecycle disbursement raises debt once without becoming recurring spending", () => {
  const control = createInitialGameState();
  let treatment = postLifecycleExpenditure(structuredClone(control), {
    actionId: "project-cash-1", projectId: "project-1", amount: 10,
    category: "infrastructure", description: "Current project disbursement", kind: "FUND_PROJECT",
  });
  assert.equal(treatment.fiscal.publicDebt - control.fiscal.publicDebt, 10);
  assert.equal(treatment.fiscal.primaryExpenditure, control.fiscal.primaryExpenditure);
  for (let i = 0; i < 12; i++) {
    treatment = closeFiscalWeek(treatment);
  }
  let controlAfter = control;
  for (let i = 0; i < 12; i++) controlAfter = closeFiscalWeek(controlAfter);
  assert.ok(Math.abs((treatment.fiscal.publicDebt - controlAfter.fiscal.publicDebt) - 10) < 1e-9);
  assert.equal(treatment.fiscal.primaryExpenditure, controlAfter.fiscal.primaryExpenditure);
});

test("52-week fiscal-only trajectories follow baseline, balanced-primary and surplus identities", () => {
  const run = (primaryRevenue: number) => {
    let state = createInitialGameState();
    state.fiscal = { ...state.fiscal, primaryRevenue };
    const initialDebt = state.fiscal.publicDebt;
    for (let i = 0; i < 52; i++) state = closeFiscalWeek(state);
    return state.fiscal.publicDebt - initialDebt;
  };
  const baseline = run(2480);
  const balancedPrimary = run(2500);
  const primarySurplus = run(3500);
  assert.ok(Math.abs(baseline - 820) < 1e-8);
  assert.ok(Math.abs(balancedPrimary - 800) < 1e-8);
  assert.ok(Math.abs(primarySurplus + 200) < 1e-8);
  assert.ok(primarySurplus < balancedPrimary && balancedPrimary < baseline);
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

test("positive real growth and inflation raise nominal GDP, with correct annual-to-weekly conversion", () => {
  const state = createInitialGameState();
  const advanced = advanceNominalGDP(state.fiscal, 4, 5);
  const weeklyReal = Math.pow(1.04, 1 / 52) - 1;
  const weeklyInflation = Math.pow(1.05, 1 / 52) - 1;
  const expectedGrowth = (1 + weeklyReal) * (1 + weeklyInflation) - 1;
  const expected = state.fiscal.nominalGDP * (1 + expectedGrowth);
  assert.ok(Math.abs(advanced.nominalGDP - expected) < 1e-6);
  assert.ok(advanced.nominalGDP > state.fiscal.nominalGDP);
  // A single week's compounding at plausible annual rates should be a small fraction
  // of a percent, not anywhere close to the annualised rate itself.
  const weeklyShare = advanced.nominalGDP / state.fiscal.nominalGDP - 1;
  assert.ok(weeklyShare > 0 && weeklyShare < 0.01);
});

test("negative real growth with sufficient inflation can still produce positive nominal GDP growth", () => {
  const state = createInitialGameState();
  const advanced = advanceNominalGDP(state.fiscal, -2, 10);
  assert.ok(advanced.nominalGDP > state.fiscal.nominalGDP);
});

test("nominal GDP evolution recomputes debtToGDP without altering nominal public debt", () => {
  const state = createInitialGameState();
  const advanced = advanceNominalGDP(state.fiscal, 3, 4);
  assert.equal(advanced.publicDebt, state.fiscal.publicDebt);
  assert.notEqual(advanced.debtToGDP, state.fiscal.debtToGDP);
  assert.ok(Math.abs(advanced.debtToGDP - (advanced.publicDebt / advanced.nominalGDP * 100)) < 1e-9);
});

test("identical nominal debt with different nominal-GDP paths produces different debt/GDP", () => {
  const state = createInitialGameState();
  const highGrowthGDP = advanceNominalGDP(state.fiscal, 6, 6).nominalGDP;
  const lowGrowthGDP = advanceNominalGDP(state.fiscal, 0, 1).nominalGDP;
  assert.ok(highGrowthGDP > lowGrowthGDP);
  const debtToGDPHigh = state.fiscal.publicDebt / highGrowthGDP * 100;
  const debtToGDPLow = state.fiscal.publicDebt / lowGrowthGDP * 100;
  assert.ok(debtToGDPHigh < debtToGDPLow, "the same nominal debt against a larger GDP path should read as a lower ratio");
});

test("old saves hydrate a coherent fiscal ledger", () => {
  const old = createInitialGameState() as Partial<ReturnType<typeof createInitialGameState>>;
  delete old.fiscal;
  const hydrated = hydrateGameState(old);
  assert.equal(hydrated.fiscal.unit, "BRL_BILLIONS");
  assert.equal(hydrated.sovereignDebt, hydrated.fiscal.debtToGDP);
});
