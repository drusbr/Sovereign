import type { GameState } from "@/lib/gameState";
import type { ProposedAction } from "@/lib/actions/types";
import { applyActionValidation } from "@/lib/actions/validation";
import type { ActionResolution, ProcessedAction } from "./types";

const PENDING_AUTHORITIES = new Set(["LEGISLATIVE", "JUDICIAL", "UNKNOWN"]);

/**
 * Minimal institutional boundary. It does not simulate votes or rulings: it
 * only prevents non-executive proposals from being mistaken for immediately
 * executable presidential acts.
 */
export function processInstitutionalActions(
  state: Pick<GameState, "countryName">,
  actions: ProposedAction[]
): ProcessedAction[] {
  return actions.map((submitted) => {
    const action = applyActionValidation(state, submitted);
    const blocker = action.validationIssues.find((issue) => issue.severity === "BLOCKER");

    if (action.status === "VALID" && action.authority.type === "EXECUTIVE") {
      return { action, disposition: "EXECUTABLE" as const };
    }

    if (action.authority.type === "LEGISLATIVE") {
      const pipelineBlocker = action.validationIssues.find(
        (issue) => issue.severity === "BLOCKER" && issue.code !== "REQUIRES_LEGISLATION"
      );
      if (pipelineBlocker) {
        return {
          action,
          disposition: "BLOCKED" as const,
          reason: pipelineBlocker.message,
        };
      }
      return {
        action: { ...action, status: "PENDING" as const },
        disposition: "PENDING" as const,
        reason: "Introduced to the National Congress for bicameral consideration.",
      };
    }

    if (action.authority.type === "UNKNOWN" && blocker) {
      return { action, disposition: "BLOCKED" as const, reason: blocker.message };
    }

    if (PENDING_AUTHORITIES.has(action.authority.type)) {
      return {
        action: { ...action, status: "PENDING" as const },
        disposition: "PENDING" as const,
        reason: blocker?.message ?? action.authority.explanation ?? "Institutional processing is required.",
      };
    }

    return {
      action,
      disposition: "BLOCKED" as const,
      reason: blocker?.message ?? "The presidency lacks direct authority for this action.",
    };
  });
}

export function buildActionResolutions(
  processed: ProcessedAction[],
  proceedingIds: ReadonlyMap<string, string> = new Map()
): ActionResolution[] {
  return processed.map(({ action, disposition, reason }) => ({
    actionId: action.id,
    status:
      disposition === "EXECUTABLE"
        ? "EXECUTED"
        : disposition === "PENDING"
          ? "PENDING"
          : "BLOCKED",
    ...(reason ? { reason } : {}),
    ...(proceedingIds.get(action.id) ? { proceedingId: proceedingIds.get(action.id) } : {}),
  }));
}
