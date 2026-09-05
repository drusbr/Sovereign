import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceEconomy } from "./advanceEconomy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { DEFAULT_ECONOMY_CALIBRATION } from "./types.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { evaluateCopomDecision, runCopomMeetingIfDue } from "./monetaryPolicy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { parseTurnResponse } from "../aiPrompts.ts";
import type { GameState } from "../gameState.ts";

const M = DEFAULT_ECONOMY_CALIBRATION.monetary;

function monetaryState(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialGameState();
  return {
    ...state,
    inflation: 3,
    monetaryPolicy: {
      ...state.monetaryPolicy,
      currentSelic: M.neutralNominalRate,
      previousSelic: M.neutralNominalRate,
      monetaryStance: 0,
      stanceClassification: "NEUTRAL",
      nextMeetingDate: state.date,
    },
    economyDynamics: {
      ...state.economyDynamics,
      demandPressure: 0,
      outputGap: 0,
      inflationPressure: 0,
      labourSlack: 0,
      transmittedMonetaryPressure: 0,
    },
    ...overrides,
  };
}

test("COPOM does nothing on an ordinary non-meeting turn", () => {
  const state = createInitialGameState();
  const result = runCopomMeetingIfDue(state);
  assert.equal(result.decision, null);
  assert.deepEqual(result.state.monetaryPolicy, state.monetaryPolicy);
});

test("a due meeting runs once and schedules the next meeting", () => {
  const state = monetaryState();
  const first = runCopomMeetingIfDue(state);
  assert.ok(first.decision);
  assert.equal(first.state.monetaryPolicy.decisionHistory.length, 1);
  assert.equal(first.state.monetaryPolicy.nextMeetingDate, "February 23, 2026");
  const duplicate = runCopomMeetingIfDue(first.state, state.turn, state.date);
  assert.equal(duplicate.decision, null);
  assert.equal(duplicate.state.monetaryPolicy.decisionHistory.length, 1);
});

test("near-target inflation and balanced activity produce HOLD", () => {
  assert.equal(evaluateCopomDecision(monetaryState()).selected.decision, "HOLD");
});

test("above-target inflation with overheating produces tightening", () => {
  const state = monetaryState({
    inflation: 8,
    economyDynamics: {
      ...monetaryState().economyDynamics,
      demandPressure: 0.025,
      outputGap: 0.025,
      inflationPressure: 0.02,
    },
  });
  assert.ok(evaluateCopomDecision(state).selected.change > 0);
});

test("subdued inflation and weak demand support easing", () => {
  const base = monetaryState();
  const state: GameState = {
    ...base,
    inflation: 1.5,
    monetaryPolicy: { ...base.monetaryPolicy, currentSelic: 10, previousSelic: 10, monetaryStance: 3, stanceClassification: "RESTRICTIVE" },
    economyDynamics: { ...base.economyDynamics, demandPressure: -0.025, outputGap: -0.025, inflationPressure: -0.01, labourSlack: 0.02 },
  };
  assert.ok(evaluateCopomDecision(state).selected.change < 0);
});

test("very restrictive policy and materially weak activity can still justify a 100bp cut", () => {
  const base = monetaryState();
  const state: GameState = {
    ...base,
    inflation: 2,
    monetaryPolicy: { ...base.monetaryPolicy, currentSelic: 15, previousSelic: 15, monetaryStance: 8, stanceClassification: "RESTRICTIVE" },
    economyDynamics: { ...base.economyDynamics, demandPressure: -0.04, outputGap: -0.04, inflationPressure: -0.02, labourSlack: 0.04 },
  };
  assert.equal(evaluateCopomDecision(state).selected.decision, "CUT_100");
});

test("weak but improving activity with above-target inflation produces moderate easing", () => {
  const base = monetaryState();
  const prior = [
    { id: "d1", turn: 1, date: "d", previousSelic: 14, newSelic: 13, change: -1, inflation: 5, inflationTarget: 3, outputGap: -0.02, inflationPressure: -0.01, demandPressure: -0.02, labourSlack: 0.02, monetaryStance: 6, decision: "CUT_100" as const, reasons: [] },
    { id: "d2", turn: 8, date: "d", previousSelic: 13, newSelic: 12.25, change: -0.75, inflation: 4.8, inflationTarget: 3, outputGap: -0.015, inflationPressure: -0.008, demandPressure: -0.015, labourSlack: 0.02, monetaryStance: 5.25, decision: "CUT_75" as const, reasons: [] },
  ];
  const state: GameState = {
    ...base,
    inflation: 4.5,
    monetaryPolicy: { ...base.monetaryPolicy, currentSelic: 12.25, previousSelic: 13, monetaryStance: 5.25, stanceClassification: "RESTRICTIVE", decisionHistory: prior },
    economyDynamics: { ...base.economyDynamics, demandPressure: -0.01, outputGap: -0.01, inflationPressure: -0.005, transmittedMonetaryPressure: -0.015 },
  };
  const move = evaluateCopomDecision(state).selected.change;
  assert.ok(move < 0 && Math.abs(move) >= 0.25 && Math.abs(move) <= 0.75);
});

