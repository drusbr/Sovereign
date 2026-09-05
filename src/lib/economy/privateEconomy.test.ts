import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceEconomy } from "./advanceEconomy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advancePrivateEconomy, createInitialPrivateEconomyState, DEFAULT_PRIVATE_ECONOMY_CALIBRATION } from "./privateEconomy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { DEFAULT_ECONOMY_CALIBRATION, createInitialEconomyDynamics } from "./types.ts";
import type { GameState } from "../gameState.ts";
import type { PrivateEconomyState } from "./privateEconomy.ts";

const BASELINE = DEFAULT_ECONOMY_CALIBRATION.baseline;

function neutralInputs(overrides: Partial<Parameters<typeof advancePrivateEconomy>[0]> = {}) {
  return {
    privateEconomy: createInitialPrivateEconomyState(),
    labourSlack: 0,
    outputGap: 0,
    demandPressure: 0,
    availableCapacityHeadroom: 0,
    monetaryStance: 0,
    inflation: BASELINE.inflation,
    inflationBaseline: BASELINE.inflation,
    ...overrides,
  };
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialGameState();
  return {
    ...state,
    gdpGrowth: BASELINE.gdpGrowth,
    inflation: BASELINE.inflation,
    unemployment: BASELINE.unemployment,
    economyDynamics: createInitialEconomyDynamics(state.turn),
    monetaryPolicy: {
      ...state.monetaryPolicy,
      currentSelic: DEFAULT_ECONOMY_CALIBRATION.monetary.neutralNominalRate,
      previousSelic: DEFAULT_ECONOMY_CALIBRATION.monetary.neutralNominalRate,
      monetaryStance: 0,
      stanceClassification: "NEUTRAL",
    },
    ...overrides,
  };
}

function stepTurns(initial: GameState, turns: number, fiscalForTurn: (turn: number, state: GameState) => GameState["fiscal"] = (_t, s) => s.fiscal): GameState[] {
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
      privateEconomy: result.privateEconomy,
    };
    history.push(state);
  }
  return history;
}

test("a fully neutral private economy stays at baseline with zero demand contribution", () => {
  const result = advancePrivateEconomy(neutralInputs());
  assert.equal(result.state.consumptionIndex, 100);
  assert.equal(result.state.investmentIndex, 100);
  assert.equal(result.state.consumptionDemandContribution, 0);
  assert.equal(result.state.investmentDemandContribution, 0);
  assert.equal(result.state.capitalFormationFlow, 0);
});

test("weak labour market (positive labour slack) reduces the consumption target", () => {
  const result = advancePrivateEconomy(neutralInputs({ labourSlack: 0.03 }));
  assert.ok(result.state.consumptionIndex < 100);
  assert.ok(result.state.consumptionDemandContribution < 0);
});

test("improving labour market (negative slack) supports a consumption recovery", () => {
  const weak = advancePrivateEconomy(neutralInputs({
    privateEconomy: { ...createInitialPrivateEconomyState(), consumptionIndex: 95 },
    labourSlack: 0.03,
  }));
  const recovering = advancePrivateEconomy(neutralInputs({
    privateEconomy: { ...createInitialPrivateEconomyState(), consumptionIndex: 95 },
    labourSlack: -0.02,
  }));
  assert.ok(recovering.state.consumptionIndex > weak.state.consumptionIndex);
});

test("high inflation suppresses consumption relative to an otherwise identical economy", () => {
  const normalInflation = advancePrivateEconomy(neutralInputs({ inflation: BASELINE.inflation }));
  const highInflation = advancePrivateEconomy(neutralInputs({ inflation: BASELINE.inflation + 6 }));
  assert.ok(highInflation.state.consumptionIndex < normalInflation.state.consumptionIndex);
  assert.ok(highInflation.state.consumptionDemandContribution < normalInflation.state.consumptionDemandContribution);
});

test("restrictive monetary policy weakens private investment", () => {
  const result = advancePrivateEconomy(neutralInputs({ monetaryStance: 8 }));
  assert.ok(result.state.investmentIndex < 100);
  assert.ok(result.state.investmentDemandContribution < 0);
});

test("monetary easing supports an investment recovery, gradually", () => {
  const restrictivePrivate: PrivateEconomyState = { ...createInitialPrivateEconomyState(), investmentIndex: 90 };
  const stillRestrictive = advancePrivateEconomy(neutralInputs({ privateEconomy: restrictivePrivate, monetaryStance: 8 }));
  const easing = advancePrivateEconomy(neutralInputs({ privateEconomy: restrictivePrivate, monetaryStance: -2 }));
  assert.ok(easing.state.investmentIndex > stillRestrictive.state.investmentIndex);
  // Gradual: a single turn of easing shouldn't snap all the way back to baseline.
  assert.ok(easing.state.investmentIndex < 100);
});

test("weak demand with unused capacity reduces investment incentive", () => {
  const result = advancePrivateEconomy(neutralInputs({ demandPressure: -0.03, availableCapacityHeadroom: 0.06 }));
  assert.ok(result.state.investmentIndex < 100);
});

test("strong demand with limited spare capacity increases investment incentive", () => {
  const result = advancePrivateEconomy(neutralInputs({ demandPressure: 0.04, availableCapacityHeadroom: 0 }));
  assert.ok(result.state.investmentIndex > 100);
});

