import type { CriminalOrganisation, EducationState, GameState } from "@/lib/gameState";
import { clamp0to100, pushCapped } from "@/lib/gameState";
import { advanceEconomy } from "@/lib/economy/advanceEconomy";
import { advanceNominalGDP } from "@/lib/fiscal";
import type {
  DemandContributions,
  InflationContributions,
  SupplyContributions,
} from "@/lib/economy/types";

/**
 * Rounds every numeric GameState field to a sensible display precision.
 * Floating-point arithmetic accumulates noise (e.g. 4.368474999999999) across
 * turns of drift/effect application — this is the single place that cleans it
 * up before the state is shown to the player or persisted.
 */
export function roundGameStateNumbers(state: GameState): GameState {
  return {
    ...state,
    approval: Math.round(state.approval * 10) / 10,
    securityIndex: Math.round(state.securityIndex * 10) / 10,
    gdpGrowth: Math.round(state.gdpGrowth * 100) / 100,
    inflation: Math.round(state.inflation * 100) / 100,
    unemployment: Math.round(state.unemployment * 100) / 100,
    informalEconomy: Math.round(state.informalEconomy * 100) / 100,
    congressionalSupport: Math.round(state.congressionalSupport * 10) / 10,
    militaryMorale: Math.round(state.militaryMorale * 10) / 10,
    civilLiberties: Math.round(state.civilLiberties * 10) / 10,
    internationalPressure: Math.round(state.internationalPressure * 10) / 10,
    fdiFlow: Math.round(state.fdiFlow * 100) / 100,
    tradeBalance: Math.round(state.tradeBalance * 100) / 100,
    sovereignDebt: Math.round(state.sovereignDebt * 100) / 100,
    publicInvestment: Math.round(state.publicInvestment * 100) / 100,
    mediaSentiment: Math.round(state.mediaSentiment * 10) / 10,
    globalStanding: Math.round(state.globalStanding * 10) / 10,
    allianceStrength: Math.round(state.allianceStrength * 10) / 10,
    businessRegistrations: Math.round(state.businessRegistrations),
    anipAssetsFrozen: Math.round(state.anipAssetsFrozen * 1000) / 1000,
    education: {
      ...state.education,
      infrastructureIndex: Math.round(state.education.infrastructureIndex * 10) / 10,
      teacherQualityIndex: Math.round(state.education.teacherQualityIndex * 10) / 10,
      curriculumIndex: Math.round(state.education.curriculumIndex * 10) / 10,
      accessIndex: Math.round(state.education.accessIndex * 10) / 10,
      primaryEnrollmentRate: Math.round(state.education.primaryEnrollmentRate * 100) / 100,
      secondaryCompletionRate: Math.round(state.education.secondaryCompletionRate * 100) / 100,
      literacyRate: Math.round(state.education.literacyRate * 100) / 100,
      dropoutRate: Math.round(state.education.dropoutRate * 100) / 100,
      pisaEquivalentScore: Math.round(state.education.pisaEquivalentScore * 10) / 10,
      educationIndex: Math.round(state.education.educationIndex),
    },
    economyDynamics: {
      ...state.economyDynamics,
      demandPressure: Math.round(state.economyDynamics.demandPressure * 10000) / 10000,
      outputGap: Math.round(state.economyDynamics.outputGap * 10000) / 10000,
      inflationPressure: Math.round(state.economyDynamics.inflationPressure * 10000) / 10000,
      labourSlack: Math.round(state.economyDynamics.labourSlack * 10000) / 10000,
      productiveCapacityIndex: Math.round(state.economyDynamics.productiveCapacityIndex * 10000) / 10000,
      availableCapacityHeadroom: Math.round(state.economyDynamics.availableCapacityHeadroom * 1000000) / 1000000,
      capacityUtilisationFlow: Math.round(state.economyDynamics.capacityUtilisationFlow * 1000000) / 1000000,
      supplyHeadroomApplied: Math.round(state.economyDynamics.supplyHeadroomApplied * 1000000) / 1000000,
      transmittedMonetaryPressure: Math.round(state.economyDynamics.transmittedMonetaryPressure * 1000000) / 1000000,
    },
    privateEconomy: {
      ...state.privateEconomy,
      consumptionIndex: Math.round(state.privateEconomy.consumptionIndex * 10000) / 10000,
      investmentIndex: Math.round(state.privateEconomy.investmentIndex * 10000) / 10000,
      consumptionDemandContribution: Math.round(state.privateEconomy.consumptionDemandContribution * 1000000) / 1000000,
      investmentDemandContribution: Math.round(state.privateEconomy.investmentDemandContribution * 1000000) / 1000000,
      capitalFormationFlow: Math.round(state.privateEconomy.capitalFormationFlow * 1000000) / 1000000,
    },
    fiscal: {
      ...state.fiscal,
      nominalGDP: Math.round(state.fiscal.nominalGDP * 10000) / 10000,
    },
    monetaryPolicy: {
      ...state.monetaryPolicy,
      currentSelic: Math.round(state.monetaryPolicy.currentSelic * 100) / 100,
      previousSelic: Math.round(state.monetaryPolicy.previousSelic * 100) / 100,
      monetaryStance: Math.round(state.monetaryPolicy.monetaryStance * 100) / 100,
    },
    externalEconomy: {
      ...state.externalEconomy,
      exchangeRateBrlPerUsd: Math.round(state.externalEconomy.exchangeRateBrlPerUsd * 10000) / 10000,
      equilibriumExchangeRate: Math.round(state.externalEconomy.equilibriumExchangeRate * 10000) / 10000,
      exchangeRatePressure: Math.round(state.externalEconomy.exchangeRatePressure * 1000000) / 1000000,
      foreignDemandIndex: Math.round(state.externalEconomy.foreignDemandIndex * 1000) / 1000,
      commodityConditionsIndex: Math.round(state.externalEconomy.commodityConditionsIndex * 1000) / 1000,
      globalRiskIndex: Math.round(state.externalEconomy.globalRiskIndex * 1000) / 1000,
      exportIndex: Math.round(state.externalEconomy.exportIndex * 1000) / 1000,
      importIndex: Math.round(state.externalEconomy.importIndex * 1000) / 1000,
      externalDemandContribution: Math.round(state.externalEconomy.externalDemandContribution * 1000000) / 1000000,
      importedInflationPressure: Math.round(state.externalEconomy.importedInflationPressure * 1000000) / 1000000,
    },
  };
}

