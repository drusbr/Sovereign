export type LifecycleStatus =
  | "PLANNED"
  | "ACTIVE"
  | "STALLED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface LifecycleState {
  createdTurn: number;
  startTurn: number;
  status: LifecycleStatus;
  plannedDurationTurns: number;
  elapsedTurns: number;
  progress: number;
  totalBudget: number;
  spent: number;
  remainingBudget: number;
  stalledTurns: number;
  lastProcessedTurn?: number;
  completedTurn?: number;
  cancelledTurn?: number;
}

export function createLifecycle(
  turn: number,
  durationTurns: number,
  totalBudget: number
): LifecycleState {
  return {
    createdTurn: turn,
    startTurn: turn,
    status: "PLANNED",
    plannedDurationTurns: Math.max(1, Math.round(durationTurns)),
    elapsedTurns: 0,
    progress: 0,
    totalBudget: Math.max(0, totalBudget),
    spent: 0,
    remainingBudget: Math.max(0, totalBudget),
    stalledTurns: 0,
  };
}

export function lifecycleCanProcess(lifecycle: LifecycleState, turn: number): boolean {
  return !["COMPLETED", "FAILED", "CANCELLED"].includes(lifecycle.status)
    && lifecycle.startTurn <= turn
    && lifecycle.lastProcessedTurn !== turn;
}