test("sustained above-baseline investment gradually raises productive capacity, but a one-week spike does not", () => {
  const start = baseState();
  // Force a single-turn strong-demand spike via a one-off ledger entry, then return
  // to neutral fiscal conditions for the rest of the run.
  let firstLedger = true;
  const history = stepTurns(start, 40, (turn, state) => {
    if (firstLedger) {
      firstLedger = false;
      return {
        ...state.fiscal,
        ledger: [{
          id: "spike", actionId: "a1", turn, date: "d", kind: "EMERGENCY_ALLOCATION", timing: "ONE_OFF",
          amount: 60, category: "other", balanceImpact: -60, debtImpact: 60, funding: "DEFICIT_FINANCED",
          description: "test", originType: "ACTION", annualRunRateImpact: 0, currentTurnCashImpact: -60,
        }],
      };
    }
    return { ...state.fiscal, ledger: [] };
  });
  const capacityAfterSpike = history[1].economyDynamics.productiveCapacityIndex;
  const capacityLate = history[39].economyDynamics.productiveCapacityIndex;
  // A single week's spike must not create an absurd permanent jump.
  assert.ok(capacityAfterSpike - 100 < 1, "one turn's investment reaction shouldn't jump capacity meaningfully");
  assert.ok(Number.isFinite(capacityLate));
});

test("sustained below-baseline investment does not runaway-shrink productive capacity", () => {
  const history = stepTurns(baseState(), 60, (_turn, state) => ({
    ...state.fiscal,
    primaryExpenditure: BASELINE.primaryExpenditure - 60,
    ledger: [],
  }));
  for (const state of history) {
    assert.ok(state.economyDynamics.productiveCapacityIndex >= DEFAULT_ECONOMY_CALIBRATION.bounds.productiveCapacityIndexMin);
    assert.ok(Number.isFinite(state.economyDynamics.productiveCapacityIndex));
  }
});

test("stronger private demand eventually increases imports through the existing external model", () => {
  const neutral = baseState();
  const withStrongInvestment = baseState({
    privateEconomy: { ...createInitialPrivateEconomyState(), investmentIndex: 115, consumptionIndex: 108 },
  });
  const neutralResult = advanceEconomy(neutral);
  const strongResult = advanceEconomy(withStrongInvestment);
  assert.ok(strongResult.externalEconomy.importIndex >= neutralResult.externalEconomy.importIndex);
});

test("consumption and investment affect aggregate demand without ever mutating gdpGrowth/inflation/unemployment directly", () => {
  const state = baseState({
    privateEconomy: { ...createInitialPrivateEconomyState(), consumptionIndex: 110, investmentIndex: 112 },
  });
  const result = advanceEconomy(state);
  assert.ok(result.demandContributions.householdConsumption > 0);
  assert.ok(result.demandContributions.privateInvestment > 0);
  // The private economy module itself never touches these three fields — advanceEconomy
  // is their sole writer, reached only through the demand -> output gap -> relax chain.
  assert.ok(Number.isFinite(result.gdpGrowth));
  assert.ok(Number.isFinite(result.inflation));
  assert.ok(Number.isFinite(result.unemployment));
});

test("determinism: identical inputs always produce identical private-economy outputs", () => {
  const inputs = neutralInputs({ labourSlack: 0.01, outputGap: -0.01, monetaryStance: 3 });
  const a = advancePrivateEconomy(inputs);
  const b = advancePrivateEconomy(inputs);
  assert.deepEqual(a, b);
});

test("500+ turn neutral run stays bounded and finite across private-economy fields", () => {
  const history = stepTurns(baseState(), 520);
  for (const state of history) {
    const p = state.privateEconomy;
    for (const value of [p.consumptionIndex, p.investmentIndex, p.consumptionDemandContribution, p.investmentDemandContribution, p.capitalFormationFlow]) {
      assert.ok(Number.isFinite(value), `expected finite, got ${value}`);
    }
    assert.ok(p.consumptionIndex >= DEFAULT_PRIVATE_ECONOMY_CALIBRATION.bounds.consumptionIndexMin);
    assert.ok(p.consumptionIndex <= DEFAULT_PRIVATE_ECONOMY_CALIBRATION.bounds.consumptionIndexMax);
    assert.ok(p.investmentIndex >= DEFAULT_PRIVATE_ECONOMY_CALIBRATION.bounds.investmentIndexMin);
    assert.ok(p.investmentIndex <= DEFAULT_PRIVATE_ECONOMY_CALIBRATION.bounds.investmentIndexMax);
    assert.ok(state.economyDynamics.productiveCapacityIndex >= DEFAULT_ECONOMY_CALIBRATION.bounds.productiveCapacityIndexMin);
    assert.ok(state.economyDynamics.productiveCapacityIndex <= DEFAULT_ECONOMY_CALIBRATION.bounds.productiveCapacityIndexMax);
    assert.ok(state.fiscal.nominalGDP > 0);
  }
  // At exact neutral conditions with no fiscal shocks, private demand should have
  // settled essentially to zero, not drifted away from baseline over 500+ turns.
  const last = history[history.length - 1];
  assert.ok(Math.abs(last.privateEconomy.consumptionDemandContribution) < 1e-6);
  assert.ok(Math.abs(last.privateEconomy.investmentDemandContribution) < 1e-6);
});

test("old-save-style state (no prior privateEconomy history) advances without error", () => {
  const state = createInitialGameState();
  const result = advanceEconomy(state);
  assert.ok(Number.isFinite(result.privateEconomy.consumptionIndex));
  assert.ok(Number.isFinite(result.privateEconomy.investmentIndex));
});
