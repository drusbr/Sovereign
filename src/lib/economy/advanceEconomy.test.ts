import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceEconomy } from "./advanceEconomy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { DEFAULT_ECONOMY_CALIBRATION, createInitialEconomyDynamics } from "./types.ts";
import type { GameState } from "../gameState.ts";
import type { EconomyDynamics } from "./types.ts";

const BASELINE = DEFAULT_ECONOMY_CALIBRATION.baseline;

function baseState(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialGameState();
  return {
    ...state,
    gdpGrowth: BASELINE.gdpGrowth,
    inflation: BASELINE.inflation,
    unemployment: BASELINE.unemployment,
    economyDynamics: createInitialEconomyDynamics(state.turn),
    ...overrides,
  };
}

/** Advances a state N turns with advanceEconomy, applying its own output back each
 *  turn — mirrors how runTurnTick threads it. `fiscalForTurn` lets a test express a
 *  one-off (turn-scoped ledger) or a permanent (persisted primaryExpenditure/Revenue)
 *  fiscal condition for each step. */
function stepTurns(
  initial: GameState,
  turns: number,
  fiscalForTurn: (turn: number, state: GameState) => GameState["fiscal"] = (_t, s) => s.fiscal
): GameState[] {
  let state = initial;
  const history: GameState[] = [];
  for (let i = 0; i < turns; i++) {
    const turn = state.turn + 1;
    const stepped = { ...state, turn, fiscal: fiscalForTurn(turn, state) };
    const result = advanceEconomy(stepped);
    state = {
      ...stepped,
      gdpGrowth: result.gdpGrowth,
      inflation: result.inflation,
      unemployment: result.unemployment,
      economyDynamics: result.dynamics,
    };
    history.push(state);
  }
  return history;
}

function permanentExpenditureCut(amount: number) {
  return (_turn: number, state: GameState) => ({
    ...state.fiscal,
    primaryExpenditure: BASELINE.primaryExpenditure - amount,
    ledger: [],
  });
}

function permanentExpenditureIncrease(amount: number) {
  return (_turn: number, state: GameState) => ({
    ...state.fiscal,
    primaryExpenditure: BASELINE.primaryExpenditure + amount,
    ledger: [],
  });
}

test("is deterministic for identical state", () => {
  const state = baseState({
    fiscal: { ...createInitialGameState().fiscal, primaryExpenditure: BASELINE.primaryExpenditure - 20 },
  });
  const a = advanceEconomy(state);
  const b = advanceEconomy(state);
  assert.deepEqual(a, b);
});

test("recurring expenditure increase raises demand pressure relative to baseline", () => {
  const state = baseState({
    fiscal: { ...createInitialGameState().fiscal, primaryExpenditure: BASELINE.primaryExpenditure + 20 },
  });
  const result = advanceEconomy(state);
  assert.ok(result.dynamics.demandPressure > 0);
  assert.ok(result.demandContributions.recurringGovernmentSpending > 0);
});

test("recurring expenditure reduction lowers demand pressure", () => {
  const state = baseState({
    fiscal: { ...createInitialGameState().fiscal, primaryExpenditure: BASELINE.primaryExpenditure - 20 },
  });
  const result = advanceEconomy(state);
  assert.ok(result.dynamics.demandPressure < 0);
});

test("recurring tax increase lowers demand pressure", () => {
  const state = baseState({
    fiscal: { ...createInitialGameState().fiscal, primaryRevenue: BASELINE.primaryRevenue + 20 },
  });
  const result = advanceEconomy(state);
  assert.ok(result.dynamics.demandPressure < 0);
  assert.ok(result.demandContributions.recurringRevenueMeasures < 0);
});

test("recurring tax reduction raises demand pressure", () => {
  const state = baseState({
    fiscal: { ...createInitialGameState().fiscal, primaryRevenue: BASELINE.primaryRevenue - 20 },
  });
  const result = advanceEconomy(state);
  assert.ok(result.dynamics.demandPressure > 0);
});

