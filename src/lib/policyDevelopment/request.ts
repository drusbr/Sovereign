import type { GameState } from "@/lib/gameState";
import { detectPolicyObjective } from "./detect";
import { developPolicyOptions } from "./generate";
import type { PolicyDevelopmentRequest } from "./types";

/** Small, deterministic — matches DiplomaticOpportunity/InterviewRequest's existing
 *  expiry-window convention rather than introducing a new pattern. */
const REQUEST_LIFESPAN_TURNS = 6;

/**
 * Detects a strategic objective in raw order text and, if found, synchronously
 * develops its options. Returns null when the text isn't a recognised objective
 * (the caller's existing Orders interpretation path then runs unchanged) or when
 * Country Knowledge couldn't resolve any candidate actions for it.
 */
export function createPolicyDevelopmentRequest(
  state: GameState,
  rawInstruction: string
): PolicyDevelopmentRequest | null {
  const detected = detectPolicyObjective(rawInstruction);
  if (!detected) return null;

  const id = `policy-request-${state.turn}-${state.policyDevelopmentRequests.length + 1}`;
  const options = developPolicyOptions(state, detected.objectiveId, detected.constraintIds, id);
  if (options.length === 0) return null;

  return {
    id,
    rawInstruction,
    objectiveId: detected.objectiveId,
    constraintIds: detected.constraintIds,
    // Generation is synchronous and deterministic — there is no observable DEVELOPING
    // window in this slice, so the request is created already READY.
    status: "READY",
    options,
    createdTurn: state.turn,
    expiresOnTurn: state.turn + REQUEST_LIFESPAN_TURNS,
  };
}

/** Pure state transition — marks a request resolved once its selected option has
 *  been compiled and queued by the caller. Does not itself compile or queue anything. */
export function resolvePolicyDevelopmentRequest(
  state: GameState,
  requestId: string,
  optionId: string
): GameState {
  return {
    ...state,
    policyDevelopmentRequests: state.policyDevelopmentRequests.map((request) =>
      request.id === requestId
        ? { ...request, status: "RESOLVED" as const, selectedOptionId: optionId }
        : request
    ),
  };
}
