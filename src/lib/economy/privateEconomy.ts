/**
 * Household consumption and private investment — the two channels this slice adds so
 * private demand emerges from labour/monetary/activity conditions rather than only
 * fiscal, monetary and external policy driving the economy. Persistent stocks are
 * normalised indexes (100 = neutral baseline); everything else derived here is a
 * GDP-relative flow, matching the units `advanceEconomy` already works in.
 *
 * Both channels read *lagged* (start-of-turn) conditions — EconomyDynamics as it stood
 * before this turn's own demand/output/inflation are recomputed, plus the current Selic
 * stance (which COPOM only moves at its own meetings, so reading it live is not
 * circular within a turn). This avoids a same-turn simultaneity problem: private
 * behaviour reacts to observed conditions, not to its own not-yet-computed contribution.
 */

export interface PrivateEconomyState {
  /** 100 = neutral. Relaxes toward a target implied by labour slack, activity and
   *  inflation. */
  consumptionIndex: number;
  /** 100 = neutral. Relaxes toward a target implied by monetary stance, aggregate
   *  demand and spare capacity. */
  investmentIndex: number;
  /** GDP-relative demand contribution derived from the consumption index's deviation
   *  from 100. Zero at baseline — this channel never manufactures demand by existing. */
  consumptionDemandContribution: number;
  /** GDP-relative demand contribution derived from the investment index's deviation
   *  from 100. */
  investmentDemandContribution: number;
  /** This turn's capital-formation flow into productiveCapacityIndex — a slow,
   *  persistent trickle from sustained above/below-baseline investment, kept separate
   *  from investmentDemandContribution so current spending and future capacity are
   *  never double-counted (mirrors the infrastructure "spending now, capacity later"
   *  pattern from Slice 2). Can be negative (mild depreciation-like drag) but is small
   *  enough that a single turn's spike cannot create a permanent capacity jump. */
  capitalFormationFlow: number;
}

export function createInitialPrivateEconomyState(): PrivateEconomyState {
  return {
    consumptionIndex: 100,
    investmentIndex: 100,
    consumptionDemandContribution: 0,
    investmentDemandContribution: 0,
    capitalFormationFlow: 0,
  };
}

export interface PrivateEconomyCalibration {
  consumption: {
    /** Index points of consumption target lost per unit of (positive) labour slack. */
    labourSlackSensitivity: number;
    /** Index points gained per unit of (positive) output gap. */
    activitySensitivity: number;
    /** Index points lost per percentage point of inflation above the scenario's
     *  inflation baseline (purchasing-power erosion). */
    inflationSensitivity: number;
    /** Relaxation fraction per turn — gradual, not immediate. */
    adjustmentRate: number;
    /** Converts (consumptionIndex - 100) into a GDP-relative demand contribution. */
    demandScale: number;
  };
  investment: {
    /** Index points lost per percentage point of restrictive monetary stance. */
    rateSensitivity: number;
    /** Index points gained per unit of aggregate demand pressure (accelerator-like
     *  response to current conditions, not a forecast). */
    demandSensitivity: number;
    /** Index points lost per unit of (unused headroom x how weak demand currently is)
     *  — spare capacity only discourages investment when it is actually going unused
     *  because demand is weak, not merely because some infrastructure was completed;
     *  at neutral-or-positive demand pressure this term is exactly zero, so leftover
     *  headroom alone can never make investment drift away from baseline. */
    headroomSensitivity: number;
    adjustmentRate: number;
    demandScale: number;
  };
  capitalFormation: {
    /** Converts (investmentIndex - 100) into productiveCapacityIndex points per turn.
     *  Deliberately tiny: this is a slow trickle, not a per-turn capacity swing. */
    indexPointsPerGap: number;
  };
  bounds: {
    consumptionIndexMin: number;
    consumptionIndexMax: number;
    investmentIndexMin: number;
    investmentIndexMax: number;
    consumptionDemandContribution: number;
    investmentDemandContribution: number;
    capitalFormationFlow: number;
  };
}

/** Gameplay anchors, not econometric estimates. Kept deliberately conservative so the
 *  private economy contributes a meaningful but bounded slice of total demand pressure
 *  alongside the existing fiscal/monetary/external channels. */
