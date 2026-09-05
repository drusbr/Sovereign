import type { GameState } from "@/lib/gameState";
import { deriveFiscalStance, deriveOneOffFiscalImpulse } from "./fiscalTransmission";
import { advanceExternalEconomy } from "./externalEconomy";
import { advancePrivateEconomy } from "./privateEconomy";
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
 * Chain: fiscal stance (recurring, from FiscalState's persisted levels), this
 * turn's one-off ledger impulse, lagged monetary pressure and net external demand
 * → demand pressure; available productive capacity
 * supplies headroom as positive demand brings it into use → supply-adjusted output
 * gap → gdpGrowth; output gap plus imported inflation → inflation pressure
 * (its own inertia) → inflation;
 * output gap → labour slack (longest lag) → unemployment. gdpGrowth relaxes fastest,
 * inflation more gradually, unemployment slowest — see EconomyCalibration.rates.
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
  const { rates, scales, bounds, baseline, monetary, taxDemandPassthrough, governmentDemandPassthrough } = calibration;
  const fiscal = state.fiscal;
  const dynamics = state.economyDynamics;

  const stance = deriveFiscalStance(fiscal, baseline, completedTurn, taxDemandPassthrough);
  const oneOffFiscalImpulse = clampSym(
    deriveOneOffFiscalImpulse(fiscal, completedTurn, governmentDemandPassthrough),
    bounds.demandPressure
  );
  const recurringGovernmentSpending = clampSym(stance.recurringExpenditureShare, bounds.demandPressure);
  const recurringRevenueMeasures = clampSym(stance.recurringRevenueDemandShare, bounds.demandPressure);

  // Selic is owned by COPOM. The economy reads its stance and slowly transmits it
  // into demand; it never changes the rate itself and never writes headline outcomes
  // directly. A cut therefore unwinds previously accumulated restraint over time.
  const stanceImpliedPressure = clampSym(
    -state.monetaryPolicy.monetaryStance * monetary.stanceToDemandPressure,
    monetary.monetaryDemandBound
  );
  const transmittedMonetaryPressure = clampSym(
    relax(
      dynamics.transmittedMonetaryPressure,
      stanceImpliedPressure,
      monetary.transmissionRate
    ),
    monetary.monetaryDemandBound
  );

  // Private economy: household consumption and private investment respond to *lagged*
  // (start-of-turn) labour/output/demand/capacity conditions and the current monetary
  // stance — never to this turn's not-yet-computed demand pressure, which would be
  // circular. Their two demand contributions are folded into the same aggregate-demand
  // target fiscal/monetary already feed, so external-economy import leakage and every
  // downstream transmission step picks them up automatically with no special-casing.
  const privateResult = advancePrivateEconomy({
    privateEconomy: state.privateEconomy,
    labourSlack: dynamics.labourSlack,
    outputGap: dynamics.outputGap,
    demandPressure: dynamics.demandPressure,
    availableCapacityHeadroom: dynamics.availableCapacityHeadroom,
    monetaryStance: state.monetaryPolicy.monetaryStance,
    inflation: state.inflation,
    inflationBaseline: baseline.inflation,
  });

  const domesticDemandTarget = clampSym(
    recurringGovernmentSpending + recurringRevenueMeasures + oneOffFiscalImpulse
      + transmittedMonetaryPressure
      + privateResult.state.consumptionDemandContribution
      + privateResult.state.investmentDemandContribution,
    bounds.demandPressure
  );
  const externalResult = advanceExternalEconomy({
    externalEconomy: state.externalEconomy,
    monetaryStance: state.monetaryPolicy.monetaryStance,
    domesticDemandPressure: domesticDemandTarget,
  });
  const targetDemandPressure = clampSym(
    domesticDemandTarget + externalResult.state.externalDemandContribution,
    bounds.demandPressure
  );
  const demandPressure = clampSym(
    relax(dynamics.demandPressure, targetDemandPressure, rates.demandPressure),
    bounds.demandPressure
  );

  // Completed infrastructure creates potential supply, not demand. Only positive
  // demand can bring currently unused headroom into production; under weak demand it
  // remains idle and cannot manufacture an automatic boom. While headroom is being
  // absorbed it also lowers the inflationary output gap relative to an otherwise
  // identical economy.
  const availableCapacityHeadroom = clamp(
    dynamics.availableCapacityHeadroom,
    0,
    bounds.availableCapacityHeadroom
  );
  const positiveDemandPressure = Math.max(0, demandPressure);
  const accessibleHeadroom = Math.min(availableCapacityHeadroom, positiveDemandPressure);
  const supplyHeadroomApplied = clamp(
    accessibleHeadroom * scales.capacityHeadroomToOutputGap,
    0,
    bounds.outputGap
  );
  const capacityUtilisationFlow = clamp(
    Math.min(
      availableCapacityHeadroom,
      positiveDemandPressure * rates.capacityUtilisation
    ),
    0,
    bounds.capacityUtilisationFlow
  );
  const remainingCapacityHeadroom = Math.max(
    0,
    availableCapacityHeadroom - capacityUtilisationFlow
  );

  // Private capital formation: sustained above-baseline investment slowly builds
  // future capacity, mirroring the "spending now, capacity later" pattern already
  // used for completed infrastructure (productiveCapacity.ts) — it never touches this
  // turn's demand, only next turn's supply side, and the flow itself is deliberately
  // tiny (see PrivateEconomyCalibration.capitalFormation) so a one-turn investment
  // spike cannot create a permanent capacity jump. Below-baseline investment applies a
  // mild negative drag on the capacity index rather than destroying available headroom.
  const capitalFormationFlow = privateResult.state.capitalFormationFlow;
  const productiveCapacityIndex = clamp(
    dynamics.productiveCapacityIndex + capitalFormationFlow,
    bounds.productiveCapacityIndexMin,
    bounds.productiveCapacityIndexMax
  );
  const availableCapacityHeadroomWithFormation = clamp(
    remainingCapacityHeadroom + Math.max(0, capitalFormationFlow) / 100,
    0,
    bounds.availableCapacityHeadroom
  );

  const supplyAdjustedDemand = demandPressure - supplyHeadroomApplied;
  const outputGap = clampSym(
    relax(dynamics.outputGap, supplyAdjustedDemand, rates.outputGap),
    bounds.outputGap
  );

  const totalInflationPressureTarget = clampSym(
    outputGap + externalResult.state.importedInflationPressure,
    bounds.inflationPressure
  );
  const inflationPressure = clampSym(
    relax(dynamics.inflationPressure, totalInflationPressureTarget, rates.inflationPressure),
    bounds.inflationPressure
  );

  // A positive output gap (a boom) should REDUCE slack — hence the negated target.
  const labourSlack = clampSym(relax(dynamics.labourSlack, -outputGap, rates.labourSlack), bounds.labourSlack);

  // capacityUtilisationFlow is a one-turn flow out of a finite headroom stock. It can
  // support growth while new infrastructure is taken into use, but necessarily fades;
  // productiveCapacityIndex itself is never multiplied into growth.
  const targetGdpGrowth = baseline.gdpGrowth
    + outputGap * scales.outputGapToGrowth
    + capacityUtilisationFlow * scales.capacityUtilisationToGrowth;
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
    dynamics: {
      demandPressure,
      outputGap,
      inflationPressure,
      labourSlack,
      productiveCapacityIndex,
      availableCapacityHeadroom: availableCapacityHeadroomWithFormation,
      capacityUtilisationFlow,
      supplyHeadroomApplied,
      transmittedMonetaryPressure,
      previousFiscalStance: stance,
    },
    externalEconomy: externalResult.state,
    privateEconomy: privateResult.state,
    tradeBalance: externalResult.tradeBalance,
    gdpGrowth,
    inflation,
    unemployment,
    demandContributions: {
      recurringGovernmentSpending,
      recurringRevenueMeasures,
      oneOffFiscalImpulse,
      monetaryPolicy: transmittedMonetaryPressure,
      externalDemand: externalResult.state.externalDemandContribution,
      householdConsumption: privateResult.state.consumptionDemandContribution,
      privateInvestment: privateResult.state.investmentDemandContribution,
      netDemandTarget: targetDemandPressure,
    },
    inflationContributions: {
      domesticDemandPressure: outputGap,
      importedInflationPressure: externalResult.state.importedInflationPressure,
      totalInflationPressureTarget,
    },
    supplyContributions: {
      productiveCapacityIndex,
      availableCapacityHeadroom: availableCapacityHeadroomWithFormation,
      capacityUtilisationFlow,
      supplyHeadroomApplied,
      capitalFormationFlow,
    },
  };
}
