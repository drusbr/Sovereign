import type { WorldEvent } from "@/lib/gameState";

interface BadgeStyle {
  label: string;
  text: string;
  bg: string;
  border: string;
}

export const SEVERITY_STYLES: Record<WorldEvent["severity"], BadgeStyle> = {
  critical: {
    label: "CRITICAL",
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
  high: {
    label: "HIGH",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  moderate: {
    label: "MODERATE",
    text: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
  },
  low: {
    label: "LOW",
    text: "text-positive",
    bg: "bg-positive/10",
    border: "border-positive/30",
  },
  informational: {
    label: "INFO",
    text: "text-text-muted",
    bg: "bg-panel-2",
    border: "border-border",
  },
};

export function formatCategoryLabel(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function turnsRemaining(event: WorldEvent, currentTurn: number): number {
  return Math.max(0, event.expiresOnTurn - currentTurn);
}

export function requiresAttention(event: WorldEvent): boolean {
  return event.requiresResponse && event.status === "active";
}

export function isOngoingSituation(event: WorldEvent): boolean {
  return !requiresAttention(event) && event.severity !== "informational";
}

export function isWorldFeedItem(event: WorldEvent): boolean {
  return event.severity === "informational";
}
