import {
  EMPTY_OPERATION_METRICS,
  clamp0to100,
  type ActiveOperation,
  type GameState,
  type OperationMetrics,
} from "@/lib/gameState";
import type { ProposedAction } from "@/lib/actions/types";
import { fiscalAmountBillions, postLifecycleExpenditure } from "@/lib/fiscal";
import { createLifecycle, lifecycleCanProcess } from "@/lib/lifecycle";
import type { ProjectCategory, ProjectDefinition } from "@/lib/projects";
import { deriveThreatLevelFromCapacity } from "@/lib/simulationEngine";

export interface LifecycleTurnReport {
  entityId: string;
  entityType: "PROJECT" | "OPERATION";
  title: string;
  status: string;
  spentThisTurn: number;
  progress: number;
  summary: string;
  operationResults?: OperationMetrics;
}

function durationTurns(action: ProposedAction, fallback: number): number {
  const p = action.parameters;
  if (typeof p.durationTurns === "number" && p.durationTurns > 0) return Math.round(p.durationTurns);
  const text = action.rawOrder.toLowerCase();
  const weeks = text.match(/(\d+(?:\.\d+)?)\s*(?:week|weeks)/);
  if (weeks) return Math.max(1, Math.round(Number(weeks[1])));
  const months = text.match(/(\d+(?:\.\d+)?)\s*(?:month|months)/);
  if (months) return Math.max(1, Math.round(Number(months[1]) * 4.33));
  const years = text.match(/(\d+(?:\.\d+)?)\s*(?:year|years)/);
  if (years) return Math.max(1, Math.round(Number(years[1]) * 52));
  return fallback;
}

function targetOrganisation(state: GameState, action: ProposedAction) {
  const text = action.rawOrder.toLowerCase();
  return state.criminalOrganisations.find((org) =>
    text.includes(org.id.toLowerCase())
    || text.includes(org.shortName.toLowerCase())
    || text.includes(org.name.toLowerCase())
  );
}

function geographicTarget(action: ProposedAction): string | undefined {
  return action.targets.find((target) => target.type === "REGION")?.name
    ?? (typeof action.parameters.geographicTarget === "string" ? action.parameters.geographicTarget : undefined)
    ?? action.rawOrder.match(/\b(São Paulo|Rio de Janeiro|Ceará|Amazonas|Pará|Paraná|Brasília)\b/i)?.[0];
}

function projectCategory(action: ProposedAction): ProjectCategory {
  const text = action.rawOrder.toLowerCase();
  if (/hospital|health|sus|school|education|housing|welfare/.test(text)) return "Social";
  if (/road|rail|port|energy|power|infrastructure|construction/.test(text)) return "Infrastructure";
  if (/security|police|defen[cs]e/.test(text)) return "Security";
  if (/diplomat|embassy|foreign/.test(text)) return "Diplomatic";
  return "Economic";
}

function titleFromAction(action: ProposedAction, fallback: string): string {
  const supplied = action.parameters.title;
  if (typeof supplied === "string" && supplied.trim()) return supplied.trim().slice(0, 100);
  const clean = action.rawOrder.replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim();
  return clean.length <= 90 ? clean : fallback;
}

export function createProjectFromAction(state: GameState, action: ProposedAction): ProjectDefinition | null {
  if (action.actionType !== "FUND_PROJECT" && action.actionType !== "PROJECT_INITIATIVE") return null;
  if (/\b(bill|legislation|law|act|tax reform)\b/i.test(action.rawOrder)) return null;
  const budget = fiscalAmountBillions(action);
  if (!budget) return null;
  const duration = durationTurns(action, 12);
  const category = projectCategory(action);
  const scope = typeof action.parameters.scope === "string"
    ? action.parameters.scope
    : action.rawOrder.match(/\b\d+\s+(?:new\s+)?(?:hospitals?|schools?|units?|facilities?|kilometres?|km)\b/i)?.[0] ?? "Authorised programme scope";
  return {
    id: `project-${action.id}`,
    actionId: action.id,
    name: titleFromAction(action, `Federal ${category} Programme`),
    description: action.rawOrder,
    category,
    scope,
    geographicTarget: geographicTarget(action),
    startTurn: state.turn,
    endTurn: state.turn + duration,
    statusText: "Authorised and entering implementation.",
    unlocks: `Creates the completed ${category.toLowerCase()} asset described by the programme.`,
    expectedOutcome: `Delivery of ${scope}`,
    difficulty: duration > 52 ? "HIGH" : duration > 12 ? "MEDIUM" : "LOW",
    lifecycle: createLifecycle(state.turn, duration, budget),
    completionEffectApplied: false,
  };
}

