import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "./gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { cancelLifecycleEntity, createLifecycleEntities, processLifecycleTurn } from "./operationsProjectsEngine.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { ensureLegislativeProceedings, resolveCongressVote } from "./congress.ts";
import type { ProposedAction } from "./actions/types.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createDraftAction } from "./actions/types.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { inferExplicitFiscalAction } from "./actions/interpretation.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { resolveTurn } from "./turn/resolveTurn.ts";
import type { TurnResult } from "./aiPrompts.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceEconomy } from "./economy/advanceEconomy.ts";

function cleanState() {
  const state = createInitialGameState();
  state.projects = [];
  state.activeOperations = [];
  state.activeProjects = 0;
  return state;
}

function projectAction(authority: ProposedAction["authority"] = { type: "EXECUTIVE" }): ProposedAction {
  return {
    id: "hospital-programme",
    actorId: "BRA",
    rawOrder: "Launch a R$12bn three-year programme to construct 20 new federal hospitals.",
    actionType: "FUND_PROJECT",
    authority,
    targets: [{ id: "BRA", type: "REGION", name: "Brazil" }],
    parameters: { amountBRL: 12_000_000_000, spendingCategory: "health", durationTurns: 156, scope: "20 hospitals" },
    estimatedCosts: [], prerequisites: [], status: "VALID", validationIssues: [],
  };
}

function infrastructureProjectAction(
  budgetBillions = 12,
  durationTurns = 3
): ProposedAction {
  return {
    id: `rail-${budgetBillions}-${durationTurns}`,
    actorId: "BRA",
    rawOrder: `Launch a R$${budgetBillions}bn federal railway infrastructure project.`,
    actionType: "FUND_PROJECT",
    authority: { type: "EXECUTIVE" },
    targets: [{ id: "BRA", type: "REGION", name: "Brazil" }],
    parameters: {
      amountBRL: budgetBillions * 1_000_000_000,
      spendingCategory: "infrastructure",
      durationTurns,
      scope: "Federal freight railway",
    },
    estimatedCosts: [], prerequisites: [], status: "VALID", validationIssues: [],
  };
}

function operationAction(authority: ProposedAction["authority"] = { type: "EXECUTIVE" }): ProposedAction {
  return {
    id: "iron-net",
    actorId: "BRA",
    rawOrder: "Launch a R$1.5bn twelve-week federal operation against PCC logistics and money-laundering networks in São Paulo.",
    actionType: "FUND_OPERATION",
    authority,
    targets: [
      { id: "pcc", type: "ORGANISATION", name: "PCC" },
      { id: "sp", type: "REGION", name: "São Paulo" },
    ],
    parameters: { amountBRL: 1_500_000_000, spendingCategory: "security", durationTurns: 12, objective: "Disrupt logistics and money laundering" },
    estimatedCosts: [], prerequisites: [], status: "VALID", validationIssues: [],
  };
}

test("authorised project creation is persistent and keeps the stable action id", () => {
  const state = createLifecycleEntities(cleanState(), [projectAction()]);
  assert.equal(state.projects.length, 1);
  assert.equal(state.projects[0].actionId, "hospital-programme");
  assert.equal(state.projects[0].lifecycle.totalBudget, 12);
  assert.equal(state.projects[0].scope, "20 hospitals");
});

test("success-condition natural-language orders interpret into lifecycle actions", () => {
  const project = inferExplicitFiscalAction(createDraftAction({ id: "p", actorId: "BRA", rawOrder: "Launch a R$12bn three-year programme to construct 20 new federal hospitals." }));
  const operation = inferExplicitFiscalAction(createDraftAction({ id: "o", actorId: "BRA", rawOrder: "Launch a R$1.5bn twelve-week federal operation against PCC logistics and money-laundering networks in São Paulo." }));
  assert.equal(project?.actionType, "FUND_PROJECT");
  assert.equal(operation?.actionType, "FUND_OPERATION");
  assert.equal(project?.parameters.amountBRL, 12_000_000_000);
  assert.equal(operation?.parameters.amountBRL, 1_500_000_000);
});