/**
 * Numeric GameState fields the simulation (and structured AI order effects)
 * are allowed to move. Kept as an explicit allowlist rather than a generic
 * index signature so `applyNumericEffects` stays type-safe.
 */
export type NumericStatKey =
  | "approval"
  | "securityIndex"
  | "gdpGrowth"
  | "inflation"
  | "congressionalSupport"
  | "militaryMorale"
  | "civilLiberties"
  | "internationalPressure"
  | "fdiFlow"
  | "unemployment"
  | "businessRegistrations"
  | "informalEconomy"
  | "sovereignDebt"
  | "publicInvestment"
  | "activeProjects";

export type EffectMap = Partial<Record<NumericStatKey, number>>;

/**
 * mediaSentiment isn't in the NumericStatKey allowlist used by structured AI
 * order effects (it's owned by the media subsystem), but one relationship
 * rule below needs to nudge it — this widened map allows that one extra key
 * without opening the door to arbitrary strings elsewhere.
 */
export type ExtendedEffectMap = EffectMap & { mediaSentiment?: number };

export interface SimulationRule {
  id: string;
  condition: (s: GameState) => boolean;
  effects: ExtendedEffectMap;
  organisationEffects?: { all: number };
  projectSpeedMultiplier?: number;
  description: string;
}

