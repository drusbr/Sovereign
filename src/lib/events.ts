import type { GameState } from "@/lib/gameState";
import { clamp0to100 } from "@/lib/gameState";

export type EventStatKey =
  | "approval"
  | "securityIndex"
  | "congressionalSupport"
  | "militaryMorale"
  | "civilLiberties"
  | "internationalPressure"
  | "gdpGrowth"
  | "inflation"
  | "activeProjects";

export interface GameEventOption {
  id: string;
  label: string;
  effects: Partial<Record<EventStatKey, number>>;
}

export interface GameEventDefinition {
  id: string;
  title: string;
  description: string;
  options: GameEventOption[];
  isTriggered: (state: GameState) => boolean;
}

export const GAME_EVENTS: GameEventDefinition[] = [
  {
    id: "congressional-pressure",
    title: "CONGRESSIONAL PRESSURE",
    description:
      "The opposition coalition in Congress is demanding a formal inquiry into the Complexo do Alemão operation following civilian casualty reports. Your chief of staff needs a response before the morning session.",
    isTriggered: (state) => state.turn === 3,
    options: [
      {
        id: "cooperate",
        label: "Cooperate fully with the inquiry — release all operational reports",
        effects: { approval: 5, congressionalSupport: 8, militaryMorale: -3 },
      },
      {
        id: "refuse",
        label: "Refuse the inquiry — cite national security",
        effects: { approval: -8, congressionalSupport: -15, militaryMorale: 5 },
      },
      {
        id: "limited-review",
        label: "Offer a limited independent review",
        effects: { approval: 2, congressionalSupport: 2, militaryMorale: 0 },
      },
    ],
  },
  {
    id: "military-expanded-powers",
    title: "MILITARY REQUESTS EXPANDED POWERS",
    description:
      "General Marcos Viana has formally requested emergency military powers to accelerate operations in contested zones. The request sits on your desk.",
    isTriggered: (state) => state.securityIndex < 35,
    options: [
      {
        id: "grant-full",
        label: "Grant full emergency powers",
        effects: { securityIndex: 15, civilLiberties: -20, internationalPressure: 25 },
      },
      {
        id: "deny",
        label: "Deny the request",
        effects: { securityIndex: -5, militaryMorale: -10, congressionalSupport: 5 },
      },
      {
        id: "grant-limited",
        label: "Grant limited powers with oversight",
        effects: { securityIndex: 7, civilLiberties: -8, congressionalSupport: -3 },
      },
    ],
  },
  {
    id: "economic-anxiety",
    title: "ECONOMIC ANXIETY RISING",
    description:
      "A new poll shows 61% of Brazilians cite cost of living as their primary concern. Your economic team is requesting urgent guidance.",
    isTriggered: (state) => state.approval < 38,
    options: [
      {
        id: "fuel-subsidy",
        label: "Emergency fuel subsidy programme",
        effects: { approval: 6, gdpGrowth: -0.3, inflation: 0.8 },
      },
      {
        id: "stay-course",
        label: "Stay the course — reforms take time",
        effects: { approval: -3, gdpGrowth: 0.1 },
      },
      {
        id: "jobs-programme",
        label: "Announce a new jobs programme",
        effects: { approval: 4, activeProjects: 1, gdpGrowth: -0.1 },
      },
    ],
  },
];

/** Returns the first untriggered event whose condition now holds, if any. */
export function findTriggeredEvent(
  state: GameState
): GameEventDefinition | undefined {
  return GAME_EVENTS.find(
    (event) =>
      !state.triggeredEventIds.includes(event.id) && event.isTriggered(state)
  );
}

/** Applies an event option's stat deltas to game state, clamping percentage-style stats to 0-100. */
export function applyEventEffects(
  state: GameState,
  effects: Partial<Record<EventStatKey, number>>
): GameState {
  const next: GameState = { ...state };

  for (const [key, delta] of Object.entries(effects) as [
    EventStatKey,
    number,
  ][]) {
    if (delta === undefined) continue;
    switch (key) {
      case "approval":
        next.approval = clamp0to100(state.approval + delta);
        break;
      case "securityIndex":
        next.securityIndex = clamp0to100(state.securityIndex + delta);
        break;
      case "congressionalSupport":
        next.congressionalSupport = clamp0to100(
          state.congressionalSupport + delta
        );
        break;
      case "militaryMorale":
        next.militaryMorale = clamp0to100(state.militaryMorale + delta);
        break;
      case "civilLiberties":
        next.civilLiberties = clamp0to100(state.civilLiberties + delta);
        break;
      case "internationalPressure":
        next.internationalPressure = clamp0to100(
          state.internationalPressure + delta
        );
        break;
      case "gdpGrowth":
        next.gdpGrowth = Math.round((state.gdpGrowth + delta) * 10) / 10;
        break;
      case "inflation":
        next.inflation = Math.round((state.inflation + delta) * 10) / 10;
        break;
      case "activeProjects":
        next.activeProjects = Math.max(0, state.activeProjects + delta);
        break;
    }
  }

  return next;
}
