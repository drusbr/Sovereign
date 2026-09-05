import type { ExternalEconomyState } from "./externalEconomy";
import type { PrivateEconomyState } from "./privateEconomy";

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
  /** Indexed stock of usable productive infrastructure. 100 is the campaign's
   *  starting supply capacity; completed infrastructure raises the level. The
   *  index is a level, not a growth-rate bonus. */
  productiveCapacityIndex: number;
  /** GDP-relative capacity created by completed projects that has not yet been
   *  absorbed into actual activity. It remains available when demand is weak. */
  availableCapacityHeadroom: number;
  /** GDP-relative amount of that headroom brought into use this turn. This is a
   *  temporary flow and therefore cannot become a permanent growth bonus. */
  capacityUtilisationFlow: number;
  /** GDP-relative supply relief applied to the output-gap target this turn. */
  supplyHeadroomApplied: number;
  /** Lagged GDP-relative demand impulse produced by the policy-rate stance. Negative
   *  values are restrictive. This stock unwinds gradually after rate cuts. */
  transmittedMonetaryPressure: number;
  previousFiscalStance: FiscalStanceSnapshot;
}

export function createInitialEconomyDynamics(turn = 1): EconomyDynamics {
  return {
    demandPressure: 0,
    outputGap: 0,
    inflationPressure: 0,
    labourSlack: 0,
    productiveCapacityIndex: 100,
    availableCapacityHeadroom: 0,
    capacityUtilisationFlow: 0,
    supplyHeadroomApplied: 0,
    transmittedMonetaryPressure: 0,
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
  /** Separately attributable lagged demand effect of the Selic stance. */
  monetaryPolicy: number;
  /** Net exports relative to the scenario baseline, transmitted through the
   *  external-economy model rather than written directly to headline growth. */
  externalDemand: number;
  /** Household consumption's GDP-relative demand contribution (src/lib/economy/
   *  privateEconomy.ts) — zero at baseline, never a direct GDP write. */
  householdConsumption: number;
  /** Private investment's GDP-relative demand contribution. */
  privateInvestment: number;
  /** Target passed into the aggregate-demand relaxation step. */
  netDemandTarget: number;
}

export interface InflationContributions {
  /** Domestic price pressure generated by the supply-adjusted output gap. */
  domesticDemandPressure: number;
  /** Incomplete, lagged exchange-rate pass-through from ExternalEconomyState. */
  importedInflationPressure: number;
  /** Target passed into the inflation-pressure relaxation step. */
  totalInflationPressureTarget: number;
}

/** Supply-side attribution for the current turn. Values other than the index are
 * GDP-relative flows/stocks and deliberately remain separate from fiscal demand. */
export interface SupplyContributions {
  productiveCapacityIndex: number;
  availableCapacityHeadroom: number;
  capacityUtilisationFlow: number;
  supplyHeadroomApplied: number;
  /** This turn's private capital-formation flow into productiveCapacityIndex — kept
   *  separate from investmentDemandContribution (see PrivateEconomyState). */
  capitalFormationFlow: number;
}

export interface EconomyAdvanceResult {
  dynamics: EconomyDynamics;
  externalEconomy: ExternalEconomyState;
  privateEconomy: PrivateEconomyState;
  /** Player-facing R$bn-per-turn reporting mirror derived from export/import indexes. */
  tradeBalance: number;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  demandContributions: DemandContributions;
  inflationContributions: InflationContributions;
  supplyContributions: SupplyContributions;
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
  monetary: {
    /** Gameplay calibration, not an econometric estimate of Brazil's neutral rate. */
    neutralNominalRate: number;
    initialSelic: number;
    inflationTarget: number;
    toleranceBand: number;
    meetingIntervalDays: number;
    inflationDeviationResponse: number;
    inflationPressureResponse: number;
    outputGapResponse: number;
    demandPressureResponse: number;
    policyInertia: number;
    holdDeadband: number;
    /** Increasing cost of choosing a larger discrete meeting move. */
    moveSizePenalty: number;
    /** Above-target inflation restrains easing magnitude without forbidding cuts. */
    aboveTargetEasingPenalty: number;
    /** Limited memory: recent same-direction moves reduce urgency for another move. */
    recentPathPenalty: number;
    recentDecisionWindow: number;
    /** Restraint already in the transmission pipeline makes HOLD more competitive. */
    transmissionPipelinePenalty: number;
    /** Remaining distance from neutral supports measured normalization. */
    restrictiveStanceEasingSupport: number;
    minSelic: number;
    maxSelic: number;
    stanceToDemandPressure: number;
    transmissionRate: number;
    monetaryDemandBound: number;
  };
  rates: {
    demandPressure: number;
    outputGap: number;
    inflationPressure: number;
    labourSlack: number;
    gdpGrowth: number;
    inflation: number;
    unemployment: number;
    /** Fraction of positive demand pressure that can activate unused capacity each turn. */
    capacityUtilisation: number;
  };
  scales: {
    outputGapToGrowth: number;
    inflationPressureToInflation: number;
    labourSlackToUnemployment: number;
    /** Share of completed project cost that becomes useful productive capacity. */
    infrastructureCapacityEfficiency: number;
    /** Capacity-index points created by an efficient project equal to 1% of GDP. */
    infrastructureCapacityIndexPerGDPPercent: number;
    /** Fraction of available headroom that reduces the inflationary output gap. */
    capacityHeadroomToOutputGap: number;
    /** Converts this turn's capacity activation flow into a temporary growth target. */
    capacityUtilisationToGrowth: number;
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
    productiveCapacityIndexMin: number;
    productiveCapacityIndexMax: number;
    availableCapacityHeadroom: number;
    capacityUtilisationFlow: number;
    infrastructureCapacityAddition: number;
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
  monetary: {
    neutralNominalRate: 7,
    initialSelic: 15,
    inflationTarget: 3,
    toleranceBand: 1.5,
    meetingIntervalDays: 46,
    inflationDeviationResponse: 1.2,
    inflationPressureResponse: 60,
    outputGapResponse: 80,
    demandPressureResponse: 40,
    policyInertia: 0.12,
    holdDeadband: 0.3,
    moveSizePenalty: 0.04,
    aboveTargetEasingPenalty: 0.08,
    recentPathPenalty: 0.18,
    recentDecisionWindow: 3,
    transmissionPipelinePenalty: 0.08,
    restrictiveStanceEasingSupport: 0.02,
    minSelic: 2,
    maxSelic: 20,
    stanceToDemandPressure: 0.003,
    transmissionRate: 0.12,
    monetaryDemandBound: 0.04,
  },
  rates: {
    demandPressure: 0.35,
    outputGap: 0.25,
    inflationPressure: 0.12,
    labourSlack: 0.08,
    gdpGrowth: 0.3,
    inflation: 0.08,
    unemployment: 0.06,
    capacityUtilisation: 0.03,
  },
  scales: {
    outputGapToGrowth: 60,
    inflationPressureToInflation: 40,
    labourSlackToUnemployment: 50,
    infrastructureCapacityEfficiency: 0.65,
    infrastructureCapacityIndexPerGDPPercent: 3,
    capacityHeadroomToOutputGap: 0.5,
    capacityUtilisationToGrowth: 320,
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
    productiveCapacityIndexMin: 75,
    productiveCapacityIndexMax: 140,
    availableCapacityHeadroom: 0.08,
    capacityUtilisationFlow: 0.006,
    infrastructureCapacityAddition: 5,
  },
};
