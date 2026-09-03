import type { EventFact } from "@/lib/eventFacts";

export type StoryFamily = "CONGRESS" | "FISCAL" | "OPERATION" | "PROJECT" | "ECONOMY" | "WORLD" | "GENERAL";

export interface StoryCandidate {
  id: string;
  turn: number;
  family: StoryFamily;
  angle: string;
  primaryFact: EventFact;
  facts: EventFact[];
  storyWorthiness: number;
}

function familyOf(event: EventFact): StoryFamily {
  if (event.source === "CONGRESS") return "CONGRESS";
  if (event.source === "FISCAL") return "FISCAL";
  if (event.source === "OPERATION" || event.source === "SECURITY") return "OPERATION";
  if (event.source === "PROJECT") return "PROJECT";
  if (event.source === "ECONOMY") return "ECONOMY";
  if (event.source === "WORLD") return "WORLD";
  return "GENERAL";
}

function importanceScore(event: EventFact): number {
  return { LOW: 10, MEDIUM: 40, HIGH: 70, CRITICAL: 100 }[event.importance];
}

function compatibleKey(event: EventFact): string {
  const operation = event.relatedOperationIds?.[0];
  if (operation) return `${event.turn}:operation:${operation}`;
  const proceeding = event.relatedProceedingIds?.[0];
  if (proceeding) return `${event.turn}:congress:${proceeding}`;
  const project = event.relatedProjectIds?.[0];
  if (project) return `${event.turn}:project:${project}`;
  return `${event.turn}:fact:${event.id}`;
}

function angleFor(family: StoryFamily, facts: EventFact[]): string {
  if (family === "OPERATION") {
    if (facts.some((fact) => fact.type === "OPERATION_CASUALTIES")) return "operational-results-and-casualties";
    if (facts.some((fact) => fact.type === "OPERATION_BREAKTHROUGH")) return "security-breakthrough";
    return "operation-status";
  }
  if (family === "PROJECT") {
    if (facts.some((fact) => fact.type === "PROJECT_FAILED")) return "delivery-failure";
    if (facts.some((fact) => fact.type === "PROJECT_STALLED")) return "funding-and-delay";
    return "implementation-progress";
  }
  if (family === "CONGRESS") return "institutional-outcome";
  if (family === "FISCAL") return "public-finances";
  return "national-development";
}

export function isStandaloneNewsworthy(event: EventFact): boolean {
  if (event.importance === "CRITICAL" || event.importance === "HIGH") return true;
  if (event.type === "PROJECT_MILESTONE") {
    const budget = Number(event.metrics?.budget ?? 0);
    const milestone = Number(event.metrics?.milestone ?? 0);
    return budget >= 10 && milestone >= 50;
  }
  if (event.type === "OPERATION_LAUNCHED") return Number(event.metrics?.budget ?? 0) >= 5;
  if (event.source === "POLITICS" && Math.abs(Number(event.metrics?.change ?? 0)) >= 5) return true;
  return ["CONGRESS", "FISCAL", "WORLD"].includes(event.source) && event.importance === "MEDIUM";
}

/** Groups only same-turn, same-entity facts. Unrelated events always remain separate. */
export function buildStoryCandidates(events: EventFact[]): StoryCandidate[] {
  const groups = new Map<string, EventFact[]>();
  for (const event of events) {
    const key = compatibleKey(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return [...groups.entries()].flatMap(([key, facts]) => {
    const sorted = [...facts].sort((a, b) => importanceScore(b) - importanceScore(a));
    const primaryFact = sorted[0];
    const worthiness = Math.max(...sorted.map(importanceScore)) + Math.min(15, (sorted.length - 1) * 5);
    if (!sorted.some(isStandaloneNewsworthy) && worthiness < 60) return [];
    const family = familyOf(primaryFact);
    return [{
      id: `story-${key.replace(/[^a-zA-Z0-9:-]/g, "-")}`,
      turn: primaryFact.turn,
      family,
      angle: angleFor(family, sorted),
      primaryFact,
      facts: sorted,
      storyWorthiness: worthiness,
    }];
  });
}