export function createOperationFromAction(state: GameState, action: ProposedAction): ActiveOperation | null {
  if (action.actionType !== "FUND_OPERATION" && action.actionType !== "SECURITY_OPERATION") return null;
  const budget = fiscalAmountBillions(action);
  if (!budget) return null;
  const target = targetOrganisation(state, action);
  const duration = durationTurns(action, 8);
  const location = geographicTarget(action) ?? target?.primaryTerritory[0] ?? "National";
  const leadAgency = typeof action.parameters.leadAgency === "string" ? action.parameters.leadAgency : "Federal Police";
  return {
    id: `operation-${action.id}`,
    actionId: action.id,
    name: titleFromAction(
      action,
      target
        ? `Federal Operation Against ${target.shortName} Networks${location !== "National" ? ` in ${location}` : ""}`
        : `Federal Security Operation${location !== "National" ? ` in ${location}` : ""}`
    ),
    type: /military|armed forces|army/.test(action.rawOrder.toLowerCase()) ? "military" : "police",
    location,
    objective: typeof action.parameters.objective === "string" ? action.parameters.objective : action.rawOrder,
    startTurn: state.turn,
    status: "active",
    leadAgency,
    targetOrganisationId: target?.id,
    participatingInstitutions: [leadAgency],
    phase: "PLANNING",
    intelligenceQuality: Math.round(clamp0to100(45 + state.anipCases * 0.5)),
    readiness: Math.round(clamp0to100((state.securityIndex + state.militaryMorale) / 2)),
    operationalRisk: target && target.capacity >= 70 ? "HIGH" : target && target.capacity >= 45 ? "MEDIUM" : "LOW",
    lifecycle: createLifecycle(state.turn, duration, budget),
    thisTurnResults: { ...EMPTY_OPERATION_METRICS },
    cumulativeResults: { ...EMPTY_OPERATION_METRICS },
  };
}

/** Creates only entities backed by an executable/authorised structured action. */
export function createLifecycleEntities(
  state: GameState,
  actions: ProposedAction[],
  options: { legislationPassed?: boolean } = {}
): GameState {
  let next = state;
  for (const action of actions) {
    if (action.authority.type !== "EXECUTIVE" && !(options.legislationPassed && action.authority.type === "LEGISLATIVE")) continue;
    if (next.projects.some((item) => item.actionId === action.id)
      || next.activeOperations.some((item) => item.actionId === action.id)) continue;
    const project = createProjectFromAction(next, action);
    if (project) {
      next = { ...next, projects: [...next.projects, project], activeProjects: next.activeProjects + 1 };
      continue;
    }
    const operation = createOperationFromAction(next, action);
    if (operation) next = { ...next, activeOperations: [...next.activeOperations, operation] };
  }
  return next;
}

function projectCapacity(state: GameState, project: ProjectDefinition): number {
  let capacity = project.difficulty === "HIGH" ? 0.9 : project.difficulty === "MEDIUM" ? 0.96 : 1;
  if (state.congressionalSupport < 35 && project.category === "Economic") capacity *= 0.8;
  if (project.geographicTarget && state.stateSecurity[project.geographicTarget] === "critical") capacity *= 0.65;
  return capacity;
}

