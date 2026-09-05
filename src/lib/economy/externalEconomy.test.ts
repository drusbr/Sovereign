import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceEconomy } from "./advanceEconomy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { advanceExternalEconomy, createInitialExternalEconomyState, DEFAULT_EXTERNAL_ECONOMY_CALIBRATION } from "./externalEconomy.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { DEFAULT_ECONOMY_CALIBRATION } from "./types.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { evaluateCopomDecision } from "./monetaryPolicy.ts";

type ExternalState = ReturnType<typeof createInitialExternalEconomyState>;

function step(
  initial: ExternalState,
  turns: number,
  inputs: { monetaryStance?: number; domesticDemandPressure?: number } = {}
): ExternalState {
  let state = initial;
  for (let i = 0; i < turns; i++) {
    state = advanceExternalEconomy({
      externalEconomy: state,
      monetaryStance: inputs.monetaryStance ?? 0,
      domesticDemandPressure: inputs.domesticDemandPressure ?? 0,
    }).state;
  }
  return state;
}

test("neutral external conditions keep FX, trade flows and pressures stable", () => {
  const initial = createInitialExternalEconomyState();
  const after = step(initial, 100);
  assert.ok(Math.abs(after.exchangeRateBrlPerUsd - initial.exchangeRateBrlPerUsd) < 1e-9);
  assert.ok(Math.abs(after.exportIndex - 100) < 1e-9);
  assert.ok(Math.abs(after.importIndex - 100) < 1e-9);
  assert.ok(Math.abs(after.externalDemandContribution) < 1e-9);
  assert.ok(Math.abs(after.importedInflationPressure) < 1e-9);
});

test("higher Brazilian rates create more appreciation pressure than lower rates", () => {
  const high = step(createInitialExternalEconomyState(), 8, { monetaryStance: 6 });
  const low = step(createInitialExternalEconomyState(), 8, { monetaryStance: -2 });
  assert.ok(high.exchangeRatePressure < low.exchangeRatePressure);
  assert.ok(high.exchangeRateBrlPerUsd < low.exchangeRateBrlPerUsd);
});

test("commodity boom improves exports, supports the real and external demand", () => {
  const initial = createInitialExternalEconomyState();
  const boom = step({ ...initial, commodityConditionsIndex: 125 }, 16);
  assert.ok(boom.exportIndex > initial.exportIndex);
  assert.ok(boom.exchangeRateBrlPerUsd < initial.exchangeRateBrlPerUsd);
  assert.ok(boom.externalDemandContribution > 0);
  assert.ok(boom.importedInflationPressure < 0);
});

test("commodity decline produces the inverse external conditions", () => {
  const initial = createInitialExternalEconomyState();
  const decline = step({ ...initial, commodityConditionsIndex: 75 }, 16);
  assert.ok(decline.exportIndex < initial.exportIndex);
  assert.ok(decline.exchangeRateBrlPerUsd > initial.exchangeRateBrlPerUsd);
  assert.ok(decline.externalDemandContribution < 0);
  assert.ok(decline.importedInflationPressure > 0);
});

test("foreign recession weakens exports and net external demand", () => {
  const weak = step({ ...createInitialExternalEconomyState(), foreignDemandIndex: 75 }, 16);
  assert.ok(weak.exportIndex < 100);
  assert.ok(weak.externalDemandContribution < 0);
});

test("a weaker real improves competitiveness, restrains imports and raises imported inflation", () => {
  const weak = step({
    ...createInitialExternalEconomyState(),
    exchangeRateBrlPerUsd: 6.2,
    globalRiskIndex: 125,
  }, 10);
  assert.ok(weak.exportIndex > 100);
  assert.ok(weak.importIndex < 100);
  assert.ok(weak.importedInflationPressure > 0);
});

test("a stronger real weakens exports, supports imports and lowers imported inflation", () => {
  const strong = step({
    ...createInitialExternalEconomyState(),
    exchangeRateBrlPerUsd: 4.7,
  }, 10, { monetaryStance: 6 });
  assert.ok(strong.exportIndex < 100);
  assert.ok(strong.importIndex > 100);
  assert.ok(strong.importedInflationPressure < 0);
});

