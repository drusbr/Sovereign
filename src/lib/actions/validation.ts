import type { GameState } from "@/lib/gameState";
import type { ProposedAction, ValidationIssue } from "./types";

export type ActionValidationState = Pick<GameState, "countryName">;

export interface ActionValidationResult {
  valid: boolean;
  status: "VALID" | "BLOCKED";
  issues: ValidationIssue[];
}

const TARGET_REQUIRED = new Set<ProposedAction["actionType"]>([
  "SECURITY_OPERATION",
  "DIPLOMATIC_ACTION",
  "JUDICIAL_REQUEST",
]);

function expectedActorId(countryName: string): string {
  return countryName.trim().toLowerCase() === "brazil" ? "BRA" : "UNK";
}

function issue(
  code: ValidationIssue["code"],
  severity: ValidationIssue["severity"],
  message: string,
  institution?: string
): ValidationIssue {
  return { code, severity, message, institution };
}

/**
 * First deterministic validation boundary for proposed actions. It only
 * checks facts represented by the current model; it deliberately does not
 * pretend that budgets, votes, or judicial proceedings already exist.
 */
export function validateAction(
  state: ActionValidationState,
  action: ProposedAction
): ActionValidationResult {
  const issues: ValidationIssue[] = [];

  if (
    !/^[A-Z]{3}$/.test(action.actorId) ||
    action.actorId !== expectedActorId(state.countryName)
  ) {
    issues.push(
      issue(
        "INVALID_ACTOR",
        "BLOCKER",
        "The action does not identify a valid canonical government actor."
      )
    );
  }

  if (!action.rawOrder.trim()) {
    issues.push(issue("EMPTY_ORDER", "BLOCKER", "The proposed action has no order text."));
  }

  if (action.actionType === "UNKNOWN") {
    issues.push(
      issue(
        "UNKNOWN_ACTION_TYPE",
        "BLOCKER",
        "The order could not be interpreted as a supported government action."
      )
    );
  }

  if (TARGET_REQUIRED.has(action.actionType) && action.targets.length === 0) {
    issues.push(
      issue(
        "MISSING_TARGET",
        "BLOCKER",
        "This kind of action requires an identifiable target."
      )
    );
  }

  if (
    typeof action.parameters !== "object" ||
    action.parameters === null ||
    Array.isArray(action.parameters)
  ) {
    issues.push(
      issue("MALFORMED_PARAMETERS", "BLOCKER", "Action parameters must be a keyed object.")
    );
  }

  if (
    /\b(frozen|seized)\b[^.]{0,100}\b(asset|assets|funds|proceeds)\b|\b(asset|assets|funds|proceeds)\b[^.]{0,100}\b(frozen|seized)\b/i.test(action.rawOrder)
    && /\b(spend|redirect|allocate|fund|appropriate|use)\w*\b/i.test(action.rawOrder)
  ) {
    issues.push(issue(
      "FROZEN_ASSETS_UNAVAILABLE",
      "BLOCKER",
      "The identified assets remain frozen and are not available for federal expenditure under the current institutional model. No spending or transfer has occurred."
    ));
  }

  switch (action.authority.type) {
    case "LEGISLATIVE":
      issues.push(
        issue(
          "REQUIRES_LEGISLATION",
          "BLOCKER",
          "This proposal requires legislation before it can take effect.",
          action.authority.institution ?? "National Congress"
        )
      );
      break;
    case "JUDICIAL":
      issues.push(
        issue(
          "REQUIRES_JUDICIAL_ACTION",
          "BLOCKER",
          "The executive cannot determine this judicial outcome directly.",
          action.authority.institution ?? "Judiciary"
        )
      );
      break;
    case "INDEPENDENT":
      issues.push(
        issue(
          "INDEPENDENT_INSTITUTION",
          "BLOCKER",
          "The responsible institution is operationally independent of the presidency.",
          action.authority.institution
        )
      );
      break;
    case "STATE_LOCAL":
      issues.push(
        issue(
          "STATE_LOCAL_JURISDICTION",
          "BLOCKER",
          "This action falls primarily within state or local jurisdiction.",
          action.authority.institution
        )
      );
      break;
    case "FOREIGN":
      issues.push(
        issue(
          "REQUIRES_FOREIGN_CONSENT",
          "BLOCKER",
          "This outcome requires the agreement of a foreign government or institution.",
          action.authority.institution
        )
      );
      break;
    case "PRIVATE":
      issues.push(
        issue(
          "PRIVATE_ACTOR_CONTROL",
          "BLOCKER",
          "The presidency cannot directly compel this private actor without a legal mechanism.",
          action.authority.institution
        )
      );
      break;
    case "UNKNOWN":
      issues.push(
        issue(
          "UNKNOWN_AUTHORITY",
          "WARNING",
          "The responsible authority could not be determined."
        )
      );
      break;
    case "EXECUTIVE":
      break;
  }

  const valid = !issues.some((item) => item.severity === "BLOCKER");
  return { valid, status: valid ? "VALID" : "BLOCKED", issues };
}

export function applyActionValidation(
  state: ActionValidationState,
  action: ProposedAction
): ProposedAction {
  const result = validateAction(state, action);
  return { ...action, status: result.status, validationIssues: result.issues };
}
