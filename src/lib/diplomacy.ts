import type {
  DiplomaticEvent,
  DiplomaticOpportunity,
  DiplomaticPressure,
  DiplomaticRelation,
} from "@/lib/gameState";
import { clamp0to100 } from "@/lib/gameState";

const CAPACITY_WEIGHT: Record<DiplomaticRelation["pressureCapacity"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** globalStanding = weighted average of relationshipScores, weighted by pressureCapacity. */
export function computeGlobalStanding(relations: DiplomaticRelation[]): number {
  if (relations.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const r of relations) {
    const weight = CAPACITY_WEIGHT[r.pressureCapacity];
    weightedSum += r.relationshipScore * weight;
    totalWeight += weight;
  }
  return Math.round(weightedSum / totalWeight);
}

export function deriveRelationshipStatus(
  score: number
): DiplomaticRelation["relationshipStatus"] {
  if (score >= 80) return "ally";
  if (score >= 60) return "friendly";
  if (score >= 40) return "neutral";
  if (score >= 20) return "strained";
  return "hostile";
}

/** Marks opportunities past their deadline (and never seized) as expired. */
export function expireOpportunities(
  opportunities: DiplomaticOpportunity[],
  currentTurn: number
): DiplomaticOpportunity[] {
  return opportunities.map((opp) =>
    !opp.seized && !opp.expired && opp.expiresOnTurn <= currentTurn
      ? { ...opp, expired: true }
      : opp
  );
}

/** Active negotiations = opportunities still open (not seized, not expired). */
export function computeActiveNegotiations(
  opportunities: DiplomaticOpportunity[]
): number {
  return opportunities.filter((o) => !o.seized && !o.expired).length;
}

export interface InternationalPressureResult {
  relations: DiplomaticRelation[];
  events: DiplomaticEvent[];
}

/**
 * When internationalPressure exceeds 50, the UN and EU relationships
 * erode by 1 point per turn — sustained pressure costs goodwill with the
 * multilateral bodies most invested in it.
 */
export function applyInternationalPressureDrag(
  relations: DiplomaticRelation[],
  internationalPressure: number,
  turn: number,
  date: string
): InternationalPressureResult {
  if (internationalPressure <= 50) return { relations, events: [] };

  const events: DiplomaticEvent[] = [];
  const nextRelations = relations.map((r) => {
    if (r.id !== "un" && r.id !== "eu") return r;
    const nextScore = clamp0to100(r.relationshipScore - 1);
    events.push({
      turn,
      date,
      description: `Sustained international pressure eroded goodwill with ${r.name}`,
      relationshipAffected: r.name,
      scoreChange: -1,
    });
    return {
      ...r,
      relationshipScore: nextScore,
      relationshipStatus: deriveRelationshipStatus(nextScore),
      trend: "deteriorating" as const,
    };
  });

  return { relations: nextRelations, events };
}

/**
 * A major security swing (|securityIndexChange| > 8) draws UN Human Rights
 * Council scrutiny — a new diplomatic pressure, if one isn't already open.
 */
export function maybeAddSecurityOperationPressure(
  pressures: DiplomaticPressure[],
  securityIndexChange: number,
  turn: number
): DiplomaticPressure[] {
  if (Math.abs(securityIndexChange) <= 8) return pressures;

  const alreadyOpen = pressures.some(
    (p) => p.source === "United Nations Human Rights Council" && !p.resolved
  );
  if (alreadyOpen) return pressures;

  const newPressure: DiplomaticPressure = {
    id: `pressure_${turn}_unhrc`,
    source: "United Nations Human Rights Council",
    trigger: "A major security operation shift drew international scrutiny this turn",
    demand: "Independent investigation into the conduct of security operations",
    severity: securityIndexChange < 0 ? "high" : "moderate",
    turn,
    resolved: false,
  };

  return [...pressures, newPressure];
}

// ---------------------------------------------------------------------------
// UI style/label lookups
// ---------------------------------------------------------------------------

interface BadgeStyle {
  label: string;
  text: string;
  bg: string;
  border: string;
}

export const RELATIONSHIP_STATUS_STYLES: Record<
  DiplomaticRelation["relationshipStatus"],
  BadgeStyle & { barColor: string }
> = {
  ally: {
    label: "ALLY",
    text: "text-emerald-300",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    barColor: "#34d399",
  },
  friendly: {
    label: "FRIENDLY",
    text: "text-positive",
    bg: "bg-positive/10",
    border: "border-positive/30",
    barColor: "#10b981",
  },
  neutral: {
    label: "NEUTRAL",
    text: "text-text-muted",
    bg: "bg-panel-2",
    border: "border-border",
    barColor: "#64748b",
  },
  strained: {
    label: "STRAINED",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    barColor: "#f59e0b",
  },
  hostile: {
    label: "HOSTILE",
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
    barColor: "#ef4444",
  },
};

export const RELATION_TYPE_LABELS: Record<DiplomaticRelation["type"], string> = {
  country: "COUNTRY",
  bloc: "BLOC",
  organisation: "ORGANISATION",
};

export const PRESSURE_SEVERITY_STYLES: Record<
  DiplomaticPressure["severity"],
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
    text: "text-text-muted",
    bg: "bg-panel-2",
    border: "border-border",
  },
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  summit: "SUMMIT",
  vote: "VOTE",
  deadline: "DEADLINE",
  visit: "VISIT",
};