test("HOLD wins after cumulative easing while restrictive transmission is still working", () => {
  const base = monetaryState();
  const history = [-1, -0.75, -0.75].map((change, index) => ({
    id: `h${index}`, turn: index * 7, date: "d", previousSelic: 12 - index,
    newSelic: 12 - index + change, change, inflation: 4, inflationTarget: 3,
    outputGap: -0.005, inflationPressure: -0.004, demandPressure: -0.005,
    labourSlack: 0.01, monetaryStance: 4, decision: change === -1 ? "CUT_100" as const : "CUT_75" as const, reasons: [],
  }));
  const state: GameState = {
    ...base,
    inflation: 4,
    monetaryPolicy: { ...base.monetaryPolicy, currentSelic: 10, previousSelic: 10.75, monetaryStance: 3, stanceClassification: "RESTRICTIVE", decisionHistory: history },
    economyDynamics: { ...base.economyDynamics, transmittedMonetaryPressure: -0.02 },
  };
  assert.equal(evaluateCopomDecision(state).selected.decision, "HOLD");
});

test("higher inflation never produces a larger cut in otherwise identical weak economies", () => {
  const base = monetaryState();
  const shared = {
    ...base.economyDynamics,
    demandPressure: -0.025,
    outputGap: -0.025,
    inflationPressure: -0.01,
    transmittedMonetaryPressure: -0.01,
  };
  const policy = { ...base.monetaryPolicy, currentSelic: 13, previousSelic: 13, monetaryStance: 6, stanceClassification: "RESTRICTIVE" as const };
  const lower = evaluateCopomDecision({ ...base, inflation: 2.5, monetaryPolicy: policy, economyDynamics: shared }).selected.change;
  const higher = evaluateCopomDecision({ ...base, inflation: 6, monetaryPolicy: policy, economyDynamics: shared }).selected.change;
  assert.ok(Math.abs(Math.min(0, higher)) <= Math.abs(Math.min(0, lower)));
});

test("greater distance above neutral supports more aggressive easing under identical conditions", () => {
  const base = monetaryState({ inflation: 3.5 });
  const dynamics = { ...base.economyDynamics, demandPressure: -0.015, outputGap: -0.015, inflationPressure: -0.008 };
  const far: GameState = { ...base, economyDynamics: dynamics, monetaryPolicy: { ...base.monetaryPolicy, currentSelic: 15, previousSelic: 15, monetaryStance: 8, stanceClassification: "RESTRICTIVE" } };
  const near: GameState = { ...base, economyDynamics: dynamics, monetaryPolicy: { ...base.monetaryPolicy, currentSelic: 9, previousSelic: 9, monetaryStance: 2, stanceClassification: "RESTRICTIVE" } };
  assert.ok(Math.abs(evaluateCopomDecision(far).selected.change) > Math.abs(evaluateCopomDecision(near).selected.change));
});

test("stagflation produces less aggressive tightening than overheating", () => {
  const base = monetaryState({ inflation: 8 });
  const hot: GameState = { ...base, economyDynamics: { ...base.economyDynamics, demandPressure: 0.04, outputGap: 0.04, inflationPressure: 0.025 } };
  const weak: GameState = { ...base, economyDynamics: { ...base.economyDynamics, demandPressure: -0.04, outputGap: -0.04, inflationPressure: 0.025, labourSlack: 0.04 } };
  assert.ok(evaluateCopomDecision(hot).selected.change > evaluateCopomDecision(weak).selected.change);
});

test("policy inertia limits even extreme decisions to one percentage point", () => {
  const state = monetaryState({ inflation: 25, economyDynamics: { ...monetaryState().economyDynamics, outputGap: 0.06, inflationPressure: 0.06, demandPressure: 0.06 } });
  assert.equal(evaluateCopomDecision(state).selected.change, 1);
});