export const RELATIONSHIPS: SimulationRule[] = [
  // Security affects economy. The gdpGrowth components of these two rules were
  // retired in the Economic Simulation V2 slice — that field is now owned exclusively
  // by advanceEconomy()'s causal demand/output chain (src/lib/economy/), and this
  // RELATIONSHIPS array would otherwise double-count it independently. fdiFlow is
  // untouched: it isn't part of this slice's migrated fields.
  {
    id: "insecurity_deters_investment",
    condition: (s) => s.securityIndex < 40,
    effects: { fdiFlow: -1.5 },
    description: "Widespread insecurity is deterring foreign investment",
  },
  {
    id: "stable_security_attracts_capital",
    condition: (s) => s.securityIndex > 70,
    effects: { fdiFlow: 0.8 },
    description: "Improved security is attracting foreign capital",
  },

  // Inflation dynamics. Both rules correctly keep reading inflation to drive a
  // political consequence (economy → approval, not the other way round) — that
  // direction is retained. runaway_inflation's gdpGrowth component was retired for
  // the same double-counting reason as above.
  {
    id: "high_inflation_erodes_approval",
    condition: (s) => s.inflation > 6,
    effects: { approval: -2 },
    description: "Rising cost of living is eroding public approval",
  },
  {
    id: "runaway_inflation",
    condition: (s) => s.inflation > 10,
    effects: { approval: -4, fdiFlow: -2.0 },
    description: "Inflation is destabilising the economy",
  },

  // Economic performance affects approval
  {
    id: "growth_dividend",
    condition: (s) => s.gdpGrowth > 3.5,
    effects: { approval: 1, congressionalSupport: 1 },
    description: "Strong economic growth is boosting public confidence",
  },
  {
    id: "recession_pain",
    condition: (s) => s.gdpGrowth < 0,
    effects: { approval: -3, congressionalSupport: -2 },
    description: "Economic contraction is damaging political support",
  },

  // Weak state enables criminal expansion
  {
    id: "ungoverned_space_grows_crime",
    condition: (s) => s.securityIndex < 35,
    effects: {},
    organisationEffects: { all: 2 },
    description: "Weak state authority is allowing criminal organisations to expand",
  },

  // Coalition health affects legislative capacity
  {
    id: "weak_coalition_stalls_reform",
    condition: (s) => s.congressionalSupport < 40,
    effects: { activeProjects: 0 },
    projectSpeedMultiplier: 0.7,
    description: "Weak congressional coalition is slowing legislative agenda",
  },

  // Debt dynamics. The inflation component was retired — that field is now owned by
  // advanceEconomy(). A debt-driven risk-premium/credibility channel feeding inflation
  // pressure is a reasonable later addition to the causal engine itself, not to this
  // threshold rule (deferred; see the V2 slice report).
  {
    id: "high_debt_market_pressure",
    condition: (s) => s.sovereignDebt > 95,
    effects: { fdiFlow: -1.0 },
    description: "High sovereign debt is pressuring markets",
  },

  // Civil liberties feed international pressure
  {
    id: "civil_liberties_erosion_draws_scrutiny",
    condition: (s) => s.civilLiberties < 40,
    effects: { internationalPressure: 5, mediaSentiment: -2 },
    description: "Civil liberties concerns are drawing international scrutiny",
  },

  // Military morale and civilian control tension
  {
    id: "low_military_morale_risk",
    condition: (s) => s.militaryMorale < 35,
    effects: { securityIndex: -3 },
    description: "Low military morale is affecting operational effectiveness",
  },

  // Approval feedback loops
  {
    id: "popularity_boosts_coalition",
    condition: (s) => s.approval > 65,
    effects: { congressionalSupport: 2 },
    description: "Presidential popularity is strengthening the coalition",
  },
  {
    id: "unpopularity_erodes_coalition",
    condition: (s) => s.approval < 30,
    effects: { congressionalSupport: -3 },
    description: "Presidential unpopularity is weakening congressional support",
  },

  // Informal economy dynamics
  {
    id: "high_unemployment_grows_informality",
    condition: (s) => s.unemployment > 12,
    effects: { informalEconomy: 0.5 },
    description: "Unemployment is pushing workers into the informal economy",
  },

  // Business registration feedback. Both effects were retired — gdpGrowth and
  // unemployment are now owned by advanceEconomy(), which has no input channel from
  // business formation yet. Reintroducing this link (business formation feeding demand
  // or productive capacity) is a reasonable later addition to the causal engine rather
  // than this threshold rule; businessRegistrations itself is untouched and still
  // tracked/displayed.
  {
    id: "business_formation_boosts_growth",
    condition: (s) => s.businessRegistrations > 5000,
    effects: {},
    description: "Strong business formation is generating economic momentum",
  },

  // Education system feedback
  {
    id: "low_education_high_crime",
    condition: (s) => s.education.educationIndex < 40,
    effects: {},
    organisationEffects: { all: 1 },
    description: "Low education levels are expanding the criminal recruitment pool",
  },
  {
    id: "strong_education_boosts_economy",
    condition: (s) => s.education.educationIndex > 65,
    effects: { gdpGrowth: 0.05, fdiFlow: 0.1 },
    description: "Strong education system is improving workforce quality and attracting investment",
  },
  {
    id: "high_dropout_feeds_informality",
    condition: (s) => s.education.dropoutRate > 14,
    effects: { informalEconomy: 0.2, unemployment: 0.1 },
    description: "High school dropout rate is expanding the informal economy",
  },
  {
    id: "teacher_shortage_degrades_system",
    condition: (s) => s.education.teacherQualityIndex < 35,
    effects: {},
    description: "Teacher quality shortfall is causing education system to deteriorate passively",
  },
];