test("equal nominal spending and tax changes are not forced to identical short-run effects", () => {
  const expenditureCut = advanceEconomy(
    baseState({ fiscal: { ...createInitialGameState().fiscal, primaryExpenditure: BASELINE.primaryExpenditure - 20 } })
  );
  const taxIncrease = advanceEconomy(
    baseState({ fiscal: { ...createInitialGameState().fiscal, primaryRevenue: BASELINE.primaryRevenue + 20 } })
  );
  assert.notEqual(
    Math.abs(expenditureCut.dynamics.demandPressure),
    Math.abs(taxIncrease.dynamics.demandPressure)
  );
});

test("a recurring measure keeps influencing stance over later turns without being counted again as a fresh transaction", () => {
  const history = stepTurns(baseState(), 10, permanentExpenditureCut(20));
  const early = history[1].economyDynamics.demandPressure;
  const late = history[9].economyDynamics.demandPressure;
  // Should converge to a stable negative level, not keep compounding turn over turn
  // as if a fresh R$20bn cut landed every single turn.
  assert.ok(late < 0);
  assert.ok(Math.abs(late - early) < Math.abs(early) * 2, "stance should stabilise, not keep growing unboundedly");
  const last3 = history.slice(-3).map((s) => s.economyDynamics.demandPressure);
  assert.ok(Math.abs(last3[2] - last3[0]) < 0.0005, "should have settled by the last few turns");
});

test("a one-off measure fades rather than permanently shifting stance", () => {
  let firstLedger = true;
  const history = stepTurns(baseState(), 8, (turn, state) => {
    if (firstLedger) {
      firstLedger = false;
      return {
        ...state.fiscal,
        ledger: [
          {
            id: "oneoff", actionId: "a1", turn, date: "d", kind: "EMERGENCY_ALLOCATION", timing: "ONE_OFF",
            amount: 20, category: "other", balanceImpact: -20, debtImpact: 20, funding: "DEFICIT_FINANCED",
            description: "test", originType: "ACTION", annualRunRateImpact: 0, currentTurnCashImpact: -20,
          },
        ],
      };
    }
    return { ...state.fiscal, ledger: [] };
  });
  const peak = history[0].economyDynamics.demandPressure;
  const later = history[7].economyDynamics.demandPressure;
  assert.ok(peak > 0);
  assert.ok(later >= 0);
  assert.ok(later < peak, "the one-off's contribution should fade rather than persist at full strength");
});

test("contraction: output moves before unemployment fully reacts", () => {
  const history = stepTurns(baseState(), 6, permanentExpenditureCut(40));
  const gdpDeltaAtTurn2 = Math.abs(history[1].gdpGrowth - BASELINE.gdpGrowth);
  const unemploymentDeltaAtTurn2 = Math.abs(history[1].unemployment - BASELINE.unemployment);
  assert.ok(gdpDeltaAtTurn2 > 0);
  assert.ok(
    unemploymentDeltaAtTurn2 < gdpDeltaAtTurn2,
    "unemployment should lag behind the output response"
  );
});

test("inflation response is gradual rather than immediate", () => {
  const history = stepTurns(baseState(), 8, permanentExpenditureIncrease(40));
  const turn1Delta = Math.abs(history[0].inflation - BASELINE.inflation);
  const turn8Delta = Math.abs(history[7].inflation - BASELINE.inflation);
  assert.ok(turn1Delta > 0);
  assert.ok(turn1Delta < turn8Delta, "inflation should still be building toward its eventual level, not there immediately");
});

test("labour response is lagged relative to output", () => {
  const start = baseState();
  const history = stepTurns(start, 30, permanentExpenditureCut(40));
  // Compare how much of the eventual (turn-30, near-converged) move each field has
  // covered by turn 3 — output should have covered proportionally more of its journey
  // than unemployment has of its own, since labour responds with the longer lag.
  const outputTotal = Math.abs(history[29].gdpGrowth - start.gdpGrowth);
  const labourTotal = Math.abs(history[29].unemployment - start.unemployment);
  const outputProgressAt3 = Math.abs(history[2].gdpGrowth - start.gdpGrowth) / outputTotal;
  const labourProgressAt3 = Math.abs(history[2].unemployment - start.unemployment) / labourTotal;
  assert.ok(outputTotal > 0 && labourTotal > 0);
  assert.ok(
    outputProgressAt3 > labourProgressAt3,
    `expected output to have covered more of its journey by turn 3 (output ${outputProgressAt3}, labour ${labourProgressAt3})`
  );
});