test("LLM mechanical claims cannot override a lifecycle-only operation", () => {
  const state = cleanState();
  const pccBefore = state.criminalOrganisations.find((org) => org.id === "pcc")!.capacity;
  const ai: TurnResult = {
    narrative: "Narrative only",
    effects: { approval: 20, securityIndex: 20 },
    organisationEffects: [{ id: "pcc", capacityChange: -25 }],
    stateSecurityChanges: [], newOperation: null, newProject: null,
    situationSummary: "Operation launched.", eventSummary: "Operation launched.",
  };
  const result = resolveTurn({ state, actions: [operationAction()], aiResult: ai });
  const reportReduction = result.turnRecord.lifecycleReports?.[0].operationResults?.criminalCapacityReduction ?? 0;
  const civilianCasualties = result.turnRecord.lifecycleReports?.[0].operationResults?.civilianCasualties ?? 0;
  const pccAfter = result.state.criminalOrganisations.find((org) => org.id === "pcc")!.capacity;
  assert.equal(result.generatedEffects.approval, undefined);
  const expectedApproval = civilianCasualties > 0
    ? state.approval - Math.min(4, civilianCasualties)
    : state.approval + (reportReduction >= 2.2 ? 1 : 0);
  assert.equal(result.state.approval, expectedApproval);
  assert.equal(pccAfter, pccBefore - reportReduction);
});

test("unauthorised project does not start", () => {
  const state = createLifecycleEntities(cleanState(), [projectAction({ type: "LEGISLATIVE" })]);
  assert.equal(state.projects.length, 0);
});

test("project spends and progresses once per turn without upfront double-counting", () => {
  const created = createLifecycleEntities(cleanState(), [projectAction()]);
  assert.equal(created.fiscal.ledger.length, 0);
  const once = processLifecycleTurn(created, 1).state;
  const expected = 12 / 156 * 0.9;
  assert.ok(Math.abs(once.projects[0].lifecycle.spent - expected) < 1e-10);
  assert.equal(once.fiscal.ledger.length, 1);
  assert.equal(once.fiscal.ledger[0].amount, expected);
  assert.ok(once.projects[0].lifecycle.progress > 0);
  const twiceSameTurn = processLifecycleTurn(once, 1).state;
  assert.deepEqual(twiceSameTurn, once);
});

test("infrastructure construction reaches demand once through the fiscal ledger", () => {
  const created = createLifecycleEntities(cleanState(), [infrastructureProjectAction(12, 3)]);
  const once = processLifecycleTurn(created, 1).state;
  const ledgerEntry = once.fiscal.ledger.at(-1)!;
  const economy = advanceEconomy(once, undefined, 1);

  assert.equal(ledgerEntry.originType, "PROJECT");
  assert.equal(ledgerEntry.category, "infrastructure");
  assert.ok(ledgerEntry.currentTurnCashImpact < 0);
  assert.equal(
    economy.demandContributions.oneOffFiscalImpulse,
    ledgerEntry.amount / once.fiscal.nominalGDP
  );

  const sameTurn = processLifecycleTurn(once, 1).state;
  assert.equal(sameTurn.fiscal.ledger.length, once.fiscal.ledger.length);
});

test("infrastructure capacity appears only on successful completion and exactly once", () => {
  const created = createLifecycleEntities(cleanState(), [infrastructureProjectAction(12, 2)]);
  const underConstruction = processLifecycleTurn(created, 1).state;
  assert.equal(underConstruction.projects[0].lifecycle.status, "ACTIVE");
  assert.equal(underConstruction.economyDynamics.productiveCapacityIndex, 100);

  const growthBeforeCompletion = underConstruction.gdpGrowth;
  const publicInvestmentBeforeCompletion = underConstruction.publicInvestment;
  const fdiBeforeCompletion = underConstruction.fdiFlow;
  const tradeBeforeCompletion = underConstruction.tradeBalance;
  const ledgerEntriesBeforeCompletion = underConstruction.fiscal.ledger.length;
  const completed = processLifecycleTurn(underConstruction, 2).state;
  assert.equal(completed.projects[0].lifecycle.status, "COMPLETED");
  assert.ok(completed.economyDynamics.productiveCapacityIndex > 100);
  assert.ok((completed.projects[0].completionRecord?.productiveCapacityAdded ?? 0) > 0);
  assert.equal(
    completed.gdpGrowth,
    growthBeforeCompletion,
    "completion must not directly mutate headline GDP growth"
  );
  assert.equal(
    completed.publicInvestment,
    publicInvestmentBeforeCompletion,
    "completion must not turn an investment-flow metric into a permanent stock bonus"
  );
  assert.equal(completed.fdiFlow, fdiBeforeCompletion, "infrastructure completion must not add a flat FDI bonus");
  assert.equal(completed.tradeBalance, tradeBeforeCompletion, "infrastructure completion must not add a flat trade bonus");
  assert.equal(
    completed.fiscal.ledger.length,
    ledgerEntriesBeforeCompletion + 1,
    "the completion turn should post construction cash flow only, not a second capacity expense"
  );

  const capacity = completed.economyDynamics.productiveCapacityIndex;
  const ledgerLength = completed.fiscal.ledger.length;
  const again = processLifecycleTurn(completed, 3).state;
  assert.equal(again.economyDynamics.productiveCapacityIndex, capacity);
  assert.equal(again.fiscal.ledger.length, ledgerLength);
});