export const IMPORTANCE_STYLES: Record<
  "critical" | "high" | "moderate",
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
    text: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
  },
};

export function globalStandingColor(value: number): string {
  if (value > 60) return "#10b981";
  if (value >= 40) return "#f59e0b";
  return "#ef4444";
}

export function internationalPressureColor(value: number): string {
  if (value > 60) return "#ef4444";
  if (value >= 30) return "#f59e0b";
  return "#10b981";
}

const INTEREST_EXPLANATIONS: [pattern: RegExp, explanation: string][] = [
  [/mercosul|regional integration|trade harmonisation/i, "A stable, integrated bloc reduces friction at Brazil's borders and strengthens its regional leadership."],
  [/border security|border patrol/i, "Shared border management keeps smuggling, migration, and armed groups from becoming a bilateral flashpoint."],
  [/trade|export|market access|commerce/i, "Commercial access underpins both economies — disruption here has immediate domestic political cost."],
  [/amazon|deforestation|climate/i, "Environmental commitments are a litmus test of Brazil's credibility on the global stage."],
  [/human rights/i, "Governance and rights records shape whether this partner treats Brazil as a peer or a project."],
  [/counter-narcotics|coca policy|narcotic/i, "Cooperation against trafficking networks is judged as a proxy for institutional seriousness."],
  [/sanctions|political recognition/i, "This is an existential concern for them — expect it to dominate every interaction."],
  [/migration/i, "Migration flows are politically sensitive on both sides of the border and hard to fully control."],
  [/infrastructure investment|development aid|assistance/i, "Investment and aid flows buy long-term goodwill but come with strings attached."],
  [/fiscal discipline|debt sustainability|structural reform/i, "They watch Brazil's fiscal trajectory closely — it drives their own risk assessments."],
  [/financial services|post-brexit/i, "Post-Brexit repositioning makes them eager for new trade relationships to showcase."],
  [/multilateralism/i, "They need reliable partners willing to defend the rules-based order in international forums."],
  [/itaipu|energy/i, "Shared energy infrastructure ties both nations' domestic politics directly to this relationship."],
  [/south-south cooperation/i, "They see Brazil as a peer voice for the Global South in international institutions."],
];

/** Deterministic, template-based explanation for why a stated interest matters to a partner. */
export function explainInterest(interest: string): string {
  const match = INTEREST_EXPLANATIONS.find(([pattern]) => pattern.test(interest));
  return (
    match?.[1] ??
    "A standing priority in how they weigh the overall relationship with Brazil."
  );
}

export const PRESSURE_CAPACITY_DESCRIPTIONS: Record<
  DiplomaticRelation["pressureCapacity"],
  string
> = {
  high: "Capable of significant economic, diplomatic, or security consequences if relations sour — a partner to manage carefully.",
  medium: "Able to apply meaningful but survivable pressure through trade, diplomatic censure, or regional coordination.",
  low: "Limited capacity to retaliate directly, though reputational or regional ripple effects are still possible.",
};

/** Net sentiment of last turn's diplomatic events, for the KPI trend arrow. */
export function recentGlobalStandingTrend(
  events: DiplomaticEvent[],
  currentTurn: number
): "up" | "down" | "flat" {
  const lastTurnEvents = events.filter((e) => e.turn === currentTurn - 1);
  if (lastTurnEvents.length === 0) return "flat";
  const net = lastTurnEvents.reduce((sum, e) => sum + e.scoreChange, 0);
  if (net > 0) return "up";
  if (net < 0) return "down";
  return "flat";
}
