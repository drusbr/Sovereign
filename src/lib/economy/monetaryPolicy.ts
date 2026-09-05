import type { GameState } from "@/lib/gameState";
import { DEFAULT_ECONOMY_CALIBRATION, type EconomyCalibration } from "./types";

export type CopomDecisionCode =
  | "HOLD"
  | "CUT_25" | "CUT_50" | "CUT_75" | "CUT_100"
  | "HIKE_25" | "HIKE_50" | "HIKE_75" | "HIKE_100";

export type MonetaryPolicyStance = "RESTRICTIVE" | "NEUTRAL" | "ACCOMMODATIVE";

export interface CopomDecisionRecord {
  id: string;
  turn: number;
  date: string;
  previousSelic: number;
  newSelic: number;
  change: number;
  inflation: number;
  inflationTarget: number;
  outputGap: number;
  inflationPressure: number;
  demandPressure: number;
  labourSlack: number;
  monetaryStance: number;
  decision: CopomDecisionCode;
  reasons: string[];
}

export interface MonetaryPolicyState {
  currentSelic: number;
  previousSelic: number;
  /** Percentage-point distance from the calibrated neutral nominal rate. */
  monetaryStance: number;
  stanceClassification: MonetaryPolicyStance;
  inflationTarget: number;
  toleranceBand: number;
  lastDecisionTurn: number | null;
  lastDecisionDate: string | null;
  nextMeetingDate: string;
  decisionHistory: CopomDecisionRecord[];
}

export interface CopomCandidate {
  decision: CopomDecisionCode;
  change: number;
  resultingSelic: number;
  score: number;
}

export interface CopomEvaluation {
  desiredSelic: number;
  candidates: CopomCandidate[];
  selected: CopomCandidate;
  reasons: string[];
}