test("larger completed infrastructure creates more capacity than a smaller project", () => {
  const small = processLifecycleTurn(
    createLifecycleEntities(cleanState(), [infrastructureProjectAction(0.5, 1)]),
    1
  ).state;
  const large = processLifecycleTurn(
    createLifecycleEntities(cleanState(), [infrastructureProjectAction(50, 1)]),
    1
  ).state;
  assert.ok(
    large.economyDynamics.productiveCapacityIndex
      > small.economyDynamics.productiveCapacityIndex
  );
});

test("failed and cancelled infrastructure receive no completed capacity", () => {
  let failing = createLifecycleEntities(cleanState(), [infrastructureProjectAction(12, 3)]);
  failing.fiscal.discretionaryBudgetAvailable = 0;
  failing.fiscal.debtToGDP = 130;
  for (let turn = 1; turn <= 4; turn++) failing = processLifecycleTurn(failing, turn).state;
  assert.equal(failing.projects[0].lifecycle.status, "FAILED");
  assert.equal(failing.economyDynamics.productiveCapacityIndex, 100);

  const running = processLifecycleTurn(
    createLifecycleEntities(cleanState(), [infrastructureProjectAction(12, 3)]),
    1
  ).state;
  const cancelled = cancelLifecycleEntity(running, running.projects[0].id);
  const later = processLifecycleTurn(cancelled, 2).state;
  assert.equal(later.projects[0].lifecycle.status, "CANCELLED");
  assert.equal(later.economyDynamics.productiveCapacityIndex, 100);
});

test("insufficient financing stalls and prolonged lack of funding fails a project", () => {
  let state = createLifecycleEntities(cleanState(), [projectAction()]);
  state.fiscal.discretionaryBudgetAvailable = 0;
  state.fiscal.debtToGDP = 130;
  for (let turn = 1; turn <= 4; turn++) state = processLifecycleTurn(state, turn).state;
  assert.equal(state.projects[0].lifecycle.status, "FAILED");
  assert.equal(state.projects[0].lifecycle.spent, 0);
});

test("project completion and its conservative effect occur exactly once", () => {
  const short = { ...projectAction(), parameters: { amountBRL: 1_000_000_000, spendingCategory: "health", durationTurns: 1 } };
  const created = createLifecycleEntities(cleanState(), [short]);
  const completed = processLifecycleTurn(created, 1).state;
  assert.equal(completed.projects[0].lifecycle.status, "COMPLETED");
  assert.equal(completed.approval, created.approval + 3);
  assert.ok(completed.projects[0].completionRecord);
  const again = processLifecycleTurn(completed, 2).state;
  assert.equal(again.approval, completed.approval);
  assert.equal(again.fiscal.ledger.length, completed.fiscal.ledger.length);
});

test("project cancellation stops expenditure and preserves sunk cost", () => {
  const running = processLifecycleTurn(createLifecycleEntities(cleanState(), [projectAction()]), 1).state;
  const spent = running.projects[0].lifecycle.spent;
  const cancelled = cancelLifecycleEntity(running, running.projects[0].id);
  const later = processLifecycleTurn(cancelled, 2).state;
  assert.equal(later.projects[0].lifecycle.status, "CANCELLED");
  assert.equal(later.projects[0].lifecycle.spent, spent);
  assert.equal(later.fiscal.ledger.length, running.fiscal.ledger.length);
});

