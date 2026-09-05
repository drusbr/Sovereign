import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { appendTurnMetricsSnapshot, buildTurnMetricsSnapshot } from "./snapshot.ts";
import type { GameState } from "../gameState.ts";

test("builds a snapshot with exact economy/politics/security values from GameState", () => {
  const state: GameState = createInitialGameState();
  const snapshot = buildTurnMetricsSnapshot(state, state.turn, 3);
  assert.equal(snapshot.turn, state.turn);
  assert.equal(snapshot.date, state.date);
  assert.deepEqual(snapshot.economy, {
    gdpGrowth: state.gdpGrowth,
    inflation: state.inflation,
    unemployment: state.unemployment,
    fdiFlow: state.fdiFlow,
    tradeBalance: state.tradeBalance,
  });
  assert.deepEqual(snapshot.politics, {
    approval: state.approval,
    congressionalSupport: state.congressionalSupport,
  });
  assert.deepEqual(snapshot.security, { securityIndex: state.securityIndex });
  assert.equal(snapshot.activity.actionsIssued, 3);
});

test("records FiscalState values exactly, field for field", () => {
  const state: GameState = createInitialGameState();
  const snapshot = buildTurnMetricsSnapshot(state, state.turn, 0);
  assert.deepEqual(snapshot.fiscal, {
    nominalGDP: state.fiscal.nominalGDP,
    annualRevenue: state.fiscal.annualRevenue,
    annualExpenditure: state.fiscal.annualExpenditure,
    primaryBalance: state.fiscal.primaryBalance,
    nominalBalance: state.fiscal.nominalBalance,
    publicDebt: state.fiscal.publicDebt,
    debtToGDP: state.fiscal.debtToGDP,
    discretionaryBudgetAvailable: state.fiscal.discretionaryBudgetAvailable,
  });
});

test("records Economic Simulation V2 (economyDynamics) values exactly", () => {
  const state: GameState = createInitialGameState();
  const mutated: GameState = {
    ...state,
    economyDynamics: { ...state.economyDynamics, demandPressure: 0.01, outputGap: 0.02, inflationPressure: 0.03, labourSlack: -0.01 },
  };
  const snapshot = buildTurnMetricsSnapshot(mutated, mutated.turn, 0);
  assert.deepEqual(snapshot.economyDynamics, {
    demandPressure: 0.01,
    outputGap: 0.02,
    inflationPressure: 0.03,
    labourSlack: -0.01,
  });
});

test("stores counts, not full nested entities, for projects/operations/proceedings", () => {
  const state: GameState = createInitialGameState();
  const snapshot = buildTurnMetricsSnapshot(state, state.turn, 0);
  assert.equal(typeof snapshot.activity.activeProjects, "number");
  assert.equal(typeof snapshot.activity.activeOperations, "number");
  assert.equal(typeof snapshot.activity.activeLegislativeProceedings, "number");
  assert.equal(snapshot.activity.activeOperations, state.activeOperations.length);
  // No nested arrays/objects representing projects, operations, proceedings, articles,
  // encounters, or recommendations anywhere in the snapshot.
  const serialised = JSON.stringify(snapshot);
  assert.ok(!serialised.includes("lifecycle"));
  assert.ok(!serialised.includes("legislativeProceedings"));
  assert.ok(!serialised.includes("responsibleInstitution"));
});

test("counts only proceedings still in progress as active", () => {
  const state: GameState = createInitialGameState();
  const withProceedings: GameState = {
    ...state,
    legislativeProceedings: [
      { id: "b1", status: "INTRODUCED" } as GameState["legislativeProceedings"][number],
      { id: "b2", status: "PASSED" } as GameState["legislativeProceedings"][number],
      { id: "b3", status: "NEGOTIATING" } as GameState["legislativeProceedings"][number],
      { id: "b4", status: "FAILED" } as GameState["legislativeProceedings"][number],
    ],
  };
  const snapshot = buildTurnMetricsSnapshot(withProceedings, withProceedings.turn, 0);
  assert.equal(snapshot.activity.activeLegislativeProceedings, 2);
});

test("appendTurnMetricsSnapshot adds exactly one entry and caps history length", () => {
  const state: GameState = createInitialGameState();
  const snapshot = buildTurnMetricsSnapshot(state, state.turn, 0);
  const history = appendTurnMetricsSnapshot([], snapshot);
  assert.equal(history.length, 1);
  assert.deepEqual(history[0], snapshot);
});

test("old saves without turnMetricsHistory hydrate to an empty series, not a fabricated one", () => {
  const oldSave = createInitialGameState() as Partial<GameState>;
  delete oldSave.turnMetricsHistory;
  assert.deepEqual(hydrateGameState(oldSave).turnMetricsHistory, []);
});

test("the snapshot's turn number is the explicit parameter, not state.turn", () => {
  // Regression test: this is the exact shape of the finalizeTurn bug — state.turn had
  // already advanced to the next turn by the time the snapshot used to be built, so
  // the completed turn must be an explicit argument, never inferred from state.turn.
  const state: GameState = createInitialGameState();
  const alreadyAdvancedState: GameState = { ...state, turn: state.turn + 1 };
  const snapshot = buildTurnMetricsSnapshot(alreadyAdvancedState, state.turn, 0);
  assert.equal(snapshot.turn, state.turn);
  assert.notEqual(snapshot.turn, alreadyAdvancedState.turn);
});

test("a fresh campaign starts with a Turn 0 snapshot representing the initial state", () => {
  const state: GameState = createInitialGameState();
  assert.equal(state.turnMetricsHistory.length, 1);
  assert.equal(state.turnMetricsHistory[0].turn, 0);
  assert.equal(state.turnMetricsHistory[0].economy.gdpGrowth, state.gdpGrowth);
});
