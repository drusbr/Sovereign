import type { ProposedAction } from "@/lib/actions/types";
import type { GameEventDefinition } from "@/lib/events";
import type { GameState, TurnRecord, WorldEvent } from "@/lib/gameState";
import type {
  MediaGenerationResult,
  NovelWorldEventResult,
  TurnResult as AITurnResult,
  WorldEventDetailResult,
} from "@/lib/aiPrompts";
import type { FailureThreshold } from "@/lib/simulationEngine";
import type { TurnEventPlan } from "@/lib/eventGenerator";

export type InstitutionalDisposition = "EXECUTABLE" | "BLOCKED" | "PENDING";
export type ActionResolutionStatus = "EXECUTED" | "BLOCKED" | "PENDING" | "FAILED";

export interface ProcessedAction {
  action: ProposedAction;
  disposition: InstitutionalDisposition;
  reason?: string;
}

export interface ActionResolution {
  actionId: string;
  status: ActionResolutionStatus;
  reason?: string;
  proceedingId?: string;
  /** Aggregate AI effects are intentionally not attributed to individual actions. */
  effects?: never;
}

export interface ResolveTurnInput {
  state: GameState;
  actions: ProposedAction[];
  aiResult: AITurnResult;
  generatedMedia?: MediaGenerationResult | null;
}

/** Deterministic state after resolution, media, diplomacy, histories, advancement and tick. */
export interface TurnResolutionDraft {
  previousState: GameState;
  state: GameState;
  actionResolutions: ActionResolution[];
  turnRecord: TurnRecord;
  previousTurn: number;
  generatedEffects: AITurnResult["effects"];
}

export interface GeneratedWorldEventsInput {
  plan: TurnEventPlan;
  randomDetails?: WorldEventDetailResult[];
  novelEvent?: NovelWorldEventResult | null;
}

export interface TurnResolution {
  state: GameState;
  actionResolutions: ActionResolution[];
  turnRecord: TurnRecord;
  generatedEffects: AITurnResult["effects"];
  newWorldEvents: WorldEvent[];
  failureThresholds: FailureThreshold[];
  triggeredGameEvent: GameEventDefinition | null;
  eventFacts: import("@/lib/eventFacts").EventFact[];
}