function parseGameDate(value: string): Date {
  const parsed = new Date(`${value} 00:00:00 UTC`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid game date: ${value}`);
  return parsed;
}

function formatGameDate(value: Date): string {
  return value.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

export function addGameDays(date: string, days: number): string {
  const next = parseGameDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return formatGameDate(next);
}

export function isCopomMeetingDue(state: MonetaryPolicyState, date: string): boolean {
  return parseGameDate(date).getTime() >= parseGameDate(state.nextMeetingDate).getTime();
}

export function classifyMonetaryStance(distanceFromNeutral: number): MonetaryPolicyStance {
  if (distanceFromNeutral > 0.5) return "RESTRICTIVE";
  if (distanceFromNeutral < -0.5) return "ACCOMMODATIVE";
  return "NEUTRAL";
}

export function createInitialMonetaryPolicyState(
  startDate: string,
  calibration: EconomyCalibration = DEFAULT_ECONOMY_CALIBRATION
): MonetaryPolicyState {
  const { monetary } = calibration;
  const monetaryStance = monetary.initialSelic - monetary.neutralNominalRate;
  return {
    currentSelic: monetary.initialSelic,
    previousSelic: monetary.initialSelic,
    monetaryStance,
    stanceClassification: classifyMonetaryStance(monetaryStance),
    inflationTarget: monetary.inflationTarget,
    toleranceBand: monetary.toleranceBand,
    lastDecisionTurn: null,
    lastDecisionDate: null,
    nextMeetingDate: addGameDays(startDate, monetary.meetingIntervalDays),
    decisionHistory: [],
  };
}

const STEPS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1] as const;

function decisionCode(change: number): CopomDecisionCode {
  if (change === 0) return "HOLD";
  const direction = change > 0 ? "HIKE" : "CUT";
  return `${direction}_${Math.round(Math.abs(change) * 100)}` as CopomDecisionCode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function decisionReasons(state: GameState, desiredSelic: number): string[] {
  const reasons: string[] = [];
  const deviation = state.inflation - state.monetaryPolicy.inflationTarget;
  if (deviation > 0.5) reasons.push("inflation remains above the central target");
  else if (deviation < -0.5) reasons.push("inflation is below the central target");
  else reasons.push("inflation is close to target");
  if (state.economyDynamics.inflationPressure > 0.002) reasons.push("underlying price pressure is positive");
  else if (state.economyDynamics.inflationPressure < -0.002) reasons.push("underlying price pressure is easing");
  if (state.economyDynamics.outputGap > 0.003) reasons.push("output is running above neutral conditions");
  else if (state.economyDynamics.outputGap < -0.003) reasons.push("economic activity is below neutral conditions");
  if (Math.abs(desiredSelic - state.monetaryPolicy.currentSelic) < 0.3) reasons.push("the current rate is consistent with the reaction function");
  return reasons.slice(0, 3);
}

/** Deterministic Situation → Candidates → Scores → Selection COPOM decision. */
export function evaluateCopomDecision(
  state: GameState,
  calibration: EconomyCalibration = DEFAULT_ECONOMY_CALIBRATION
): CopomEvaluation {
  const { monetary } = calibration;
  const d = state.economyDynamics;
  const inflationDeviation = state.inflation - state.monetaryPolicy.inflationTarget;
  const desiredSelic = clamp(
    monetary.neutralNominalRate
      + inflationDeviation * monetary.inflationDeviationResponse
      + d.inflationPressure * monetary.inflationPressureResponse
      + d.outputGap * monetary.outputGapResponse
      + d.demandPressure * monetary.demandPressureResponse,
    monetary.minSelic,
    monetary.maxSelic
  );
  const gap = desiredSelic - state.monetaryPolicy.currentSelic;
  const direction = Math.sign(gap);
  const recentSameDirection = state.monetaryPolicy.decisionHistory
    .slice(-monetary.recentDecisionWindow)
    .filter((decision) => Math.sign(decision.change) === direction)
    .reduce((sum, decision) => sum + Math.abs(decision.change), 0);
  let targetMagnitude = Math.abs(gap) < monetary.holdDeadband
    ? 0
    : Math.abs(gap * monetary.policyInertia);

  if (direction < 0) {
    // A still-restrictive rate supports normalization, but above-target inflation,
    // recent cumulative easing and restraint already working through demand all make
    // another large cut less urgent. These are continuous score terms — no Selic-
    // level threshold or scripted meeting path is involved.
    targetMagnitude += Math.max(0, state.monetaryPolicy.monetaryStance)
      * monetary.restrictiveStanceEasingSupport;
    targetMagnitude -= Math.max(0, inflationDeviation)
      * monetary.aboveTargetEasingPenalty;
    targetMagnitude -= recentSameDirection * monetary.recentPathPenalty;
    const pendingRestrictiveTransmission = Math.max(
      0,
      -d.transmittedMonetaryPressure / monetary.monetaryDemandBound
    );
    targetMagnitude -= pendingRestrictiveTransmission
      * monetary.transmissionPipelinePenalty;
  } else if (direction > 0) {
    targetMagnitude -= recentSameDirection * monetary.recentPathPenalty;
  }

  const targetChange = direction * clamp(targetMagnitude, 0, 1);
  const candidates = STEPS
    .map((change) => {
      const resultingSelic = clamp(state.monetaryPolicy.currentSelic + change, monetary.minSelic, monetary.maxSelic);
      const actualChange = resultingSelic - state.monetaryPolicy.currentSelic;
      return {
        decision: decisionCode(actualChange),
        change: actualChange,
        resultingSelic,
        score: -Math.abs(actualChange - targetChange)
          - actualChange * actualChange * monetary.moveSizePenalty,
      };
    })
    .sort((a, b) => b.score - a.score || Math.abs(a.change) - Math.abs(b.change));
  return {
    desiredSelic,
    candidates,
    selected: candidates[0],
    reasons: decisionReasons(state, desiredSelic),
  };
}

export function runCopomMeetingIfDue(
  state: GameState,
  turn: number = state.turn,
  date: string = state.date,
  calibration: EconomyCalibration = DEFAULT_ECONOMY_CALIBRATION
): { state: GameState; decision: CopomDecisionRecord | null; evaluation: CopomEvaluation | null } {
  const policy = state.monetaryPolicy;
  if (!isCopomMeetingDue(policy, date) || policy.lastDecisionTurn === turn) {
    return { state, decision: null, evaluation: null };
  }
  const evaluation = evaluateCopomDecision(state, calibration);
  const previousSelic = policy.currentSelic;
  const newSelic = Math.round(evaluation.selected.resultingSelic * 100) / 100;
  const monetaryStance = newSelic - calibration.monetary.neutralNominalRate;
  const record: CopomDecisionRecord = {
    id: `copom-${turn}-${date.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    turn,
    date,
    previousSelic,
    newSelic,
    change: Math.round((newSelic - previousSelic) * 100) / 100,
    inflation: state.inflation,
    inflationTarget: policy.inflationTarget,
    outputGap: state.economyDynamics.outputGap,
    inflationPressure: state.economyDynamics.inflationPressure,
    demandPressure: state.economyDynamics.demandPressure,
    labourSlack: state.economyDynamics.labourSlack,
    monetaryStance,
    decision: evaluation.selected.decision,
    reasons: evaluation.reasons,
  };
  return {
    state: {
      ...state,
      monetaryPolicy: {
        ...policy,
        currentSelic: newSelic,
        previousSelic,
        monetaryStance,
        stanceClassification: classifyMonetaryStance(monetaryStance),
        lastDecisionTurn: turn,
        lastDecisionDate: date,
        nextMeetingDate: addGameDays(date, calibration.monetary.meetingIntervalDays),
        decisionHistory: [...policy.decisionHistory, record].slice(-40),
      },
    },
    decision: record,
    evaluation,
  };
}

export function formatCopomDecision(record: CopomDecisionRecord): { headline: string; body: string } {
  const verb = record.change > 0 ? "raises" : record.change < 0 ? "cuts" : "holds";
  const headline = record.change === 0
    ? `COPOM holds Selic at ${record.newSelic.toFixed(2)}%`
    : `COPOM ${verb} Selic by ${Math.abs(record.change).toFixed(2)} percentage points to ${record.newSelic.toFixed(2)}%`;
  return {
    headline,
    body: `The Monetary Policy Committee ${verb === "holds" ? "maintained" : verb === "raises" ? "increased" : "reduced"} the Selic target as ${record.reasons.join(" and ")}.`,
  };
}
