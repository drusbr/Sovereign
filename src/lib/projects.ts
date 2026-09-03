export type ProjectCategory =
  | "Security"
  | "Economic"
  | "Infrastructure"
  | "Social"
  | "Diplomatic";

export interface ProjectDefinition {
  id: string;
  name: string;
  category: ProjectCategory;
  startTurn: number;
  endTurn: number;
  statusText: string;
  unlocks: string;
  actionId: string;
  description: string;
  scope: string;
  geographicTarget?: string;
  expectedOutcome: string;
  difficulty: "LOW" | "MEDIUM" | "HIGH";
  lifecycle: LifecycleState;
  completionEffectApplied: boolean;
  completionRecord?: {
    turn: number;
    finalCost: number;
    durationTurns: number;
    outcome: string;
  };
}

/** Seed data — copied into GameState.projects by createInitialGameState(). */
export const INITIAL_PROJECTS: ProjectDefinition[] = [
  {
    id: "bnoe-battalion",
    name: "BNOE Special Battalion Formation",
    category: "Security",
    startTurn: 1,
    endTurn: 5,
    statusText:
      "Recruits are undergoing urban warfare training at Vila Militar ahead of favela deployment.",
    unlocks:
      "A dedicated special-operations battalion for high-risk favela and border incursions.",
    actionId: "legacy-bnoe-battalion",
    description: "Formation and training of a dedicated federal special-operations battalion.",
    scope: "One federal battalion",
    expectedOutcome: "Improved federal security capability",
    difficulty: "MEDIUM",
    lifecycle: createLifecycle(1, 4, 4.8),
    completionEffectApplied: false,
  },
  {
    id: "stu-tax-reform",
    name: "STU Tax Administration Modernisation",
    category: "Economic",
    startTurn: 1,
    endTurn: 8,
    statusText:
      "Receita Federal teams are preparing systems and guidance for a simplified consumption-tax administration.",
    unlocks:
      "A simplified consumption tax system, projected to lift GDP growth and cut business compliance costs.",
    actionId: "legacy-stu-tax-reform",
    description: "Administrative systems and compliance implementation for a unified consumption tax framework.",
    scope: "National tax administration",
    expectedOutcome: "Lower business compliance burden",
    difficulty: "HIGH",
    lifecycle: createLifecycle(1, 7, 2.1),
    completionEffectApplied: false,
  },
  {
    id: "escola-viva-rio",
    name: "Escola Viva — Rio Pilot",
    category: "Social",
    startTurn: 2,
    endTurn: 6,
    statusText:
      "Renovation crews are refitting three pilot schools in Rio's Zona Norte for extended-hours programming.",
    unlocks:
      "A full-time public school pilot in Rio, expected to boost approval among working-class families.",
    actionId: "legacy-escola-viva-rio",
    description: "Renovation and launch of full-day public school pilots.",
    scope: "Three schools",
    geographicTarget: "Rio de Janeiro",
    expectedOutcome: "Expanded full-day education capacity",
    difficulty: "MEDIUM",
    lifecycle: createLifecycle(1, 5, 1.2),
    completionEffectApplied: false,
  },
  {
    id: "angra-3-nuclear",
    name: "Angra 3 Nuclear Acceleration",
    category: "Infrastructure",
    startTurn: 1,
    endTurn: 20,
    statusText:
      "Eletronuclear has resumed civil works at the reactor site after years of stalled financing.",
    unlocks:
      "Completion of Angra 3, adding roughly 1,350 MW of baseload capacity to the national grid.",
    actionId: "legacy-angra-3-nuclear",
    description: "Completion of civil and systems works at the Angra 3 reactor.",
    scope: "1,350 MW generation asset",
    geographicTarget: "Rio de Janeiro",
    expectedOutcome: "Additional baseload electricity generation",
    difficulty: "HIGH",
    lifecycle: createLifecycle(1, 19, 24),
    completionEffectApplied: false,
  },
];

export type ProjectPhase =
  | "not-started"
  | "in-progress"
  | "near-deadline"
  | "completed";

export interface ProjectRuntimeInfo {
  progress: number; // 0-100
  phase: ProjectPhase;
  turnsRemaining: number;
}

/** Derives a project's live progress/phase from the current game turn — nothing here is stored. */
export function getProjectRuntimeInfo(
  project: ProjectDefinition,
  currentTurn: number
): ProjectRuntimeInfo {
  if (project.lifecycle) {
    const remaining = Math.max(0, project.lifecycle.plannedDurationTurns - project.lifecycle.elapsedTurns);
    return {
      progress: Math.round(project.lifecycle.progress),
      phase: project.lifecycle.status === "COMPLETED" ? "completed"
        : project.lifecycle.status === "PLANNED" ? "not-started"
          : remaining <= 2 ? "near-deadline" : "in-progress",
      turnsRemaining: remaining,
    };
  }
  if (currentTurn >= project.endTurn) {
    return { progress: 100, phase: "completed", turnsRemaining: 0 };
  }

  if (currentTurn < project.startTurn) {
    return {
      progress: 0,
      phase: "not-started",
      turnsRemaining: project.endTurn - currentTurn,
    };
  }

  const span = Math.max(1, project.endTurn - project.startTurn);
  const progress = Math.round(
    ((currentTurn - project.startTurn) / span) * 100
  );
  const turnsRemaining = project.endTurn - currentTurn;
  const phase: ProjectPhase = turnsRemaining <= 2 ? "near-deadline" : "in-progress";

  return { progress, phase, turnsRemaining };
}

export const CATEGORY_STYLES: Record<
  ProjectCategory,
  { text: string; bg: string; border: string; hex: string }
> = {
  Security: {
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
    hex: "#ef4444",
  },
  Economic: {
    text: "text-positive",
    bg: "bg-positive/10",
    border: "border-positive/30",
    hex: "#10b981",
  },
  Infrastructure: {
    text: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
    hex: "#3b82f6",
  },
  Social: {
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    hex: "#fbbf24",
  },
  Diplomatic: {
    text: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
    hex: "#a78bfa",
  },
};
import { createLifecycle, type LifecycleState } from "@/lib/lifecycle";