test("passed legislative project becomes authorised while failed bill creates nothing", () => {
  const action = projectAction({ type: "LEGISLATIVE", institution: "National Congress" });
  let passing = cleanState(); passing.congressionalSupport = 90;
  passing = ensureLegislativeProceedings(passing, [action], 1);
  const passed = resolveCongressVote(passing, passing.legislativeProceedings[0].id);
  assert.equal(passed.voteResult?.passed, true);
  assert.equal(passed.state.projects.length, 1);
  assert.equal(passed.state.fiscal.ledger.length, 0);
  let failing = cleanState(); failing.congressionalSupport = 10;
  failing = ensureLegislativeProceedings(failing, [{ ...action, id: "failed-project" }], 1);
  const failed = resolveCongressVote(failing, failing.legislativeProceedings[0].id);
  assert.equal(failed.voteResult?.passed, false);
  assert.equal(failed.state.projects.length, 0);
});

test("authorised operation receives funding and reproducible seeded outcomes", () => {
  const created = createLifecycleEntities(cleanState(), [operationAction()]);
  assert.equal(created.activeOperations[0].actionId, "iron-net");
  assert.equal(created.fiscal.ledger.length, 0);
  const first = processLifecycleTurn(created, 1);
  const second = processLifecycleTurn(created, 1);
  assert.deepEqual(first, second);
  assert.equal(first.state.activeOperations[0].lifecycle.spent, 1.5 / 12);
  assert.equal(first.state.fiscal.ledger.length, 1);
  assert.ok(first.state.activeOperations[0].thisTurnResults.arrests > 0);
});

test("operation changes criminal capacity and persists seizures and casualties", () => {
  const state = processLifecycleTurn(createLifecycleEntities(cleanState(), [operationAction()]), 1).state;
  const pcc = state.criminalOrganisations.find((org) => org.id === "pcc")!;
  const operation = state.activeOperations[0];
  assert.ok(pcc.capacity < 78);
  assert.equal(state.anipAssetsFrozen, 0.8 + operation.thisTurnResults.assetsSeized);
  assert.equal(operation.cumulativeResults.governmentCasualties, operation.thisTurnResults.governmentCasualties);
  assert.equal(operation.cumulativeResults.civilianCasualties, operation.thisTurnResults.civilianCasualties);
});

test("operation cancellation stops future processing and keeps results", () => {
  const running = processLifecycleTurn(createLifecycleEntities(cleanState(), [operationAction()]), 1).state;
  const result = structuredClone(running.activeOperations[0].cumulativeResults);
  const cancelled = cancelLifecycleEntity(running, running.activeOperations[0].id);
  const later = processLifecycleTurn(cancelled, 2).state;
  assert.equal(later.activeOperations[0].status, "cancelled");
  assert.deepEqual(later.activeOperations[0].cumulativeResults, result);
  assert.equal(later.fiscal.ledger.length, running.fiscal.ledger.length);
});

test("short operation completes only once", () => {
  const action = { ...operationAction(), parameters: { amountBRL: 100_000_000, durationTurns: 1, spendingCategory: "security" } };
  const completed = processLifecycleTurn(createLifecycleEntities(cleanState(), [action]), 1).state;
  assert.equal(completed.activeOperations[0].lifecycle.status, "COMPLETED");
  const again = processLifecycleTurn(completed, 2).state;
  assert.deepEqual(again, completed);
});

test("engine is immutable and old saves hydrate lifecycle fields", () => {
  const state = createLifecycleEntities(cleanState(), [projectAction(), operationAction()]);
  const snapshot = structuredClone(state);
  processLifecycleTurn(state, 1);
  assert.deepEqual(state, snapshot);
  const old = createInitialGameState() as ReturnType<typeof createInitialGameState>;
  const oldProject = { id: "old", name: "Old project", category: "Social" as const, startTurn: 1, endTurn: 4, statusText: "Working", unlocks: "Asset" };
  const oldOperation = { id: "old-op", name: "Old operation", type: "police" as const, location: "Brazil", objective: "Test", startTurn: 1, status: "active" as const, leadAgency: "PF" };
  const saved = { ...old, projects: [oldProject], activeOperations: [oldOperation] };
  const hydrated = hydrateGameState(saved as unknown as Partial<typeof old>);
  assert.equal(hydrated.projects[0].actionId, "legacy-old");
  assert.equal(hydrated.activeOperations[0].lifecycle.status, "ACTIVE");
});
