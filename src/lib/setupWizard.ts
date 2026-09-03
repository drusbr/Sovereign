import { createInitialGameState, type GameState } from "@/lib/gameState";
import {
  buildAdvisorPools,
  findCandidateById,
  type AdvisorPoolSelection,
  type AdvisorRole,
} from "@/lib/advisorCandidates";
import { BRAZIL_STATES } from "@/lib/brazilStates";
import {
  getAlignment,
  getPoliticalBackground,
  getPriority,
  priorityEffectsForRank,
  PRIORITY_STARTER_PROJECTS,
  STATE_NEIGHBOURS,
  TOTAL_CONGRESSIONAL_SEATS,
  type PoliticalAlignment,
  type PoliticalBackgroundId,
  type PriorityId,
} from "@/lib/setupData";
import { createLifecycle } from "@/lib/lifecycle";

export interface SetupState {
  name: string;
  age: number;
  gender: "he" | "she" | "they";
  homeStateId: string;
  backgroundId: PoliticalBackgroundId | null;
  bio: string;
  portraitSeed: string | null;
  alignment: PoliticalAlignment | null;
  /** Fixed once per wizard session — seeds the advisor candidate-pool shuffle. */
  seed: number;
  selectedAdvisors: Partial<Record<AdvisorRole, string>>;
  priorities: PriorityId[];
  manifesto: string;
}

export function createEmptySetupState(): SetupState {
  return {
    name: "",
    age: 48,
    gender: "they",
    homeStateId: "sp",
    backgroundId: null,
    bio: "",
    portraitSeed: null,
    alignment: null,
    seed: Date.now(),
    selectedAdvisors: {},
    priorities: [],
    manifesto: "",
  };
}

export function advisorPoolsFor(setup: SetupState): AdvisorPoolSelection[] {
  return buildAdvisorPools(setup.seed);
}

function applyEffects(
  state: GameState,
  effects: Partial<Record<keyof GameState, number>>
): void {
  const rec = state as unknown as Record<string, number>;
  for (const [key, delta] of Object.entries(effects)) {
    if (typeof delta === "number" && typeof rec[key] === "number") {
      rec[key] = rec[key] + delta;
    }
  }
}

/** Builds the fully-adjusted starting GameState from the wizard's answers. */
export function buildCampaignGameState(setup: SetupState): GameState {
  const state = createInitialGameState();

  const homeState = BRAZIL_STATES.find((s) => s.id === setup.homeStateId);
  const background = setup.backgroundId ? getPoliticalBackground(setup.backgroundId) : undefined;
  const alignment = setup.alignment ? getAlignment(setup.alignment) : undefined;

  state.playerName = setup.name.trim() || "The President";
  state.playerTitle = "President";
  state.playerAge = setup.age;
  state.playerGender = setup.gender;
  state.playerHomeState = homeState?.name ?? "São Paulo";
  state.playerBackground = background
    ? `${background.title}. ${setup.bio.trim()}`.trim()
    : setup.bio.trim();
  state.playerAlignment = setup.alignment ?? "centre";
  state.playerPortrait = setup.portraitSeed ?? "portrait-01";

  // Home-state approval bonus: +8 for the president's home state, +3 for neighbours.
  if (homeState) {
    state.approval += 8;
    const neighbours = STATE_NEIGHBOURS[homeState.id] ?? [];
    if (neighbours.length > 0) state.approval += 3;
  }

  // Political background bonuses.
  if (background) {
    applyEffects(state, background.effects);
  }

  // Political alignment — starting coalition size drives congressional support.
  if (alignment) {
    state.congressionalSupport = alignment.coalitionSeats;
  }

  // Presidential priorities — primary/secondary/tertiary scaled effects, plus
  // a starter project seeded from the primary priority.
  state.presidentialPriorities = setup.priorities
    .map((id) => getPriority(id)?.title)
    .filter((t): t is string => Boolean(t));

  setup.priorities.forEach((priorityId, index) => {
    const rank = (index + 1) as 1 | 2 | 3;
    applyEffects(state, priorityEffectsForRank(priorityId, rank));
  });

  const primaryPriority = setup.priorities[0];
  if (primaryPriority) {
    const starter = PRIORITY_STARTER_PROJECTS[primaryPriority];
    state.projects = [
      ...state.projects,
      {
        id: `${primaryPriority}-starter-${setup.seed}`,
        name: starter.name,
        category: "Economic",
        startTurn: 1,
        endTurn: 1 + starter.turns,
        statusText: `${starter.description}. Work is just beginning.`,
        unlocks: starter.description,
        actionId: `setup-${primaryPriority}-${setup.seed}`,
        description: starter.description,
        scope: "Presidential priority starter programme",
        expectedOutcome: starter.description,
        difficulty: starter.turns > 10 ? "HIGH" : starter.turns > 5 ? "MEDIUM" : "LOW",
        lifecycle: createLifecycle(1, starter.turns, Math.max(1, starter.turns * 0.5)),
        completionEffectApplied: false,
      },
    ];
    state.activeProjects += 1;
  }

  state.presidentialManifesto = setup.manifesto.trim();

  // Selected advisors.
  state.advisors = Object.values(setup.selectedAdvisors)
    .filter((id): id is string => Boolean(id))
    .map((id) => findCandidateById(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((candidate) => ({ ...candidate, selected: true as const }));

  state.approval = Math.max(0, Math.min(100, Math.round(state.approval)));
  state.congressionalSupport = Math.max(
    0,
    Math.min(100, Math.round(state.congressionalSupport))
  );
  state.civilLiberties = Math.max(0, Math.min(100, Math.round(state.civilLiberties)));
  state.securityIndex = Math.max(0, Math.min(100, Math.round(state.securityIndex)));

  return state;
}

export function coalitionSeatSplit(alignment: PoliticalAlignment) {
  const option = getAlignment(alignment);
  const coalition = option?.coalitionSeats ?? 0;
  const opposition = Math.round((TOTAL_CONGRESSIONAL_SEATS - coalition) * 0.6);
  const neutral = TOTAL_CONGRESSIONAL_SEATS - coalition - opposition;
  return { coalition, opposition, neutral };
}
