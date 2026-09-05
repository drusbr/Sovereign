import type { GameState } from "@/lib/gameState";
import { deriveFiscalStance, deriveOneOffFiscalImpulse } from "./fiscalTransmission";
import {
  DEFAULT_ECONOMY_CALIBRATION,
  type EconomyAdvanceResult,
  type EconomyCalibration,
} from "./types";

function clampSym(value: number, bound: number): number {
  return Math.max(-bound, Math.min(bound, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** First-order relaxation toward a target — generalises the old fixed-baseline
 *  `driftToward` so the target itself can move with the pressure state instead of
 *  being a constant every country/turn converges back to regardless of conditions. */
function relax(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

/**
 * Advances the causal economy by one turn. Pure and deterministic: reads only
 * `state.fiscal`, `state.economyDynamics`, and the existing `gdpGrowth`/`inflation`/
 * `unemployment` values, and returns new ones — it never mutates `state`, and it never
 * uses randomness.
 *
 * Chain: fiscal stance (recurring, from FiscalState's persisted levels) plus this
 * turn's one-off ledger impulse → demand pressure → output gap → gdpGrowth directly;
 * output gap → inflation pressure (its own inertia) → inflation; output gap → labour
 * slack (longest lag) → unemployment. gdpGrowth relaxes fastest, inflation more
 * gradually, unemployment slowest — see EconomyCalibration.rates.
 *
 * `completedTurn` identifies the turn whose ledger activity should count as this
 * turn's one-off impulse. It must be the turn number that was current when
 * `postLifecycleExpenditure` stamped this turn's ledger entries — by the time
 * `advanceEconomy` runs inside `resolveTurn`, `state.turn` has already been advanced
 * to the *next* turn, so callers must pass the pre-increment turn explicitly rather
 * than relying on the default (which only suits isolated tests where both happen to
 * match). Recurring stance is unaffected by this — it's derived from the live
 * `state.fiscal` levels directly, not from any turn-stamped ledger entry.
 */
export function advanceEconomy(
  state: GameState,
  calibration: EconomyCalibration = DEFAULT_ECONOMY_CALIBRATION,
  completedTurn: number = state.turn
): EconomyAdvanceResult {
  const { rates, scales, bounds, baseline, taxDemandPassthrough, governmentDemandPassthrough } = calibration;
  const fiscal = state.fiscal;
  const dynamics = state.economyDynamics;

  const stance = deriveFiscalStance(fiscal, baseline, completedTurn, taxDemandPassthrough);
  const oneOffFiscalImpulse = clampSym(
    deriveOneOffFiscalImpulse(fiscal, completedTurn, governmentDemandPassthrough),
    bounds.demandPressure
  );
  const recurringGovernmentSpending = clampSym(stance.recurringExpenditureShare, bounds.demandPressure);
  const recurringRevenueMeasures = clampSym(stance.recurringRevenueDemandShare, bounds.demandPressure);

  const targetDemandPressure = clampSym(
    recurringGovernmentSpending + recurringRevenueMeasures + oneOffFiscalImpulse,
    bounds.demandPressure
  );
  const demandPressure = clampSym(
    relax(dynamics.demandPressure, targetDemandPressure, rates.demandPressure),
    bounds.demandPressure
  );

  const outputGap = clampSym(relax(dynamics.outputGap, demandPressure, rates.outputGap), bounds.outputGap);

  const inflationPressure = clampSym(
    relax(dynamics.inflationPressure, outputGap, rates.inflationPressure),
    bounds.inflationPressure
  );

  // A positive output gap (a boom) should REDUCE slack — hence the negated target.
  const labourSlack = clampSym(relax(dynamics.labourSlack, -outputGap, rates.labourSlack), bounds.labourSlack);

  const targetGdpGrowth = baseline.gdpGrowth + outputGap * scales.outputGapToGrowth;
  const gdpGrowth = clamp(
    relax(state.gdpGrowth, targetGdpGrowth, rates.gdpGrowth),
    bounds.gdpGrowthMin,
    bounds.gdpGrowthMax
  );

  const targetInflation = baseline.inflation + inflationPressure * scales.inflationPressureToInflation;
  const inflation = clamp(
    relax(state.inflation, targetInflation, rates.inflation),
    bounds.inflationMin,
    bounds.inflationMax
  );

  const targetUnemployment = baseline.unemployment + labourSlack * scales.labourSlackToUnemployment;
  const unemployment = clamp(
    relax(state.unemployment, targetUnemployment, rates.unemployment),
    bounds.unemploymentMin,
    bounds.unemploymentMax
  );

  return {
    dynamics: { demandPressure, outputGap, inflationPressure, labourSlack, previousFiscalStance: stance },
    gdpGrowth,
    inflation,
    unemployment,
    demandContributions: { recurringGovernmentSpending, recurringRevenueMeasures, oneOffFiscalImpulse },
  };
}
