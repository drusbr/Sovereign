import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceEconomy } from "./advanceEconomy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { addProductiveCapacity, calculateInfrastructureCapacityAddition } from "./productiveCapacity.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { DEFAULT_ECONOMY_CALIBRATION } from "./types.ts";
import type { GameState } from "../gameState.ts";

function withNeutralMonetaryPolicy(state: GameState): GameState {
  const neutral = DEFAULT_ECONOMY_CALIBRATION.monetary.neutralNominalRate;
  return {
    ...state,
    monetaryPolicy: {
      ...state.monetaryPolicy,
      currentSelic: neutral,
      previousSelic: neutral,
      monetaryStance: 0,
      stanceClassification: "NEUTRAL",
    },
  };
}

function withRecurringDemand(state: GameState, expenditureIncrease: number): GameState {
  return {
    ...state,
    fiscal: {
      ...state.fiscal,
      primaryExpenditure:
        DEFAULT_ECONOMY_CALIBRATION.baseline.primaryExpenditure + expenditureIncrease,
      ledger: [],
    },
  };
}

function step(initial: GameState, turns: number): GameState[] {
  let state = initial;
  const history: GameState[] = [];
  for (let i = 0; i < turns; i++) {
    const result = advanceEconomy({ ...state, turn: state.turn + 1 });
    state = {
      ...state,
      turn: state.turn + 1,
      gdpGrowth: result.gdpGrowth,
      inflation: result.inflation,
      unemployment: result.unemployment,
      economyDynamics: result.dynamics,
    };
    history.push(state);
  }
  return history;
}

test("capacity calculation is deterministic, GDP-scaled, and project-size sensitive", () => {
  const small = calculateInfrastructureCapacityAddition(0.5, 10_000);
  const large = calculateInfrastructureCapacityAddition(50, 10_000);
  assert.deepEqual(
    calculateInfrastructureCapacityAddition(50, 10_000),
    large
  );
  assert.ok(large.indexPoints > small.indexPoints);
  assert.equal(large.headroomShare, large.indexPoints / 100);
});

test("invalid project or GDP scales create no capacity", () => {
  assert.deepEqual(calculateInfrastructureCapacityAddition(0, 10_000), {
    indexPoints: 0,
    headroomShare: 0,
  });
  assert.deepEqual(calculateInfrastructureCapacityAddition(10, 0), {
    indexPoints: 0,
    headroomShare: 0,
  });
});

test("greater capacity creates supply headroom under strong demand", () => {
  const baseline = withRecurringDemand(withNeutralMonetaryPolicy(createInitialGameState()), 300);
  const addition = calculateInfrastructureCapacityAddition(50, baseline.fiscal.nominalGDP);
  const highCapacity = addProductiveCapacity(structuredClone(baseline), addition);

  const lowHistory = step(baseline, 12);
  const highHistory = step(highCapacity, 12);
  const low = lowHistory[11];
  const high = highHistory[11];

  assert.ok(high.gdpGrowth > low.gdpGrowth, "activated capacity should sustain more output");
  assert.ok(high.inflation < low.inflation, "supply headroom should moderate inflation pressure");
  assert.ok(
    high.economyDynamics.inflationPressure < low.economyDynamics.inflationPressure,
    "the inflation difference should originate in the supply-adjusted output gap"
  );
  assert.ok(
    high.economyDynamics.supplyHeadroomApplied > 0
      || highHistory.some((state) => state.economyDynamics.supplyHeadroomApplied > 0)
  );
});

test("capacity does not manufacture growth when demand is weak", () => {
  const baseline = withNeutralMonetaryPolicy(createInitialGameState());
  const weakDemand = {
    ...baseline,
    fiscal: {
      ...baseline.fiscal,
      primaryExpenditure:
        DEFAULT_ECONOMY_CALIBRATION.baseline.primaryExpenditure - 300,
      ledger: [],
    },
  };
  const addition = calculateInfrastructureCapacityAddition(50, weakDemand.fiscal.nominalGDP);
  const highCapacity = addProductiveCapacity(weakDemand, addition);
  const result = advanceEconomy(highCapacity);

  assert.equal(result.dynamics.capacityUtilisationFlow, 0);
  assert.equal(result.dynamics.supplyHeadroomApplied, 0);
  assert.ok(result.gdpGrowth <= DEFAULT_ECONOMY_CALIBRATION.baseline.gdpGrowth);
  assert.equal(result.dynamics.availableCapacityHeadroom, addition.headroomShare);
});

test("capacity persists through subsequent turns and save hydration", () => {
  const state = withNeutralMonetaryPolicy(createInitialGameState());
  const addition = calculateInfrastructureCapacityAddition(24, state.fiscal.nominalGDP);
  const withCapacity = addProductiveCapacity(state, addition);
  const afterTurns = step(withCapacity, 5)[4];
  const hydrated = hydrateGameState(structuredClone(afterTurns));

  assert.equal(hydrated.economyDynamics.productiveCapacityIndex, withCapacity.economyDynamics.productiveCapacityIndex);
  assert.equal(hydrated.economyDynamics.productiveCapacityIndex, afterTurns.economyDynamics.productiveCapacityIndex);
});

test("200 neutral turns after an addition stay finite, bounded, and non-accelerating", () => {
  const state = withNeutralMonetaryPolicy(createInitialGameState());
  const addition = calculateInfrastructureCapacityAddition(50, state.fiscal.nominalGDP);
  const history = step(addProductiveCapacity(state, addition), 220);
  const bounds = DEFAULT_ECONOMY_CALIBRATION.bounds;

  for (const current of history) {
    for (const value of [
      current.gdpGrowth,
      current.inflation,
      current.unemployment,
      current.economyDynamics.productiveCapacityIndex,
      current.economyDynamics.availableCapacityHeadroom,
      current.economyDynamics.capacityUtilisationFlow,
      current.economyDynamics.supplyHeadroomApplied,
    ]) {
      assert.ok(Number.isFinite(value));
    }
    assert.ok(current.economyDynamics.productiveCapacityIndex >= bounds.productiveCapacityIndexMin);
    assert.ok(current.economyDynamics.productiveCapacityIndex <= bounds.productiveCapacityIndexMax);
    assert.ok(current.economyDynamics.availableCapacityHeadroom <= bounds.availableCapacityHeadroom);
    assert.ok(current.gdpGrowth >= bounds.gdpGrowthMin && current.gdpGrowth <= bounds.gdpGrowthMax);
    assert.ok(current.inflation >= bounds.inflationMin && current.inflation <= bounds.inflationMax);
    assert.ok(current.unemployment >= bounds.unemploymentMin && current.unemployment <= bounds.unemploymentMax);
  }

  const tail = history.slice(-20).map((current) => current.gdpGrowth);
  assert.ok(Math.max(...tail) - Math.min(...tail) < 0.01);
  assert.ok(Math.abs(tail.at(-1)! - DEFAULT_ECONOMY_CALIBRATION.baseline.gdpGrowth) < 0.01);
});
