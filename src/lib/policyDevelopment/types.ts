import type { ActionType } from "@/lib/actions/types";

/**
 * A strategic presidential objective (e.g. "reduce inflation without sacrificing
 * infrastructure investment") is government-developed into concrete alternatives
 * before it can become a ProposedAction. Policy Development chooses actions — it
 * never simulates their outcome; existing engines (fiscal, Congress, turn
 * resolution) remain the only place mechanical consequences happen.
 */

export interface PolicyConstraint {
  id: string;
  label: string;
}

/** V1 has exactly one constraint. Kept as a small static map rather than a registry
 *  module, matching the single-objective scope of this slice. */
export const KNOWN_POLICY_CONSTRAINTS: Record<string, PolicyConstraint> = {
  PRESERVE_INFRASTRUCTURE_INVESTMENT: {
    id: "PRESERVE_INFRASTRUCTURE_INVESTMENT",
    label: "Preserve infrastructure investment",
  },
};

export type PolicyOptionApproach = "EXPENDITURE_LED" | "REVENUE_LED" | "MIXED";

export interface DevelopedPolicyOptionActionDraft {
  /** References an existing CountryKnowledge GovernmentActionDefinition — never an
   *  arbitrary invented action. */
  actionDefinitionId: string;
  actionType: ActionType;
  /** Same shape existing fiscal actions already read (amountBRLBillions, spendingCategory/
   *  taxCategory, timing) — no new parameter conventions. */
  parameters: Record<string, unknown>;
}

export interface DevelopedPolicyOption {
  id: string;
  requestId: string;
  approach: PolicyOptionApproach;
  title: string;
  /** Deterministic, describes intent (e.g. "supports disinflation") — never a claimed
   *  numeric effect on inflation, approval, or any other simulated outcome. */
  summary: string;
  actionDrafts: DevelopedPolicyOptionActionDraft[];
}

export type PolicyDevelopmentRequestStatus =
  | "DEVELOPING"
  | "READY"
  | "RESOLVED"
  | "EXPIRED"
  | "DISCARDED";

export interface PolicyDevelopmentRequest {
  id: string;
  rawInstruction: string;
  objectiveId: string;
  constraintIds: string[];
  status: PolicyDevelopmentRequestStatus;
  options: DevelopedPolicyOption[];
  selectedOptionId?: string;
  createdTurn: number;
  expiresOnTurn: number;
}