test("stronger domestic demand increases imports and leaks stimulus abroad", () => {
  const boom = step(createInitialExternalEconomyState(), 12, { domesticDemandPressure: 0.03 });
  const neutral = step(createInitialExternalEconomyState(), 12);
  assert.ok(boom.importIndex > neutral.importIndex);
  assert.ok(boom.externalDemandContribution < neutral.externalDemandContribution);
});

test("external engine does not directly write headline macro variables", () => {
  const state = createInitialGameState();
  const before = { gdpGrowth: state.gdpGrowth, inflation: state.inflation, unemployment: state.unemployment };
  const result = advanceExternalEconomy({
    externalEconomy: { ...state.externalEconomy, foreignDemandIndex: 70, globalRiskIndex: 130 },
    monetaryStance: state.monetaryPolicy.monetaryStance,
    domesticDemandPressure: 0,
  });
  assert.ok(result.state.externalDemandContribution < 0);
  assert.deepEqual(
    { gdpGrowth: state.gdpGrowth, inflation: state.inflation, unemployment: state.unemployment },
    before
  );
});

test("external demand and imported inflation reach headlines only through advanceEconomy", () => {
  const baseline = createInitialGameState();
  baseline.monetaryPolicy = {
    ...baseline.monetaryPolicy,
    currentSelic: DEFAULT_ECONOMY_CALIBRATION.monetary.neutralNominalRate,
    monetaryStance: 0,
  };
  const weak = {
    ...baseline,
    externalEconomy: { ...baseline.externalEconomy, foreignDemandIndex: 70, globalRiskIndex: 130 },
  };
  const neutralResult = advanceEconomy(baseline);
  const weakResult = advanceEconomy(weak);
  assert.ok(weakResult.demandContributions.externalDemand < neutralResult.demandContributions.externalDemand);
  assert.ok(weakResult.inflationContributions.importedInflationPressure > neutralResult.inflationContributions.importedInflationPressure);
});

test("depreciation pressure eventually makes COPOM relatively more restrictive through inflation signals", () => {
  let neutral = createInitialGameState();
  let stressed = {
    ...createInitialGameState(),
    externalEconomy: {
      ...createInitialExternalEconomyState(),
      exchangeRateBrlPerUsd: 6.4,
      globalRiskIndex: 140,
    },
  };
  for (let i = 0; i < 40; i++) {
    const n = advanceEconomy(neutral);
    neutral = { ...neutral, ...n, economyDynamics: n.dynamics, externalEconomy: n.externalEconomy };
    const s = advanceEconomy(stressed);
    stressed = { ...stressed, ...s, economyDynamics: s.dynamics, externalEconomy: s.externalEconomy };
  }
  assert.ok(stressed.economyDynamics.inflationPressure > neutral.economyDynamics.inflationPressure);
  assert.ok(evaluateCopomDecision(stressed).desiredSelic > evaluateCopomDecision(neutral).desiredSelic);
});

test("500-turn neutral run remains finite and bounded", () => {
  let state = createInitialExternalEconomyState();
  const b = DEFAULT_EXTERNAL_ECONOMY_CALIBRATION.bounds;
  for (let i = 0; i < 500; i++) {
    state = step(state, 1);
    for (const value of Object.values(state)) assert.ok(Number.isFinite(value));
    assert.ok(state.exchangeRateBrlPerUsd >= b.exchangeRateMin && state.exchangeRateBrlPerUsd <= b.exchangeRateMax);
    assert.ok(state.exportIndex >= b.tradeIndexMin && state.exportIndex <= b.tradeIndexMax);
    assert.ok(state.importIndex >= b.tradeIndexMin && state.importIndex <= b.tradeIndexMax);
    assert.ok(Math.abs(state.importedInflationPressure) <= b.importedInflationPressure + 1e-12);
  }
});
