import type { GameState } from "@/lib/gameState";
import type { FiscalLedgerEntry, FiscalState } from "@/lib/fiscal";

export function currentTurnFiscalFlows(fiscal: FiscalState, turn: number) {
  const entries = fiscal.ledger.filter((entry) => entry.turn === turn);
  const revenue = entries.reduce((sum, entry) => sum + Math.max(0, entry.currentTurnCashImpact), 0);
  const expenditure = entries.reduce((sum, entry) => sum + Math.max(0, -entry.currentTurnCashImpact), 0);
  return { entries, revenue, expenditure, net: revenue - expenditure };
}

export function activeFiscalPolicies(fiscal: FiscalState): FiscalLedgerEntry[] {
  const latest = new Map<string, FiscalLedgerEntry>();
  for (const entry of fiscal.ledger) if (entry.timing !== "ONE_OFF") latest.set(entry.actionId, entry);
  return [...latest.values()];
}

export function fiscalCommitments(state: GameState) {
  return [
    ...state.projects.filter((project) => !["COMPLETED", "FAILED", "CANCELLED"].includes(project.lifecycle.status)).map((project) => ({ id: project.id, name: project.name, kind: "Project" as const, authorised: project.lifecycle.totalBudget, spent: project.lifecycle.spent, remaining: project.lifecycle.remainingBudget })),
    ...state.activeOperations.filter((operation) => !["COMPLETED", "FAILED", "CANCELLED"].includes(operation.lifecycle.status)).map((operation) => ({ id: operation.id, name: operation.name, kind: "Operation" as const, authorised: operation.lifecycle.totalBudget, spent: operation.lifecycle.spent, remaining: operation.lifecycle.remainingBudget })),
  ];
}
