import type { ProposedAction, ValidationIssue, ValidationIssueCode } from "@/lib/actions/types";
import type { StructuralConstraintType } from "./types";
import { getActionDefinition, getInstitution, getInstrument } from "./lookup";
import { getCountryKnowledge } from "./registry";

/**
 * Structural constraint types map onto the existing ValidationIssue code union rather than
 * introducing a parallel one — REQUIRES_LEGISLATION, INDEPENDENT_INSTITUTION, REQUIRES_FOREIGN_CONSENT
 * and FROZEN_ASSETS_UNAVAILABLE already exist in src/lib/actions/types.ts for exactly these cases.
 */
const CONSTRAINT_ISSUE_CODE: Record<StructuralConstraintType, ValidationIssueCode> = {
  REQUIRES_CONGRESS: "REQUIRES_LEGISLATION",
  INDEPENDENT_INSTITUTION: "INDEPENDENT_INSTITUTION",
  REQUIRES_FOREIGN_CONSENT: "REQUIRES_FOREIGN_CONSENT",
  REQUIRES_JUDICIAL_PROCESS: "REQUIRES_JUDICIAL_ACTION",
  ASSET_NOT_SPENDABLE: "FROZEN_ASSETS_UNAVAILABLE",
};

/**
 * REQUIRES_FOREIGN_CONSENT is informational here, not blocking: Brazil's own authority to
 * initiate a negotiation stays EXECUTIVE (the foreign-authority correction — FOREIGN is reserved
 * for actions whose authority genuinely belongs to a foreign actor), so a foreign-consent
 * dependency must surface without preventing the action from validating.
 */
const WARNING_ONLY_CONSTRAINTS: ReadonlySet<StructuralConstraintType> = new Set(["REQUIRES_FOREIGN_CONSENT"]);

/**
 * Structural ("is this possible at all") validation sourced from Country Knowledge. Takes
 * nothing but the action and a country id — no GameState, mutable or otherwise — because
 * structural facts don't depend on current game conditions; that's GameState's job, checked
 * elsewhere (institutionalProcessing.ts, createLifecycleEntities, applyFiscalAction).
 *
 * Unknown country ids and unknown action-definition/instrument ids fail gracefully: no issues
 * are raised, so an old save referencing a since-removed id behaves like a legacy action.
 */
export function validateAgainstCountryKnowledge(action: ProposedAction, countryId: string): ValidationIssue[] {
  const knowledge = getCountryKnowledge(countryId);
  if (!knowledge) return [];

  const issues: ValidationIssue[] = [];

  const definition = action.actionDefinitionId ? getActionDefinition(knowledge, action.actionDefinitionId) : undefined;
  if (definition) {
    for (const constraint of definition.constraints) {
      issues.push({
        code: CONSTRAINT_ISSUE_CODE[constraint.type],
        severity: WARNING_ONLY_CONSTRAINTS.has(constraint.type) ? "WARNING" : "BLOCKER",
        message: constraint.explanation,
        ...(constraint.institutionId
          ? { institution: getInstitution(knowledge, constraint.institutionId)?.name ?? constraint.institutionId }
          : {}),
      });
    }
    return issues;
  }

  // No matched action definition (none supplied, or an unknown id — both fail gracefully).
  // If an instrument was supplied directly, still surface its one directly-known structural
  // fact: whether it depends on foreign consent. This covers knowledge-aware actions built
  // straight from an instrument, without requiring a full catalogue entry to exist yet.
  const instrument = action.instrumentId ? getInstrument(knowledge, action.instrumentId) : undefined;
  if (instrument?.requiresForeignConsent) {
    issues.push({
      code: "REQUIRES_FOREIGN_CONSENT",
      severity: "WARNING",
      message: `${instrument.name} requires the consent of the foreign counterparty before it can take effect.`,
    });
  }

  return issues;
}