test("expansion reverses direction plausibly relative to contraction", () => {
  const contraction = stepTurns(baseState(), 6, permanentExpenditureCut(40));
  const expansion = stepTurns(baseState(), 6, permanentExpenditureIncrease(40));
  assert.ok(contraction[5].gdpGrowth < BASELINE.gdpGrowth);
  assert.ok(expansion[5].gdpGrowth > BASELINE.gdpGrowth);
  assert.ok(contraction[5].unemployment > BASELINE.unemployment);
  assert.ok(expansion[5].unemployment < BASELINE.unemployment);
});

test("no fiscal shocks and stable stance remain close to baseline, not drifting indefinitely", () => {
  const history = stepTurns(baseState(), 50);
  const last = history[49];
  assert.ok(Math.abs(last.gdpGrowth - BASELINE.gdpGrowth) < 0.01);
  assert.ok(Math.abs(last.inflation - BASELINE.inflation) < 0.01);
  assert.ok(Math.abs(last.unemployment - BASELINE.unemployment) < 0.01);
  assert.equal(last.economyDynamics.demandPressure, 0);
});

test("200+ neutral turns remain bounded, stable, and free of NaN/Infinity", () => {
  const history = stepTurns(baseState(), 220);
  for (const state of history) {
    for (const value of [
      state.gdpGrowth, state.inflation, state.unemployment,
      state.economyDynamics.demandPressure, state.economyDynamics.outputGap,
      state.economyDynamics.inflationPressure, state.economyDynamics.labourSlack,
    ]) {
      assert.ok(Number.isFinite(value), `expected a finite number, got ${value}`);
    }
    assert.ok(state.gdpGrowth >= DEFAULT_ECONOMY_CALIBRATION.bounds.gdpGrowthMin);
    assert.ok(state.gdpGrowth <= DEFAULT_ECONOMY_CALIBRATION.bounds.gdpGrowthMax);
    assert.ok(state.inflation >= DEFAULT_ECONOMY_CALIBRATION.bounds.inflationMin);
    assert.ok(state.inflation <= DEFAULT_ECONOMY_CALIBRATION.bounds.inflationMax);
    assert.ok(state.unemployment >= DEFAULT_ECONOMY_CALIBRATION.bounds.unemploymentMin);
    assert.ok(state.unemployment <= DEFAULT_ECONOMY_CALIBRATION.bounds.unemploymentMax);
  }
});

test("repeated permanent shocks stay bounded — no infinite-growth exploit", () => {
  // Escalate the recurring cut every few turns (simulating a player repeatedly
  // "stacking" policy) far beyond anything Policy Development would ever generate.
  const history = stepTurns(baseState(), 60, (turn, state) => ({
    ...state.fiscal,
    primaryExpenditure: BASELINE.primaryExpenditure - Math.min(turn * 50, 5000),
    ledger: [],
  }));
  for (const state of history) {
    const d: EconomyDynamics = state.economyDynamics;
    assert.ok(Number.isFinite(d.demandPressure) && Math.abs(d.demandPressure) <= DEFAULT_ECONOMY_CALIBRATION.bounds.demandPressure + 1e-9);
    assert.ok(Number.isFinite(d.outputGap) && Math.abs(d.outputGap) <= DEFAULT_ECONOMY_CALIBRATION.bounds.outputGap + 1e-9);
    assert.ok(state.gdpGrowth >= DEFAULT_ECONOMY_CALIBRATION.bounds.gdpGrowthMin);
    assert.ok(state.inflation <= DEFAULT_ECONOMY_CALIBRATION.bounds.inflationMax);
    assert.ok(state.unemployment <= DEFAULT_ECONOMY_CALIBRATION.bounds.unemploymentMax);
  }
});

test("old-save-style state (no prior economyDynamics history) advances without error", () => {
  const state = createInitialGameState();
  const result = advanceEconomy(state);
  assert.ok(Number.isFinite(result.gdpGrowth));
  assert.ok(Number.isFinite(result.inflation));
  assert.ok(Number.isFinite(result.unemployment));
});
