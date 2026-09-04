/**
 * Fields the causal economy engine owns exclusively. No other writer — LLM turn
 * effects, world-event response options, scripted GAME_EVENTS — may set these
 * directly; they exist only as advanceEconomy()'s output.
 */
export const ECONOMY_OWNED_MACRO_KEYS = ["gdpGrowth", "inflation", "unemployment"] as const;
export type EconomyOwnedMacroKey = (typeof ECONOMY_OWNED_MACRO_KEYS)[number];

/**
 * Same idea, widened by one field for the application-time filter used outside
 * resolveTurn (e.g. world-event responses): sovereignDebt isn't part of the demand-
 * transmission chain, but FiscalState.debtToGDP is its sole source of truth — nothing
 * outside the fiscal engine (closeFiscalWeek mirrors it every turn) may set it either,
 * to avoid the divergence the V2 inspection found (a world-event delta silently
 * overwritten at the next turn's close).
 */
export const EXTERNALLY_FORBIDDEN_ECONOMIC_KEYS = [...ECONOMY_OWNED_MACRO_KEYS, "sovereignDebt"] as const;
export type ExternallyForbiddenEconomicKey = (typeof EXTERNALLY_FORBIDDEN_ECONOMIC_KEYS)[number];

/** Strips the externally-forbidden keys from an effects map before it's applied —
 *  used at every application point outside resolveTurn's own causal economy step. */
export function stripExternallyForbiddenEconomicEffects<T extends Record<string, number | undefined>>(
  effects: T
): T {
  const next = { ...effects };
  for (const key of EXTERNALLY_FORBIDDEN_ECONOMIC_KEYS) {
    delete (next as Record<string, number | undefined>)[key];
  }
  return next;
}

/** How far current recurring fiscal levels sit from their baseline, expressed as a
 *  share of nominal GDP so the model generalises across scales rather than reacting
 *  to raw R$ thresholds. */
export interface FiscalStanceSnapshot {
  turn: number;
  /** (primaryExpenditure - baseline.primaryExpenditure) / nominalGDP. Positive = a net
   *  expansionary recurring spending stance. */
  recurringExpenditureShare: number;
  /** Demand-equivalent share from the recurring revenue/tax stance — already sign-
   *  flipped (a tax increase is contractionary) and passthrough-weighted (a tax change
   *  reaches private demand only partially, see EconomyCalibration.taxDemandPassthrough). */
  recurringRevenueDemandShare: number;
}

/**
 * Persistent internal simulation machinery — not a new dashboard of player sliders.
 * Carries the multi-turn pressure/momentum that gdpGrowth/inflation/unemployment relax
 * toward each turn, so a policy's consequences build up and fade gradually rather than
 * snapping to a final value the turn it's enacted.
 */
export interface EconomyDynamics {
  /** GDP-relative aggregate demand pressure: recurring fiscal stance plus any one-off
   *  impulse from this turn's ledger activity. */
  demandPressure: number;
  /** How far output sits from its neutral level, in the same GDP-relative units. */
  outputGap: number;
  /** Build-up of inflationary pressure implied by the output gap, with its own inertia
   *  — moves more slowly than the output gap itself. */
  inflationPressure: number;
  /** Labour-market slack implied by the output gap, responding with the longest lag
   *  of the three. */
  labourSlack: number;
  previousFiscalStance: FiscalStanceSnapshot;
}

export function createInitialEconomyDynamics(turn = 1): EconomyDynamics {
  return {
    demandPressure: 0,
    outputGap: 0,
    inflationPressure: 0,
    labourSlack: 0,
    previousFiscalStance: { turn, recurringExpenditureShare: 0, recurringRevenueDemandShare: 0 },
  };
}

/** Causal attribution for this turn's demand pressure — not persisted; returned so a
 *  future Explain surface can eventually show it without the economy engine having to
 *  guess retroactively which fiscal channel mattered. */
export interface DemandContributions {
  recurringGovernmentSpending: number;
  recurringRevenueMeasures: number;
  oneOffFiscalImpulse: number;
}

export interface EconomyAdvanceResult {
  dynamics: EconomyDynamics;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  demandContributions: DemandContributions;
}

/** The recurring fiscal baseline stance is measured against, and the anchor points
 *  gdpGrowth/inflation/unemployment relax toward absent any demand pressure. These are
 *  this campaign's starting values (Brazil's, for this game) — the engine itself takes
 *  them as a parameter and contains no country-specific literals, so a future country
 *  pack only needs to supply its own EconomyBaseline, never touch this module. */
export interface EconomyBaseline {
  primaryExpenditure: number;
  primaryRevenue: number;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
}

export interface EconomyCalibration {
  baseline: EconomyBaseline;
  /** Fraction of a spending change that flows directly into government demand. */
  governmentDemandPassthrough: number;
  /** Fraction of a tax/revenue change that flows into private demand — partial and
   *  indirect by design (no household/incidence model): equal nominal spending and
   *  revenue measures are not forced to produce identical short-run demand effects. */
  taxDemandPassthrough: number;
  rates: {
    demandPressure: number;
    outputGap: number;
    inflationPressure: number;
    labourSlack: number;
    gdpGrowth: number;
    inflation: number;
    unemployment: number;
  };
  scales: {
    outputGapToGrowth: number;
    inflationPressureToInflation: number;
    labourSlackToUnemployment: number;
  };
  bounds: {
    demandPressure: number;
    outputGap: number;
    inflationPressure: number;
    labourSlack: number;
    gdpGrowthMin: number;
    gdpGrowthMax: number;
    inflationMin: number;
    inflationMax: number;
    unemploymentMin: number;
    unemploymentMax: number;
  };
}

/**
 * All transmission calibration in one place, per the V2 inspection's instruction to
 * centralize rather than scatter magic coefficients. Rates are relaxation fractions per
 * turn (higher = faster response): gdpGrowth is fastest, inflation slower and more
 * inertial, unemployment slowest — implementing "output responds quickly, inflation
 * gradually, unemployment with a lag" as differential response speed rather than a
 * fixed N-turn delay.
 */
export const DEFAULT_ECONOMY_CALIBRATION: EconomyCalibration = {
  baseline: {
    primaryExpenditure: 2500,
    primaryRevenue: 2480,
    gdpGrowth: 1.8,
    inflation: 4.6,
    unemployment: 11.2,
  },
  governmentDemandPassthrough: 1.0,
  taxDemandPassthrough: 0.5,
  rates: {
    demandPressure: 0.35,
    outputGap: 0.25,
    inflationPressure: 0.12,
    labourSlack: 0.08,
    gdpGrowth: 0.3,
    inflation: 0.08,
    unemployment: 0.06,
  },
  scales: {
    outputGapToGrowth: 60,
    inflationPressureToInflation: 40,
    labourSlackToUnemployment: 50,
  },
  bounds: {
    demandPressure: 0.06,
    outputGap: 0.06,
    inflationPressure: 0.06,
    labourSlack: 0.06,
    gdpGrowthMin: -8,
    gdpGrowthMax: 8,
    inflationMin: 0,
    inflationMax: 30,
    unemploymentMin: 0,
    unemploymentMax: 30,
  },
};