/** Applies a set of numeric deltas to a (shallow-copied) GameState in place. */
export function applyNumericEffects<T extends GameState>(
  state: T,
  effects: ExtendedEffectMap
): T {
  const rec = state as unknown as Record<string, number>;
  for (const [key, delta] of Object.entries(effects)) {
    if (typeof delta === "number" && typeof rec[key] === "number") {
      rec[key] = rec[key] + delta;
    }
  }
  return state;
}

function driftToward(current: number, baseline: number, rate: number): number {
  const diff = baseline - current;
  return current + diff * rate;
}

/** Generic min/max clamp — clamp0to100 only covers the 0-100 case. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Advances the education subsystem by one turn: recomputes the composite
 * index, drifts outcome metrics toward what the core indices imply, and
 * pushes this turn's values onto the lagged history arrays used for
 * cascade effects elsewhere in runTurnTick.
 */
export function updateEducation(state: GameState): EducationState {
  const edu = { ...state.education };

  // --- Recalculate composite educationIndex ---
  edu.educationIndex = Math.round(
    edu.infrastructureIndex * 0.25 +
      edu.teacherQualityIndex * 0.3 +
      edu.curriculumIndex * 0.25 +
      edu.accessIndex * 0.2
  );

  // --- Outcome metrics drift toward what the indices imply ---
  // Enrollment responds to infrastructure and access over ~4 turns
  const impliedEnrollment = 70 + (edu.infrastructureIndex + edu.accessIndex) / 4;
  edu.primaryEnrollmentRate = driftToward(edu.primaryEnrollmentRate, impliedEnrollment, 0.08);
  edu.primaryEnrollmentRate = clamp(edu.primaryEnrollmentRate, 60, 99.5);

  // Dropout rate inversely tracks infrastructure and teacher quality
  const impliedDropout = 25 - (edu.infrastructureIndex + edu.teacherQualityIndex) / 10;
  edu.dropoutRate = driftToward(edu.dropoutRate, Math.max(2, impliedDropout), 0.06);

  // Secondary completion responds to dropout rate and access — slower
  const impliedCompletion = 100 - edu.dropoutRate * 2.5;
  edu.secondaryCompletionRate = driftToward(edu.secondaryCompletionRate, impliedCompletion, 0.04);
  edu.secondaryCompletionRate = clamp(edu.secondaryCompletionRate, 30, 98);

  // Literacy is very slow-moving — responds to enrollment and completion
  const impliedLiteracy =
    60 + edu.primaryEnrollmentRate * 0.25 + edu.secondaryCompletionRate * 0.15;
  edu.literacyRate = driftToward(edu.literacyRate, impliedLiteracy, 0.01);
  edu.literacyRate = clamp(edu.literacyRate, 50, 99.9);

  // PISA equivalent responds to curriculum and teacher quality — very slow
  const impliedPISA = 200 + edu.curriculumIndex * 2 + edu.teacherQualityIndex * 2;
  edu.pisaEquivalentScore = driftToward(edu.pisaEquivalentScore, impliedPISA, 0.02);
  edu.pisaEquivalentScore = clamp(edu.pisaEquivalentScore, 200, 600);

  // --- Update lagged history arrays (max 20 entries) ---
  edu.completionRateHistory = pushCapped(edu.completionRateHistory, edu.secondaryCompletionRate, 20);
  edu.literacyHistory = pushCapped(edu.literacyHistory, edu.literacyRate, 20);
  edu.pisaHistory = pushCapped(edu.pisaHistory, edu.pisaEquivalentScore, 20);

  return edu;
}

