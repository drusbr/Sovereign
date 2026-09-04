import { KNOWN_POLICY_CONSTRAINTS } from "./types";

export interface DetectedPolicyObjective {
  objectiveId: "REDUCE_INFLATION";
  constraintIds: string[];
}

const INFLATION_INTENT =
  /\b(reduce|lower|bring\s+down|cut|curb|tame|rein\s+in|control|contain)\w*\b[^.]{0,60}\binflation\b|\binflation\b[^.]{0,60}\b(down|lower|reduced?)\b/i;

const MENTIONS_INFRASTRUCTURE = /\binfrastructure\b/i;

/** Order-independent: covers both "protect infrastructure" and "without sacrificing
 *  infrastructure" phrasings without needing a combinatorial regex. */
const PROTECTIVE_LANGUAGE =
  /\b(protect\w*|preserv\w*|keep\w*|maintain\w*|safeguard\w*)\b|\b(without|don't|do\s+not|never)\s+\w*\s*(sacrific\w*|cutt?\w*|reduc\w*|harm\w*)/i;

/**
 * Deterministic detector for the single REDUCE_INFLATION vertical slice — not a
 * general strategic-objective classifier. No LLM call. Returns null for anything
 * that doesn't clearly express an inflation-reduction objective, so the existing
 * Orders interpretation path runs unchanged for every other order.
 */
export function detectPolicyObjective(rawOrder: string): DetectedPolicyObjective | null {
  const text = rawOrder.trim();
  if (!text || !INFLATION_INTENT.test(text)) return null;

  const constraintIds = MENTIONS_INFRASTRUCTURE.test(text) && PROTECTIVE_LANGUAGE.test(text)
    ? [KNOWN_POLICY_CONSTRAINTS.PRESERVE_INFRASTRUCTURE_INVESTMENT.id]
    : [];

  return { objectiveId: "REDUCE_INFLATION", constraintIds };
}
