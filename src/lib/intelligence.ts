import type {
  ActiveOperation,
  CriminalOrganisation,
  IntelligenceEvent,
  TurnRecord,
} from "@/lib/gameState";
import { firstSentence } from "@/lib/gameState";

const SECURITY_KEYWORDS =
  /raid|military|police|security|operation|cartel|militia|gang|task ?force|crackdown|deploy|favela|complexo/;
const CORRUPTION_KEYWORDS =
  /corrupt|fraud|embezzl|audit|bribery|anip|kickback|laundering/;
const INTERNATIONAL_KEYWORDS =
  /foreign|international|diplomat|embassy|treaty|border crossing|trade partner|united nations|bilateral|export|import|sanction/;
const ECONOMIC_KEYWORDS =
  /\bgdp\b|inflation|economy|economic|\btax\b|fiscal|budget|subsidy|\bmarket\b|interest rate|selic|unemployment|business registration|investment|stimulus|credit rating|trade balance/;

function classifyCategory(record: TurnRecord): IntelligenceEvent["category"] {
  const text = `${record.orders} ${record.eventSummary} ${record.narrative}`.toLowerCase();

  if (CORRUPTION_KEYWORDS.test(text)) return "corruption";
  if (INTERNATIONAL_KEYWORDS.test(text)) return "international";
  if (SECURITY_KEYWORDS.test(text)) return "security";
  if (ECONOMIC_KEYWORDS.test(text)) return "economic";
  return "domestic";
}

function classifySeverity(record: TurnRecord): IntelligenceEvent["severity"] {
  const magnitude =
    Math.abs(record.securityIndexChange) + Math.abs(record.approvalChange) / 2;

  if (magnitude >= 10) return "critical";
  if (magnitude >= 6) return "high";
  if (magnitude >= 3) return "moderate";
  return "low";
}

/** Derives a brief intelligence log entry from a resolved turn's outcome. */
export function buildIntelligenceEvent(record: TurnRecord): IntelligenceEvent {
  return {
    turn: record.turn,
    date: record.date,
    category: classifyCategory(record),
    severity: classifySeverity(record),
    title: record.eventSummary,
    summary: firstSentence(record.narrative, 200),
  };
}

export function pushIntelligenceEvent(
  events: IntelligenceEvent[],
  event: IntelligenceEvent,
  max = 50
): IntelligenceEvent[] {
  return [...events, event].slice(-max);
}

// ---------------------------------------------------------------------------
// UI style/label lookups shared by the Intelligence page's components
// ---------------------------------------------------------------------------

interface BadgeStyle {
  label: string;
  text: string;
  bg: string;
  border: string;
}

export const THREAT_LEVEL_STYLES: Record<
  CriminalOrganisation["threatLevel"],
  BadgeStyle
> = {
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
    text: "text-yellow-300",
    bg: "bg-yellow-300/10",
    border: "border-yellow-300/30",
  },
  low: {
    label: "LOW",
    text: "text-positive",
    bg: "bg-positive/10",
    border: "border-positive/30",
  },
  neutralised: {
    label: "NEUTRALISED",
    text: "text-text-muted",
    bg: "bg-panel-2",
    border: "border-border",
  },
};

/** Overall threat level, derived from the average capacity of active (non-neutralised) organisations. */
export function getOverallThreatLevel(
  organisations: CriminalOrganisation[]
): "critical" | "high" | "moderate" | "low" {
  const active = organisations.filter((o) => o.threatLevel !== "neutralised");
  if (active.length === 0) return "low";

  const average =
    active.reduce((sum, o) => sum + o.capacity, 0) / active.length;

  if (average >= 65) return "critical";
  if (average >= 45) return "high";
  if (average >= 25) return "moderate";
  return "low";
}

export const ORG_TYPE_LABELS: Record<CriminalOrganisation["type"], string> = {
  cartel: "CARTEL",
  militia: "MILITIA",
  gang: "GANG",
  syndicate: "SYNDICATE",
};

/** Capacity progress-bar colour: red above 60, amber 30-60, green below 30. */
export function capacityColor(capacity: number): string {
  if (capacity > 60) return "#ef4444";
  if (capacity >= 30) return "#f59e0b";
  return "#10b981";
}

interface OperationBadgeStyle extends BadgeStyle {
  pulse?: boolean;
}

export const OPERATION_TYPE_STYLES: Record<ActiveOperation["type"], BadgeStyle> = {
  military: {
    label: "MILITARY",
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
  police: {
    label: "POLICE",
    text: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
  },
  intelligence: {
    label: "INTELLIGENCE",
    text: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
  },
  judicial: {
    label: "JUDICIAL",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
};

export const OPERATION_STATUS_STYLES: Record<
  ActiveOperation["status"],
  OperationBadgeStyle
> = {
  active: {
    label: "ACTIVE",
    text: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
    pulse: true,
  },
  successful: {
    label: "SUCCESSFUL",
    text: "text-positive",
    bg: "bg-positive/10",
    border: "border-positive/30",
  },
  ongoing: {
    label: "ONGOING",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  failed: {
    label: "FAILED",
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
};

export const INTEL_CATEGORY_STYLES: Record<
  IntelligenceEvent["category"],
  BadgeStyle
> = {
  security: {
    label: "SECURITY",
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
  corruption: {
    label: "CORRUPTION",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  international: {
    label: "INTERNATIONAL",
    text: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
  },
  domestic: {
    label: "DOMESTIC",
    text: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
  },
  economic: {
    label: "ECONOMIC",
    text: "text-positive",
    bg: "bg-positive/10",
    border: "border-positive/30",
  },
};

export const SEVERITY_DOT_COLORS: Record<IntelligenceEvent["severity"], string> = {
  critical: "#ef4444",
  high: "#fbbf24",
  moderate: "#fde047",
  low: "#64748b",
};
