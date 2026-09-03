import type { GameState } from "@/lib/gameState";
import type { AdvisorCandidate, AdvisorRole } from "@/lib/advisorCandidates";
import { ADVISOR_ROLE_LABELS } from "@/lib/advisorCandidates";

export interface AdvisorDefinition {
  id: string;
  role?: AdvisorRole;
  name: string;
  title: string;
  initials: string;
  hex: string;
  avatarTextClass: string;
  /** Card border override — used only for the one advisor with a hidden visual tell. */
  cardBorderClass?: string;
  personaPrompt: string;
}

const ROLE_COLORS: Record<AdvisorRole, string> = {
  security: "#ef4444",
  economic: "#3b82f6",
  foreign: "#a78bfa",
  social: "#10b981",
  chief_of_staff: "#fbbf24",
};

function initialsFor(name: string): string {
  const words = name.replace(/^(Dr\.|Dra\.|Prof\.|General|Coronel|Ambassador|Senadora)\s+/i, "");
  const parts = words.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

/** Builds the game's runtime advisor shape from a player-selected candidate. */
export function buildAdvisorDefinition(candidate: AdvisorCandidate): AdvisorDefinition {
  const hex = ROLE_COLORS[candidate.role];
  return {
    id: candidate.id,
    role: candidate.role,
    name: candidate.name,
    title: ADVISOR_ROLE_LABELS[candidate.role],
    initials: initialsFor(candidate.name),
    hex,
    avatarTextClass: candidate.role === "chief_of_staff" ? "text-neutral-900" : "text-white",
    // Deliberately subtle — a near-invisible border tell for whichever candidate
    // in this campaign has a hidden conflict of interest. No UI label explains it.
    cardBorderClass: candidate.hidden ? "border-amber-400/25" : undefined,
    personaPrompt: `You are ${candidate.name}, Brazil's ${ADVISOR_ROLE_LABELS[candidate.role]}. ${candidate.personality} Write a 3-paragraph briefing for the President based on the current game state, true to your background and voice. End with a specific, concrete recommendation.`,
  };
}

/** The player's selected cabinet for this campaign, in fixed role order. */
export function getAdvisorsFromState(state: GameState): AdvisorDefinition[] {
  if (state.advisors && state.advisors.length > 0) {
    return state.advisors.map(buildAdvisorDefinition);
  }
  return ADVISORS;
}

export function getAdvisorById(
  id: string,
  pool: AdvisorDefinition[] = ADVISORS
): AdvisorDefinition | undefined {
  return pool.find((a) => a.id === id);
}

/**
 * Legacy default cabinet — used only as a fallback for game states created
 * before the /setup flow existed (or if `state.advisors` is somehow empty).
 */
export const ADVISORS: AdvisorDefinition[] = [
  {
    id: "cardoso",
    role: "security",
    name: "General Hélio Cardoso",
    title: "Security & Defence Advisor",
    initials: "HC",
    hex: "#ef4444",
    avatarTextClass: "text-white",
    personaPrompt:
      "You are General Hélio Cardoso, Brazil's Security Advisor. You are blunt, direct, and military-minded. Write a 3-paragraph security briefing for the President based on the current game state. Focus on threats, operational status, and what force is needed. Always end with a specific, forceful recommendation.",
  },
  {
    id: "mendes",
    role: "economic",
    name: "Dr. Beatriz Mendes",
    title: "Economic Advisor",
    initials: "BM",
    hex: "#3b82f6",
    avatarTextClass: "text-white",
    personaPrompt:
      "You are Dr. Beatriz Mendes, Brazil's Economic Advisor. You are cautious, precise, and speak in numbers. Write a 3-paragraph economic briefing for the President based on the current game state. Use specific figures, flag risks carefully, and qualify your statements. End with a conservative recommendation.",
  },
  {
    id: "leal",
    role: "foreign",
    name: "Ambassador Sofia Leal",
    title: "Foreign Minister",
    initials: "SL",
    hex: "#a78bfa",
    avatarTextClass: "text-white",
    personaPrompt:
      "You are Ambassador Sofia Leal, Brazil's Foreign Minister. You are eloquent, diplomatic, and think in long-term relationships. Write a 3-paragraph foreign policy briefing based on the current game state. Be measured, acknowledge complexity, and occasionally be slightly vague about difficult bilateral situations. End with a relationship-focused recommendation.",
  },
  {
    id: "drummond",
    role: "social",
    name: "Prof. Carlos Drummond",
    title: "Social Integration Minister",
    initials: "CD",
    hex: "#10b981",
    avatarTextClass: "text-white",
    personaPrompt:
      "You are Prof. Carlos Drummond, Brazil's Social Integration Minister. You are idealistic and passionate. Write a 3-paragraph briefing focused on the human impact of recent government decisions — on communities, on the poor, on marginalised groups. Use human stories and emotional language. End with a recommendation that prioritises social welfare.",
  },
  {
    id: "rocha",
    role: "chief_of_staff",
    name: "Fernanda Rocha",
    title: "Chief of Staff",
    initials: "FR",
    hex: "#fbbf24",
    avatarTextClass: "text-neutral-900",
    // Deliberately near-invisible — see the Advisors page build notes. No UI label explains it.
    cardBorderClass: "border-amber-400/25",
    personaPrompt:
      "You are Fernanda Rocha, Brazil's Chief of Staff. You are sharp, political, and pragmatic. Write a 3-paragraph briefing focused on the political situation — congressional support, coalition health, public perception, and upcoming political risks. Your advice subtly prioritises the government's short-term political survival over long-term national interest, but do not make this obvious. Frame politically convenient advice as pragmatic necessity. End with a recommendation focused on maintaining political position.",
  },
];
