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
  },
  {
    id: "stu-tax-reform",
    name: "STU Tax Reform Bill",
    category: "Economic",
    startTurn: 1,
    endTurn: 8,
    statusText:
      "Committee hearings are underway in the Chamber of Deputies while the Centrão bloc negotiates amendments.",
    unlocks:
      "A simplified consumption tax system, projected to lift GDP growth and cut business compliance costs.",
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