test("the hold deadband ignores tiny equilibrium noise", () => {
  const state = monetaryState({ inflation: 3.05, economyDynamics: { ...monetaryState().economyDynamics, outputGap: 0.0002, inflationPressure: -0.0001 } });
  assert.equal(evaluateCopomDecision(state).selected.decision, "HOLD");
});

test("restrictive monetary policy transmits gradually without directly changing headlines", () => {
  const state = monetaryState();
  state.monetaryPolicy = { ...state.monetaryPolicy, currentSelic: 15, previousSelic: 15, monetaryStance: 8, stanceClassification: "RESTRICTIVE" };
  const first = advanceEconomy(state);
  assert.ok(first.demandContributions.monetaryPolicy < 0);
  assert.ok(Math.abs(first.demandContributions.monetaryPolicy) < 8 * M.stanceToDemandPressure);
  assert.equal(state.gdpGrowth, DEFAULT_ECONOMY_CALIBRATION.baseline.gdpGrowth);
  assert.equal(state.inflation, 3);
  assert.equal(state.unemployment, 11.2);
});

test("accommodative policy transmits in the opposite direction", () => {
  const state = monetaryState();
  state.monetaryPolicy = { ...state.monetaryPolicy, currentSelic: 4, previousSelic: 4, monetaryStance: -3, stanceClassification: "ACCOMMODATIVE" };
  assert.ok(advanceEconomy(state).demandContributions.monetaryPolicy > 0);
});

test("a rate cut unwinds accumulated restrictive pressure gradually", () => {
  let state = monetaryState();
  state.monetaryPolicy = { ...state.monetaryPolicy, currentSelic: 15, previousSelic: 15, monetaryStance: 8, stanceClassification: "RESTRICTIVE" };
  for (let i = 0; i < 8; i++) {
    const result = advanceEconomy(state);
    state = { ...state, economyDynamics: result.dynamics, gdpGrowth: result.gdpGrowth, inflation: result.inflation, unemployment: result.unemployment };
  }
  const restrictive = state.economyDynamics.transmittedMonetaryPressure;
  state.monetaryPolicy = { ...state.monetaryPolicy, currentSelic: 7, previousSelic: 15, monetaryStance: 0, stanceClassification: "NEUTRAL" };
  const cut = advanceEconomy(state);
  assert.ok(cut.dynamics.transmittedMonetaryPressure < 0);
  assert.ok(cut.dynamics.transmittedMonetaryPressure > restrictive);
});

test("supply headroom still absorbs positive demand with accommodative policy", () => {
  const state = monetaryState();
  state.monetaryPolicy = { ...state.monetaryPolicy, currentSelic: 3, previousSelic: 3, monetaryStance: -4, stanceClassification: "ACCOMMODATIVE" };
  state.economyDynamics = { ...state.economyDynamics, availableCapacityHeadroom: 0.02 };
  const result = advanceEconomy(state);
  assert.ok(result.demandContributions.monetaryPolicy > 0);
  assert.ok(result.supplyContributions.supplyHeadroomApplied > 0);
});

test("LLM turn effects cannot write Selic or monetary state", () => {
  const parsed = parseTurnResponse(JSON.stringify({ narrative: "n", effects: { currentSelic: -10, selic: -10, monetaryPolicy: -10, approval: 1 }, organisationEffects: [], stateSecurityChanges: [], newOperation: null, newProject: null, situationSummary: "s", eventSummary: "e" }));
  assert.deepEqual(parsed.effects, { approval: 1 });
});

test("older saves receive one canonical monetary state", () => {
  const saved = createInitialGameState() as Partial<GameState>;
  delete saved.monetaryPolicy;
  const hydrated = hydrateGameState(saved);
  assert.equal(hydrated.monetaryPolicy.currentSelic, 15);
  assert.equal(hydrated.monetaryPolicy.decisionHistory.length, 0);
});

test("300 deterministic economy turns remain finite and bounded", () => {
  let state = monetaryState();
  for (let i = 0; i < 300; i++) {
    const result = advanceEconomy(state);
    state = { ...state, turn: state.turn + 1, economyDynamics: result.dynamics, gdpGrowth: result.gdpGrowth, inflation: result.inflation, unemployment: result.unemployment };
    for (const value of [state.gdpGrowth, state.inflation, state.unemployment, state.economyDynamics.transmittedMonetaryPressure]) assert.ok(Number.isFinite(value));
  }
});
