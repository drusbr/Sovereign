import {
  EMPTY_OPERATION_METRICS,
  clamp0to100,
  type ActiveOperation,
  type EducationState,
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

/**
 * Maps an education-related bill/order to a specialised education project
 * with a proper `educationEffect` payload — the generic `createProjectFromAction`
 * has no concept of the education subsystem, so bills matching education
 * keywords are routed here instead (see `createLifecycleEntities`).
 */
function createEducationProject(action: ProposedAction, state: GameState): ProjectDefinition | null {
  const text = action.rawOrder.toLowerCase();

  // Determine what kind of education project this is
  const isRenovation = /school renovation|renova[çc][ãa]o escolar|escola viva|public school|infraestrutura escolar/.test(text);
  const isCurriculum = /curriculum|curr[íi]culo|educational reform|reforma educacional|ensino/.test(text);
  const isTeachers = /teacher|professor|mestres|teacher salary|teacher quality/.test(text);
  const isEarlyChildhood = /creche|early childhood|pr[ée]-escola|daycare/.test(text);
  const isVocational = /vocational|senai|technical education|ensino t[ée]cnico/.test(text);

  if (!isRenovation && !isCurriculum && !isTeachers && !isEarlyChildhood && !isVocational) {
    return null; // not an education project
  }

  // Extract budget from the structured action if available, otherwise estimate from text
  const budgetMatch = text.match(/r\$\s*(\d+(?:\.\d+)?)\s*b/i);
  const estimatedBudget = fiscalAmountBillions(action) ?? (budgetMatch ? parseFloat(budgetMatch[1]) : 5.0);

  // Determine duration based on project type and scale
  const duration = isRenovation ? 10
    : isCurriculum ? 8
    : isTeachers ? 6
    : isEarlyChildhood ? 7
    : 6; // vocational

  const projectConfig: {
    name: string;
    description: string;
    expectedOutcome: string;
    statusText: string;
    unlocks: string;
    educationEffect: Partial<EducationState>;
  } = isRenovation ? {
    name: "National School Renovation Programme",
    description: "Systematic renovation and upgrading of public school infrastructure, prioritising schools with the lowest condition indices. Includes new facilities, equipment, and digital connectivity.",
    expectedOutcome: "Infrastructure Index +18 to +25 over project duration. Enrollment and completion rates improve as school quality attracts attendance.",
    statusText: "Planning and procurement phase — site assessments underway",
    unlocks: "Improved infrastructure index feeds into enrollment, completion, and eventually PISA scores over 8-15 turns",
    educationEffect: { infrastructureIndex: 20 },
  } : isCurriculum ? {
    name: "National Curriculum Modernisation",
    description: "Reform of the national curriculum framework with emphasis on critical thinking, STEM, digital literacy, and practical skills aligned with labour market needs.",
    expectedOutcome: "Curriculum Index +15 to +20. PISA equivalent score improvements visible after 12-15 turns as cohorts progress through the reformed system.",
    statusText: "Commission established — curriculum commission convened with educators and experts",
    unlocks: "Long-term GDP and FDI benefits as workforce quality improves over 15+ turns",
    educationEffect: { curriculumIndex: 18 },
  } : isTeachers ? {
    name: "Teacher Professionalisation Programme",
    description: "National teacher salary reform, competitive entry standards, mandatory professional development, and a career progression ladder for public school educators.",
    expectedOutcome: "Teacher Quality Index +20 to +28. Dropout rates fall as teaching quality improves. Effects compound over subsequent turns.",
    statusText: "Salary reform enacted — implementation rolling out across states",
    unlocks: "Dropout rate reduction feeds into secondary completion and eventually literacy and PISA improvements",
    educationEffect: { teacherQualityIndex: 22 },
  } : isEarlyChildhood ? {
    name: "Universal Early Childhood Programme",
    description: "Expansion of public creche and pré-escola provision for children aged 0-5, with quality standards and trained staff requirements.",
    expectedOutcome: "Access Index +12. Long-term literacy and completion rate improvements as better-prepared cohorts enter primary school.",
    statusText: "Facility expansion tendered — new creche places being created",
    unlocks: "Primary enrollment and eventual literacy improvements over 10-18 turns",
    educationEffect: { accessIndex: 14 },
  } : {
    name: "Vocational Education Expansion",
    description: "Expansion of SENAI technical education partnerships, apprenticeship quotas for medium and large businesses, and vocational pathways from secondary school.",
    expectedOutcome: "Curriculum Index +10, Access Index +8. Youth unemployment falls as vocational graduates enter formal labour market.",
    statusText: "SENAI partnerships being established — apprenticeship framework in preparation",
    unlocks: "Unemployment reduction and informal economy shrinkage over 8-12 turns",
    educationEffect: { curriculumIndex: 10, accessIndex: 8 },
  };

  return {
    id: `education-project-${action.id}`,
    name: projectConfig.name,
    category: "Social",
    startTurn: state.turn,
    endTurn: state.turn + duration,
    statusText: projectConfig.statusText,
    unlocks: projectConfig.unlocks,
    actionId: action.id,
    description: projectConfig.description,
    scope: "National",
    geographicTarget: "All states — lowest-performing regions prioritised",
    expectedOutcome: projectConfig.expectedOutcome,
    difficulty: estimatedBudget > 10 ? "HIGH" : estimatedBudget > 4 ? "MEDIUM" : "LOW",
    lifecycle: createLifecycle(state.turn, duration, estimatedBudget),
    completionEffectApplied: false,
    educationEffect: projectConfig.educationEffect,
  };
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

    // Check if this is an education bill that needs a specialised project
    const actionText = action.rawOrder.toLowerCase();
    const isEducationBill = /school|curriculum|teacher|professor|education|creche|vocational|senai|ensino/.test(actionText);
    if (isEducationBill) {
      const educationProject = createEducationProject(action, next);
      if (educationProject) {
        next = {
          ...next,
          projects: [...next.projects, educationProject],
          activeProjects: next.activeProjects + 1,
        };
        continue; // skip the generic createProjectFromAction for this action
      }
    }

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
  const next = { ...state };

  if (project.educationEffect) {
    const currentEdu = { ...next.education };
    const effect = project.educationEffect;

    if (effect.infrastructureIndex) {
      currentEdu.infrastructureIndex = clamp0to100(currentEdu.infrastructureIndex + effect.infrastructureIndex);
    }
    if (effect.teacherQualityIndex) {
      currentEdu.teacherQualityIndex = clamp0to100(currentEdu.teacherQualityIndex + effect.teacherQualityIndex);
    }
    if (effect.curriculumIndex) {
      currentEdu.curriculumIndex = clamp0to100(currentEdu.curriculumIndex + effect.curriculumIndex);
    }
    if (effect.accessIndex) {
      currentEdu.accessIndex = clamp0to100(currentEdu.accessIndex + effect.accessIndex);
    }

    next.education = currentEdu;
    // Immediate approval boost — visible state investment
    next.approval = clamp0to100(next.approval + 3);
    // Small FDI signal — skilled workforce narrative
    next.fdiFlow = Math.min(30, next.fdiFlow + 0.3);
    return next;
  }

  if (project.category === "Social") {
    next.approval = clamp0to100(next.approval + 3);
    next.civilLiberties = clamp0to100(next.civilLiberties + 1);
  } else if (project.category === "Infrastructure") {
    next.gdpGrowth = Math.min(8, next.gdpGrowth + 0.15);
    next.publicInvestment = Math.min(10, next.publicInvestment + 0.15);
    next.fdiFlow = Math.min(30, next.fdiFlow + 0.5);
    next.tradeBalance = next.tradeBalance + 0.3;
  } else if (project.category === "Security") {
    next.securityIndex = clamp0to100(next.securityIndex + 5);
    next.approval = clamp0to100(next.approval + 2);
    // Reduce capacity of the most threatening organisation
    const highestCapacityOrg = [...next.criminalOrganisations].sort((a, b) => b.capacity - a.capacity)[0];
    if (highestCapacityOrg) {
      next.criminalOrganisations = next.criminalOrganisations.map((org) =>
        org.id === highestCapacityOrg.id
          ? { ...org, capacity: Math.max(0, org.capacity - 8), trend: "weakening" as const }
          : org
      );
    }
  } else if (project.category === "Economic") {
    next.gdpGrowth = Math.min(8, next.gdpGrowth + 0.2);
    next.businessRegistrations = Math.round(next.businessRegistrations + 500);
    next.unemployment = Math.max(0, next.unemployment - 0.3);
    next.fdiFlow = Math.min(30, next.fdiFlow + 0.8);
  } else if (project.category === "Diplomatic") {
    next.globalStanding = clamp0to100(next.globalStanding + 3);
    next.internationalPressure = clamp0to100(next.internationalPressure - 5);
    next.allianceStrength = clamp0to100(next.allianceStrength + 2);
  }

  return next;
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
