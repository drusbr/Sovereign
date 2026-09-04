export const ACTION_TYPES = [
  "POLICY_DIRECTIVE",
  "SECURITY_OPERATION",
  "LEGISLATIVE_PROPOSAL",
  "DIPLOMATIC_ACTION",
  "PUBLIC_COMMUNICATION",
  "APPOINTMENT",
  "PROJECT_INITIATIVE",
  "FUNDING_ALLOCATION",
  "INCREASE_SPENDING",
  "DECREASE_SPENDING",
  "INCREASE_TAX",
  "DECREASE_TAX",
  "EMERGENCY_ALLOCATION",
  "FUND_PROJECT",
  "FUND_OPERATION",
  "REGULATORY_ACTION",
  "JUDICIAL_REQUEST",
  "OTHER",
  "UNKNOWN",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const FISCAL_ACTION_TYPES = [
  "INCREASE_SPENDING",
  "DECREASE_SPENDING",
  "INCREASE_TAX",
  "DECREASE_TAX",
  "EMERGENCY_ALLOCATION",
  "FUND_PROJECT",
  "FUND_OPERATION",
] as const;

export type FiscalActionType = (typeof FISCAL_ACTION_TYPES)[number];

export const AUTHORITY_TYPES = [
  "EXECUTIVE",
  "LEGISLATIVE",
  "JUDICIAL",
  "INDEPENDENT",
  "STATE_LOCAL",
  "FOREIGN",
  "PRIVATE",
  "UNKNOWN",
] as const;

export type AuthorityType = (typeof AUTHORITY_TYPES)[number];

export type ActionStatus =
  | "DRAFT"
  | "PROPOSED"
  | "VALID"
  | "PENDING"
  | "BLOCKED"
  | "RESOLVED";

export interface ActionAuthority {
  type: AuthorityType;
  institution?: string;
  confidence?: number;
  explanation?: string;
}

export interface ActionTarget {
  id: string;
  type: "COUNTRY" | "REGION" | "INSTITUTION" | "ORGANISATION" | "PERSON" | "SECTOR" | "OTHER";
  name: string;
}

export interface ActionCost {
  type: "FISCAL" | "POLITICAL" | "ACTION_POINTS" | "OTHER";
  amount?: number;
  unit?: string;
  description: string;
}

export interface ActionPrerequisite {
  type: "LEGISLATION" | "CONSENT" | "JUDICIAL_REVIEW" | "JURISDICTION" | "OTHER";
  institution?: string;
  description: string;
}

export type ValidationIssueCode =
  | "INVALID_ACTOR"
  | "EMPTY_ORDER"
  | "UNKNOWN_ACTION_TYPE"
  | "MISSING_TARGET"
  | "MALFORMED_PARAMETERS"
  | "UNKNOWN_AUTHORITY"
  | "REQUIRES_LEGISLATION"
  | "REQUIRES_JUDICIAL_ACTION"
  | "INDEPENDENT_INSTITUTION"
  | "STATE_LOCAL_JURISDICTION"
  | "REQUIRES_FOREIGN_CONSENT"
  | "PRIVATE_ACTOR_CONTROL"
  | "FROZEN_ASSETS_UNAVAILABLE";

export interface ValidationIssue {
  code: ValidationIssueCode;
  severity: "WARNING" | "BLOCKER";
  message: string;
  institution?: string;
}

/**
 * A player's natural-language instruction after intent interpretation but
 * before institutional processing or mechanical resolution.
 */
export interface ProposedAction {
  id: string;
  /** Canonical ISO-like actor id. Brazil is BRA. */
  actorId: string;
  rawOrder: string;
  actionType: ActionType;
  authority: ActionAuthority;
  targets: ActionTarget[];
  parameters: Record<string, unknown>;
  estimatedCosts: ActionCost[];
  prerequisites: ActionPrerequisite[];
  status: ActionStatus;
  validationIssues: ValidationIssue[];
  /**
   * Optional Country Knowledge references (src/lib/countryKnowledge/). Additive and
   * unset for legacy actions and any action the interpreter couldn't confidently map —
   * every consumer must keep working when they're absent.
   */
  instrumentId?: string;
  actionDefinitionId?: string;
  /** Set only on a concrete action already known to serve an objective — never used to
   *  route an objective-only request into the turn pipeline by itself. */
  objectiveId?: string;
}

export function createDraftAction(params: {
  id: string;
  actorId: string;
  rawOrder: string;
}): ProposedAction {
  return {
    ...params,
    actionType: "UNKNOWN",
    authority: { type: "UNKNOWN" },
    targets: [],
    parameters: {},
    estimatedCosts: [],
    prerequisites: [],
    status: "DRAFT",
    validationIssues: [],
  };
}

/** Transitional country-name bridge until campaigns store canonical country ids. */
export function canonicalActorIdForCountry(countryName: string): string {
  if (countryName.trim().toLowerCase() === "brazil") return "BRA";
  return "UNK";
}