export const DEFAULT_PRIVATE_ECONOMY_CALIBRATION: PrivateEconomyCalibration = {
  consumption: {
    labourSlackSensitivity: 55,
    activitySensitivity: 40,
    inflationSensitivity: 0.35,
    adjustmentRate: 0.1,
    demandScale: 0.0035,
  },
  investment: {
    rateSensitivity: 0.35,
    demandSensitivity: 35,
    headroomSensitivity: 1400,
    adjustmentRate: 0.12,
    demandScale: 0.004,
  },
  capitalFormation: {
    indexPointsPerGap: 0.003,
  },
  bounds: {
    consumptionIndexMin: 80,
    consumptionIndexMax: 120,
    investmentIndexMin: 70,
    investmentIndexMax: 130,
    consumptionDemandContribution: 0.035,
    investmentDemandContribution: 0.04,
    capitalFormationFlow: 0.05,
  },
};

export interface PrivateEconomyInputs {
  privateEconomy: PrivateEconomyState;
  /** Lagged (start-of-turn) EconomyDynamics.labourSlack. */
  labourSlack: number;
  /** Lagged EconomyDynamics.outputGap. */
  outputGap: number;
  /** Lagged EconomyDynamics.demandPressure. */
  demandPressure: number;
  /** Lagged EconomyDynamics.availableCapacityHeadroom. */
  availableCapacityHeadroom: number;
  /** Selic minus the calibrated neutral nominal rate, in percentage points. */
  monetaryStance: number;
  /** Lagged (start-of-turn, i.e. last turn's realised) headline inflation. */
  inflation: number;
  /** The scenario's inflation baseline/anchor, shared with EconomyCalibration so the
   *  two never drift out of sync with each other. */
  inflationBaseline: number;
}

export interface PrivateEconomyAdvanceResult {
  state: PrivateEconomyState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampSym(value: number, bound: number): number {
  return clamp(value, -bound, bound);
}

function relax(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

/**
 * Advances household consumption and private investment by one turn. Pure and
 * deterministic — no randomness, identical inputs always produce identical outputs.
 * Never touches gdpGrowth/inflation/unemployment directly; the two demand
 * contributions this returns are meant to be folded into the same aggregate-demand
 * target the fiscal/monetary/external channels already feed inside `advanceEconomy`.
 */
export function advancePrivateEconomy(
  inputs: PrivateEconomyInputs,
  calibration: PrivateEconomyCalibration = DEFAULT_PRIVATE_ECONOMY_CALIBRATION
): PrivateEconomyAdvanceResult {
  const { bounds } = calibration;
  const current = inputs.privateEconomy;

  const inflationDeviation = inputs.inflation - inputs.inflationBaseline;
  const consumptionTarget = clamp(
    100
      - inputs.labourSlack * calibration.consumption.labourSlackSensitivity
      + inputs.outputGap * calibration.consumption.activitySensitivity
      - inflationDeviation * calibration.consumption.inflationSensitivity,
    bounds.consumptionIndexMin,
    bounds.consumptionIndexMax
  );
  const consumptionIndex = clamp(
    relax(current.consumptionIndex, consumptionTarget, calibration.consumption.adjustmentRate),
    bounds.consumptionIndexMin,
    bounds.consumptionIndexMax
  );
  const consumptionDemandContribution = clampSym(
    (consumptionIndex - 100) * calibration.consumption.demandScale,
    bounds.consumptionDemandContribution
  );

  // Spare capacity only discourages investment while it is actually going unused
  // because demand is weak (Math.max(0, -demandPressure)) — at neutral or positive
  // demand this interaction term is exactly zero regardless of how much headroom is
  // sitting there, so newly completed infrastructure can never by itself drag
  // investment away from baseline.
  const weakDemandHeadroomDrag = Math.max(0, -inputs.demandPressure) * inputs.availableCapacityHeadroom;
  const investmentTarget = clamp(
    100
      - inputs.monetaryStance * calibration.investment.rateSensitivity
      + inputs.demandPressure * calibration.investment.demandSensitivity
      - weakDemandHeadroomDrag * calibration.investment.headroomSensitivity,
    bounds.investmentIndexMin,
    bounds.investmentIndexMax
  );
  const investmentIndex = clamp(
    relax(current.investmentIndex, investmentTarget, calibration.investment.adjustmentRate),
    bounds.investmentIndexMin,
    bounds.investmentIndexMax
  );
  const investmentDemandContribution = clampSym(
    (investmentIndex - 100) * calibration.investment.demandScale,
    bounds.investmentDemandContribution
  );

  // A slow capital-formation trickle: current investment is demand now (above), and
  // this is the separate, much smaller flow that eventually becomes future capacity —
  // never both from the same index-point deviation counted as the same thing.
  const capitalFormationFlow = clampSym(
    (investmentIndex - 100) * calibration.capitalFormation.indexPointsPerGap,
    bounds.capitalFormationFlow
  );

  return {
    state: {
      consumptionIndex,
      investmentIndex,
      consumptionDemandContribution,
      investmentDemandContribution,
      capitalFormationFlow,
    },
  };
}