/** capacity → threatLevel, the same bands runTurnTick uses every tick. */
export function deriveThreatLevelFromCapacity(
  capacity: number
): CriminalOrganisation["threatLevel"] {
  if (capacity < 15) return "neutralised";
  if (capacity < 30) return "low";
  if (capacity < 50) return "moderate";
  if (capacity < 75) return "high";
  return "critical";
}

export interface TurnTickResult {
  newState: GameState;
  triggeredRules: string[];
  /** Causal attribution for this turn's demand pressure (src/lib/economy/) — not
   *  persisted, kept for a future Explain surface. See advanceEconomy(). */
  demandContributions: DemandContributions;
  /** Supply-side attribution from completed productive infrastructure. */
  supplyContributions: SupplyContributions;
  /** Price-pressure attribution kept for later explainability surfaces. */
  inflationContributions: InflationContributions;
}

/**
 * The world's "physics" for one turn: relationship rules, natural drift
 * toward baselines, and slow criminal-organisation regeneration when not
 * actively suppressed. Pure — returns a new state, never mutates the input.
 *
 * `completedTurn` (default `state.turn`) is passed straight through to
 * `advanceEconomy` for its ledger-scan attribution — see that function's doc comment.
 * `resolveTurn` calls this after `state.turn` has already advanced, so it must pass
 * the pre-increment turn explicitly.
 */