function fundingUnavailable(state: GameState): boolean {
  return state.fiscal.discretionaryBudgetAvailable <= 0 && state.fiscal.debtToGDP >= 130;
}

function applyProjectCompletionEffect(state: GameState, project: ProjectDefinition): GameState {
  if (project.completionEffectApplied) return state;
  if (project.category === "Social") return { ...state, approval: clamp0to100(state.approval + 2) };
  if (project.category === "Infrastructure") return { ...state, gdpGrowth: state.gdpGrowth + 0.1, publicInvestment: state.publicInvestment + 0.1 };
  if (project.category === "Security") return { ...state, securityIndex: clamp0to100(state.securityIndex + 2) };
  if (project.category === "Diplomatic") return { ...state, globalStanding: clamp0to100(state.globalStanding + 1) };
  return { ...state, businessRegistrations: state.businessRegistrations + 200 };
}

function processProjects(state: GameState, turn: number): { state: GameState; reports: LifecycleTurnReport[] } {
  let next = state;
  const reports: LifecycleTurnReport[] = [];
  const projects: ProjectDefinition[] = [];
  for (const original of next.projects) {
    if (!lifecycleCanProcess(original.lifecycle, turn)) { projects.push(original); continue; }
    const project = structuredClone(original);
    const lifecycle = project.lifecycle;
    if (fundingUnavailable(next)) {
      lifecycle.status = lifecycle.stalledTurns >= 3 ? "FAILED" : "STALLED";
      lifecycle.stalledTurns += 1;
      lifecycle.lastProcessedTurn = turn;
      project.statusText = lifecycle.status === "FAILED" ? "Implementation failed after prolonged funding suspension." : "Implementation stalled because financing is unavailable.";
      projects.push(project);
      reports.push({ entityId: project.id, entityType: "PROJECT", title: project.name, status: lifecycle.status, spentThisTurn: 0, progress: lifecycle.progress, summary: project.statusText });
      continue;
    }
    lifecycle.status = "ACTIVE";
    lifecycle.stalledTurns = 0;
    const baseSpend = lifecycle.totalBudget / lifecycle.plannedDurationTurns;
    const spend = Math.min(lifecycle.remainingBudget, baseSpend * projectCapacity(next, project));
    next = postLifecycleExpenditure(next, { actionId: `${project.actionId}-${turn}`, projectId: project.id, amount: spend, category: project.category === "Social" ? "health" : project.category === "Infrastructure" ? "infrastructure" : project.category === "Security" ? "security" : "administration", description: `${project.name} implementation expenditure`, kind: "FUND_PROJECT" });
    lifecycle.spent += spend;
    lifecycle.remainingBudget = Math.max(0, lifecycle.totalBudget - lifecycle.spent);
    lifecycle.elapsedTurns += 1;
    lifecycle.progress = Math.min(100, lifecycle.totalBudget > 0 ? lifecycle.spent / lifecycle.totalBudget * 100 : 100);
    lifecycle.lastProcessedTurn = turn;
    project.statusText = `${lifecycle.progress.toFixed(0)}% delivered; R$${lifecycle.spent.toFixed(2)}bn spent.`;
    if (lifecycle.remainingBudget <= 0.000001) {
      lifecycle.status = "COMPLETED";
      lifecycle.progress = 100;
      lifecycle.completedTurn = turn;
      project.completionRecord = { turn, finalCost: lifecycle.spent, durationTurns: lifecycle.elapsedTurns, outcome: project.expectedOutcome };
      next = applyProjectCompletionEffect(next, project);
      project.completionEffectApplied = true;
      next.activeProjects = Math.max(0, next.activeProjects - 1);
    }
    projects.push(project);
    reports.push({ entityId: project.id, entityType: "PROJECT", title: project.name, status: lifecycle.status, spentThisTurn: spend, progress: lifecycle.progress, summary: project.statusText });
  }
  return { state: { ...next, projects }, reports };
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function randomFrom(seed: number): number {
  return ((Math.imul(seed || 1, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function addMetrics(a: OperationMetrics, b: OperationMetrics): OperationMetrics {
  return Object.fromEntries(Object.keys(a).map((key) => [key, a[key as keyof OperationMetrics] + b[key as keyof OperationMetrics]])) as unknown as OperationMetrics;
}

function processOperations(state: GameState, turn: number): { state: GameState; reports: LifecycleTurnReport[] } {
  let next = state;
  const reports: LifecycleTurnReport[] = [];
  const operations: ActiveOperation[] = [];
  for (const original of next.activeOperations) {
    if (!lifecycleCanProcess(original.lifecycle, turn)) { operations.push(original); continue; }
    const operation = structuredClone(original);
    const lifecycle = operation.lifecycle;
    if (fundingUnavailable(next)) {
      lifecycle.status = lifecycle.stalledTurns >= 3 ? "FAILED" : "STALLED";
      lifecycle.stalledTurns += 1;
      lifecycle.lastProcessedTurn = turn;
      operation.status = lifecycle.status === "FAILED" ? "failed" : "stalled";
      operation.thisTurnResults = { ...EMPTY_OPERATION_METRICS };
      operations.push(operation);
      reports.push({ entityId: operation.id, entityType: "OPERATION", title: operation.name, status: lifecycle.status, spentThisTurn: 0, progress: lifecycle.progress, summary: "Operation stalled because financing is unavailable.", operationResults: operation.thisTurnResults });
      continue;
    }
    lifecycle.status = "ACTIVE";
    lifecycle.stalledTurns = 0;
    operation.status = "active";
    operation.phase = lifecycle.elapsedTurns === 0 ? "PLANNING" : lifecycle.elapsedTurns + 1 >= lifecycle.plannedDurationTurns ? "CONCLUDING" : "ACTIVE";
    const spend = Math.min(lifecycle.remainingBudget, lifecycle.totalBudget / lifecycle.plannedDurationTurns);
    next = postLifecycleExpenditure(next, { actionId: `${operation.actionId}-${turn}`, operationId: operation.id, amount: spend, category: "security", description: `${operation.name} operational expenditure`, kind: "FUND_OPERATION" });
    const target = next.criminalOrganisations.find((org) => org.id === operation.targetOrganisationId);
    const capability = (next.securityIndex * 0.4 + next.militaryMorale * 0.2 + operation.intelligenceQuality * 0.2 + operation.readiness * 0.2) / 100;
    const resilience = (target?.capacity ?? 55) / 100;
    const uncertainty = (randomFrom(hashSeed(`${operation.id}:${turn}`)) - 0.5) * 0.24;
    const effectiveness = Math.max(0.05, Math.min(1, 0.5 + capability - resilience + uncertainty));
    const capacityReduction = target ? Math.min(target.capacity, Number((effectiveness * 3.2).toFixed(1))) : 0;
    const risk = operation.operationalRisk === "HIGH" ? 1.4 : operation.operationalRisk === "MEDIUM" ? 1 : 0.6;
    const casualtyRoll = randomFrom(hashSeed(`${operation.id}:${turn}:casualties`));
    const civilianCasualties = casualtyRoll > 0.92 / risk ? Math.max(1, Math.round((1 - effectiveness) * 4 * risk)) : 0;
    const governmentCasualties = casualtyRoll < 0.12 * risk ? Math.max(1, Math.round((1 - effectiveness) * 3)) : 0;
    const results: OperationMetrics = {
      arrests: Math.round(4 + effectiveness * 28),
      highValueArrests: effectiveness > 0.72 ? 1 : 0,
      assetsSeized: Number((spend * effectiveness * 0.18).toFixed(3)),
      weaponsSeized: Math.round(effectiveness * 18),
      facilitiesDisrupted: effectiveness > 0.45 ? Math.max(1, Math.round(effectiveness * 3)) : 0,
      criminalCapacityReduction: capacityReduction,
      governmentCasualties,
      civilianCasualties,
      intelligenceGained: Math.round(effectiveness * 6),
    };
    operation.thisTurnResults = results;
    operation.cumulativeResults = addMetrics(operation.cumulativeResults, results);
    operation.intelligenceQuality = clamp0to100(operation.intelligenceQuality + results.intelligenceGained * 0.25);
    lifecycle.spent += spend;
    lifecycle.remainingBudget = Math.max(0, lifecycle.totalBudget - lifecycle.spent);
    lifecycle.elapsedTurns += 1;
    lifecycle.progress = Math.min(100, lifecycle.totalBudget > 0 ? lifecycle.spent / lifecycle.totalBudget * 100 : 100);
    lifecycle.lastProcessedTurn = turn;
    next.anipAssetsFrozen += results.assetsSeized;
    if (target && capacityReduction > 0) {
      next.criminalOrganisations = next.criminalOrganisations.map((org) => org.id === target.id ? {
        ...org,
        capacity: Math.max(0, org.capacity - capacityReduction),
        trend: "weakening",
        threatLevel: deriveThreatLevelFromCapacity(Math.max(0, org.capacity - capacityReduction)),
      } : org);
    }
    if (civilianCasualties > 0) {
      next.approval = clamp0to100(next.approval - Math.min(4, civilianCasualties));
      next.civilLiberties = clamp0to100(next.civilLiberties - Math.min(3, civilianCasualties));
      next.mediaSentiment = clamp0to100(next.mediaSentiment - Math.min(5, civilianCasualties * 2));
    } else if (capacityReduction >= 2.2) {
      next.securityIndex = clamp0to100(next.securityIndex + 1);
      next.approval = clamp0to100(next.approval + 1);
    }
    const completed = lifecycle.remainingBudget <= 0.000001 || (target && target.capacity - capacityReduction < 15);
    if (completed) {
      lifecycle.status = "COMPLETED";
      lifecycle.progress = 100;
      lifecycle.completedTurn = turn;
      operation.phase = "COMPLETED";
      operation.finalOutcome = operation.cumulativeResults.criminalCapacityReduction >= 12 ? "SUCCESS"
        : operation.cumulativeResults.criminalCapacityReduction >= 5 ? "PARTIAL_SUCCESS" : "FAILURE";
      operation.status = operation.finalOutcome === "FAILURE" ? "failed" : "successful";
    }
    operations.push(operation);
    reports.push({ entityId: operation.id, entityType: "OPERATION", title: operation.name, status: lifecycle.status, spentThisTurn: spend, progress: lifecycle.progress, summary: `${results.arrests} arrests; R$${results.assetsSeized.toFixed(3)}bn seized; target capacity -${results.criminalCapacityReduction}.`, operationResults: results });
  }
  return { state: { ...next, activeOperations: operations }, reports };
}

export function processLifecycleTurn(state: GameState, turn = state.turn): { state: GameState; reports: LifecycleTurnReport[] } {
  const projects = processProjects(structuredClone(state), turn);
  const operations = processOperations(projects.state, turn);
  return { state: operations.state, reports: [...projects.reports, ...operations.reports] };
}

export function cancelLifecycleEntity(state: GameState, entityId: string): GameState {
  const projects = state.projects.map((project) => project.id === entityId && !["COMPLETED", "FAILED", "CANCELLED"].includes(project.lifecycle.status)
    ? { ...project, lifecycle: { ...project.lifecycle, status: "CANCELLED" as const, cancelledTurn: state.turn }, statusText: "Cancelled by presidential order; sunk costs remain recorded." }
    : project);
  const operations = state.activeOperations.map((operation) => operation.id === entityId && !["COMPLETED", "FAILED", "CANCELLED"].includes(operation.lifecycle.status)
    ? { ...operation, lifecycle: { ...operation.lifecycle, status: "CANCELLED" as const, cancelledTurn: state.turn }, status: "cancelled" as const, phase: "COMPLETED" as const }
    : operation);
  return { ...state, projects, activeOperations: operations };
}