export function runTurnTick(state: GameState, completedTurn: number = state.turn): TurnTickResult {
  const newState: GameState = {
    ...state,
    criminalOrganisations: state.criminalOrganisations.map((o) => ({ ...o })),
  };
  const triggered: string[] = [];

  RELATIONSHIPS.forEach((rule) => {
    if (!rule.condition(newState)) return;
    triggered.push(rule.id);

    applyNumericEffects(newState, rule.effects);

    if (rule.organisationEffects?.all) {
      const delta = rule.organisationEffects.all;
      newState.criminalOrganisations = newState.criminalOrganisations.map((org) => ({
        ...org,
        capacity: clamp0to100(org.capacity + delta),
      }));
    }
  });

  // Update education simulation
  newState.education = updateEducation(newState);

  // Education cascades — time-lagged effects on broader simulation
  // Uses values from N turns ago stored in history arrays

  // 8 turns ago: completion rate → unemployment and informal economy
  const completionRate8TurnsAgo =
    newState.education.completionRateHistory[
      Math.max(0, newState.education.completionRateHistory.length - 8)
    ];
  if (completionRate8TurnsAgo > 72) {
    newState.unemployment = Math.max(0, newState.unemployment - 0.06);
    newState.informalEconomy = Math.max(0, newState.informalEconomy - 0.04);
  }
  if (completionRate8TurnsAgo < 55) {
    newState.unemployment = Math.min(25, newState.unemployment + 0.04);
  }

  // 12 turns ago: literacy rate → criminal organisation recruitment capacity
  const literacyRate12TurnsAgo =
    newState.education.literacyHistory[
      Math.max(0, newState.education.literacyHistory.length - 12)
    ];
  if (literacyRate12TurnsAgo > 95) {
    // High literacy reduces cartel recruitment — slow their natural regeneration
    newState.criminalOrganisations = newState.criminalOrganisations.map((org) => ({
      ...org,
      capacity:
        org.trend === "growing"
          ? org.capacity // still growing but slightly slower — modelled by not adding the usual regen
          : Math.max(0, org.capacity - 0.3),
    }));
  }

  // 15 turns ago: PISA score → GDP growth (skilled workforce productivity)
  const pisa15TurnsAgo =
    newState.education.pisaHistory[Math.max(0, newState.education.pisaHistory.length - 15)];
  if (pisa15TurnsAgo > 450) {
    newState.gdpGrowth = Math.min(8, newState.gdpGrowth + 0.04);
    newState.fdiFlow = Math.min(30, newState.fdiFlow + 0.15);
  }
  if (pisa15TurnsAgo > 500) {
    // Additional boost for high-performing education system
    newState.businessRegistrations = Math.round(newState.businessRegistrations + 150);
  }

  // Natural drift toward baselines (inflation/unemployment moved to the causal
  // economy engine below — this is everything else that still uses a fixed pull).
  newState.internationalPressure = driftToward(newState.internationalPressure, 20, 0.5);

  // Causal economy: fiscal stance → demand pressure → output gap → gdpGrowth/
  // inflation/unemployment. This is the sole writer of these three fields from here
  // on — see src/lib/economy/advanceEconomy.ts. Runs after the relationship rules,
  // education cascades and drift above so it has the final, authoritative say each
  // turn while still relaxing gradually from whatever those legacy inputs left behind,
  // rather than fighting or silently overriding them.
  const economyResult = advanceEconomy(newState, undefined, completedTurn);
  newState.economyDynamics = economyResult.dynamics;
  newState.externalEconomy = economyResult.externalEconomy;
  newState.privateEconomy = economyResult.privateEconomy;
  // Public R$bn-per-turn report derived from the canonical export/import indexes.
  newState.tradeBalance = economyResult.tradeBalance;
  newState.gdpGrowth = economyResult.gdpGrowth;
  newState.inflation = economyResult.inflation;
  newState.unemployment = economyResult.unemployment;

  // Nominal GDP evolves from this turn's just-computed real growth and inflation —
  // fiscal.nominalGDP stays the sole canonical GDP level; debtToGDP is re-derived from
  // it immediately after, and sovereignDebt (its externally-readable mirror) is kept in
  // sync so it never runs a turn stale relative to fiscal.debtToGDP.
  newState.fiscal = advanceNominalGDP(newState.fiscal, newState.gdpGrowth, newState.inflation);
  newState.sovereignDebt = newState.fiscal.debtToGDP;

  // Criminal organisations regenerate slowly if not actively pressured
  newState.criminalOrganisations = newState.criminalOrganisations.map((org) => {
    if (org.threatLevel === "neutralised") return org;
    if (org.trend === "weakening" || org.trend === "collapsing") return org;
    const regenAmount = org.capacity < 80 ? 1 : 0;
    return { ...org, capacity: Math.min(100, org.capacity + regenAmount) };
  });

  // Update organisation threat levels based on capacity
  newState.criminalOrganisations = newState.criminalOrganisations.map((org) => ({
    ...org,
    threatLevel: deriveThreatLevelFromCapacity(org.capacity),
  }));

  // Clamp all core stats
  newState.approval = clamp0to100(newState.approval);
  newState.securityIndex = clamp0to100(newState.securityIndex);
  newState.congressionalSupport = clamp0to100(newState.congressionalSupport);
  newState.militaryMorale = clamp0to100(newState.militaryMorale);
  newState.civilLiberties = clamp0to100(newState.civilLiberties);
  newState.internationalPressure = clamp0to100(newState.internationalPressure);
  newState.mediaSentiment = clamp0to100(newState.mediaSentiment);
  // inflation/unemployment bounds are enforced inside advanceEconomy() itself
  // (EconomyCalibration.bounds) — no separate clamp needed here.

  return {
    newState: roundGameStateNumbers(newState),
    triggeredRules: triggered,
    demandContributions: economyResult.demandContributions,
    supplyContributions: economyResult.supplyContributions,
    inflationContributions: economyResult.inflationContributions,
  };
}

export interface FailureThreshold {
  id: string;
  name: string;
  description: string;
  severity: "critical" | "high";
}

/** Existential/crisis conditions that must interrupt the player, checked fresh every turn. */
export function checkFailureThresholds(state: GameState): FailureThreshold[] {
  const triggered: FailureThreshold[] = [];

  if (state.approval < 20 && state.militaryMorale < 40) {
    triggered.push({
      id: "coup_threat",
      name: "MILITARY DISCONTENT",
      description:
        "Reports indicate senior military officers are questioning civilian authority. A coup attempt may be imminent.",
      severity: "critical",
    });
  }

  if (state.inflation > 15) {
    triggered.push({
      id: "hyperinflation",
      name: "HYPERINFLATION CRISIS",
      description:
        "The currency is in freefall. Emergency stabilisation measures required immediately.",
      severity: "critical",
    });
  }

  if (
    state.sovereignDebt > 110 &&
    (state.creditRating === "Junk" || state.creditRating === "CCC")
  ) {
    triggered.push({
      id: "debt_crisis",
      name: "SOVEREIGN DEBT CRISIS",
      description:
        "International creditors are demanding IMF intervention. Fiscal sovereignty is at stake.",
      severity: "critical",
    });
  }

  if (state.congressionalSupport < 25) {
    triggered.push({
      id: "no_confidence",
      name: "NO CONFIDENCE VOTE",
      description:
        "The opposition is mounting a no-confidence motion. Coalition partners are defecting.",
      severity: "high",
    });
  }

  const criticalStates = Object.values(state.stateSecurity).filter(
    (s) => s === "critical"
  ).length;
  if (criticalStates > 8) {
    triggered.push({
      id: "state_collapse",
      name: "TERRITORIAL COLLAPSE",
      description:
        "Federal authority is failing in multiple states simultaneously. National unity is at risk.",
      severity: "critical",
    });
  }

  if (state.internationalPressure > 80) {
    triggered.push({
      id: "diplomatic_isolation",
      name: "DIPLOMATIC ISOLATION",
      description:
        "Brazil faces coordinated international pressure. Major partners are considering sanctions.",
      severity: "high",
    });
  }

  return triggered;
}

const RULE_STAT_LABELS: Record<string, string> = {
  approval: "approval",
  securityIndex: "security",
  gdpGrowth: "GDP growth",
  inflation: "inflation",
  congressionalSupport: "congressional support",
  militaryMorale: "military morale",
  civilLiberties: "civil liberties",
  internationalPressure: "international pressure",
  fdiFlow: "FDI",
  unemployment: "unemployment",
  businessRegistrations: "business registrations",
  informalEconomy: "informal economy",
  sovereignDebt: "sovereign debt",
  publicInvestment: "public investment",
  mediaSentiment: "media sentiment",
};

/** Renders a triggered rule as a short player-facing line, e.g. "... (-1.5 FDI)". */
export function describeTriggeredRule(ruleId: string): string | null {
  const rule = RELATIONSHIPS.find((r) => r.id === ruleId);
  if (!rule) return null;

  const parts = Object.entries(rule.effects)
    .filter(([, delta]) => typeof delta === "number" && delta !== 0)
    .map(([key, delta]) => {
      const label = RULE_STAT_LABELS[key] ?? key;
      const rounded = Math.round((delta as number) * 100) / 100;
      return `${rounded > 0 ? "+" : ""}${rounded} ${label}`;
    });

  if (rule.organisationEffects?.all) {
    parts.push(
      `${rule.organisationEffects.all > 0 ? "+" : ""}${rule.organisationEffects.all} criminal capacity`
    );
  }

  return parts.length > 0 ? `${rule.description} (${parts.join(", ")})` : rule.description;
}
