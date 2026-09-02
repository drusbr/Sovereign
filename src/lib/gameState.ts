import { DEFAULT_STATE_SECURITY, type SecurityStatus } from "@/lib/brazilStates";
import type { AdvisorContext } from "@/lib/gemini";
import { INITIAL_PROJECTS, type ProjectDefinition } from "@/lib/projects";

export interface TurnRecord {
  turn: number;
  date: string;
  orders: string;
  narrative: string;
  eventSummary: string;
  approvalChange: number;
  securityIndexChange: number;
}

export interface CriminalOrganisation {
  id: string;
  name: string;
  shortName: string;
  type: "cartel" | "militia" | "gang" | "syndicate";
  primaryTerritory: string[];
  capacity: number; // 0-100, percentage of baseline operational capacity
  trend: "growing" | "stable" | "weakening" | "collapsing";
  threatLevel: "critical" | "high" | "moderate" | "low" | "neutralised";
  lastKnownActivity: string;
}

export interface ActiveOperation {
  id: string;
  name: string;
  type: "military" | "police" | "intelligence" | "judicial";
  location: string;
  objective: string;
  startTurn: number;
  status: "active" | "successful" | "ongoing" | "failed";
  leadAgency: string;
}

export interface IntelligenceEvent {
  turn: number;
  date: string;
  category: "security" | "corruption" | "international" | "domestic" | "economic";
  severity: "critical" | "high" | "moderate" | "low";
  title: string;
  summary: string;
}

export type NewsOutlet =
  | "Folha de S.Paulo"
  | "O Globo"
  | "Brasil de Fato"
  | "Veja"
  | "BBC Brasil"
  | "Poder360"
  | "InfoMoney";

export interface NewsArticle {
  id: string;
  turn: number;
  date: string;
  outlet: NewsOutlet;
  headline: string;
  body: string;
  sentiment: "positive" | "neutral" | "negative" | "critical";
  topic: "security" | "economy" | "diplomacy" | "social" | "corruption" | "politics";
  isBreaking: boolean;
}

export interface InterviewRequest {
  id: string;
  outlet: NewsOutlet;
  topic: string;
  risk: "low" | "medium" | "high";
  opportunity: "low" | "medium" | "high";
  deadline: number; // turn number by which it expires
  accepted: boolean | null;
}

export interface MediaEvent {
  turn: number;
  date: string;
  description: string;
  sentimentImpact: number;
}

export interface DiplomaticRelation {
  id: string;
  name: string;
  type: "country" | "bloc" | "organisation";
  relationshipScore: number; // 0-100
  relationshipStatus: "ally" | "friendly" | "neutral" | "strained" | "hostile";
  primaryInterests: string[];
  recentInteraction: string;
  trend: "improving" | "stable" | "deteriorating";
  pressureCapacity: "high" | "medium" | "low";
  flagEmoji: string;
  region:
    | "south_america"
    | "north_america"
    | "europe"
    | "asia"
    | "africa"
    | "multilateral";
}

export interface DiplomaticPressure {
  id: string;
  source: string;
  trigger: string;
  demand: string;
  severity: "critical" | "high" | "moderate" | "low";
  turn: number;
  resolved: boolean;
}

export interface DiplomaticOpportunity {
  id: string;
  partner: string;
  description: string;
  benefit: string;
  expiresOnTurn: number;
  seized: boolean;
  /** Set once expiresOnTurn has passed without being seized. */
  expired?: boolean;
}

export interface DiplomaticEvent {
  turn: number;
  date: string;
  description: string;
  relationshipAffected: string;
  scoreChange: number;
}

export interface ScheduledDiplomaticEvent {
  id: string;
  name: string;
  description: string;
  dueTurn: number;
  type: "summit" | "vote" | "deadline" | "visit";
  importance: "critical" | "high" | "moderate";
}

export type DomesticCategory =
  | "natural_disaster"
  | "social_unrest"
  | "public_incident"
  | "economic_shock"
  | "political_event"
  | "environmental"
  | "health_crisis";

export type InternationalCategory =
  | "foreign_election"
  | "conflict"
  | "trade_development"
  | "diplomatic_incident"
  | "climate_event"
  | "economic_shock"
  | "migration_crisis"
  | "geopolitical_shift";

export interface EventResponseOption {
  id: string;
  label: string;
  description: string;
  effects: Partial<Record<keyof GameState, number>>;
  requiresActionPoints: number;
  consequenceNarrative: string;
}

export interface BrazilImpact {
  description: string;
  severity: "critical" | "high" | "moderate" | "low" | "none";
  affectedAreas: string[];
  suggestedResponse: string;
}

export interface WorldEvent {
  id: string;
  type: "domestic" | "international";
  category: DomesticCategory | InternationalCategory;
  title: string;
  location: string;
  description: string;
  context: string;
  startTurn: number;
  expiresOnTurn: number;
  severity: "critical" | "high" | "moderate" | "low" | "informational";
  requiresResponse: boolean;
  responseOptions: EventResponseOption[];
  brazilImpact: BrazilImpact | null;
  status: "active" | "ongoing" | "resolved" | "expired";
  playerResponse: string | null;
  resolvedOnTurn: number | null;
}

export interface GameState {
  turn: number;
  date: string;
  countryName: string;
  playerTitle: string;
  playerName: string;
  approval: number;
  securityIndex: number;
  gdpGrowth: number;
  gdpHistory: number[];
  inflation: number;
  activeProjects: number;
  situation: string;
  congressionalSupport: number;
  militaryMorale: number;
  civilLiberties: number;
  internationalPressure: number;
  stateSecurity: Record<string, SecurityStatus>;
  history: TurnRecord[];
  triggeredEventIds: string[];
  /** Resets to 3 at the start of every new turn; spent on advisor meetings. */
  actionPoints: number;
  criminalOrganisations: CriminalOrganisation[];
  activeOperations: ActiveOperation[];
  anipCases: number;
  anipAssetsFrozen: number; // in billions BRL
  intelligenceEvents: IntelligenceEvent[];
  unemployment: number; // percentage, e.g. 11.2
  fdiFlow: number; // billions BRL, positive = inflow
  fdiHistory: number[]; // last 7 turns
  tradeBalance: number; // billions BRL, positive = surplus
  informalEconomy: number; // percentage of workforce informal
  creditRating: "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "Junk";
  businessRegistrations: number; // new formal businesses this turn
  businessRegistrationHistory: number[]; // last 7 turns
  approvalHistory: number[]; // last 7 turns — for sparkline on dashboard
  sovereignDebt: number; // percentage of GDP
  publicInvestment: number; // percentage of GDP
  mediaSentiment: number; // 0-100, overall press sentiment
  mediaSentimentHistory: number[]; // last 7 turns — mirrors approvalHistory
  pressCoverage: number; // 0-100, how much you're being talked about
  dominantNarrative: string; // current press narrative about the president
  internationalCoverage: number; // 0-100
  newsArticles: NewsArticle[]; // all generated articles
  pendingInterviews: InterviewRequest[]; // outlets requesting access
  mediaEvents: MediaEvent[]; // significant media moments
  globalStanding: number; // 0-100 composite diplomatic index
  activeNegotiations: number; // count of ongoing diplomatic processes
  allianceStrength: number; // 0-100
  diplomaticRelations: DiplomaticRelation[];
  diplomaticPressures: DiplomaticPressure[];
  diplomaticOpportunities: DiplomaticOpportunity[];
  diplomaticEvents: DiplomaticEvent[];
  upcomingDiplomaticEvents: ScheduledDiplomaticEvent[];
  projects: ProjectDefinition[];
  /** Short player-facing lines describing this turn's triggered simulation rules. */
  worldDriftLog: string[];
  /** Failure-threshold ids already shown to the player, so they don't repeat every turn. */
  triggeredFailureThresholdIds: string[];
  worldEvents: WorldEvent[];
  resolvedWorldEvents: WorldEvent[];
}

const START_DATE = new Date(Date.UTC(2026, 0, 8)); // January 8th 2026

export function formatGameDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function createInitialGameState(): GameState {
  return {
    turn: 1,
    date: formatGameDate(START_DATE),
    countryName: "Brazil",
    playerTitle: "President",
    playerName: "Marina Duarte",
    approval: 45,
    securityIndex: 47,
    gdpGrowth: 1.8,
    gdpHistory: [1.1, 1.3, 1.2, 1.5, 1.4, 1.6, 1.8],
    inflation: 4.6,
    activeProjects: 3,
    situation:
      "Organised crime factions continue to contest territory in Rio de Janeiro and São Paulo's periphery, while Congress stalls key economic reforms. Public patience is thinning, but no single crisis yet dominates the news cycle.",
    congressionalSupport: 50,
    militaryMorale: 60,
    civilLiberties: 70,
    internationalPressure: 20,
    stateSecurity: { ...DEFAULT_STATE_SECURITY },
    history: [],
    triggeredEventIds: [],
    actionPoints: 3,
    criminalOrganisations: [
      {
        id: "pcc",
        name: "Primeiro Comando da Capital",
        shortName: "PCC",
        type: "cartel",
        primaryTerritory: ["São Paulo", "Mato Grosso do Sul", "Paraná"],
        capacity: 78,
        trend: "stable",
        threatLevel: "critical",
        lastKnownActivity:
          "Coordinated attacks on police precincts across São Paulo metropolitan area",
      },
      {
        id: "cv",
        name: "Comando Vermelho",
        shortName: "CV",
        type: "cartel",
        primaryTerritory: ["Rio de Janeiro", "Amazonas", "Pará"],
        capacity: 72,
        trend: "stable",
        threatLevel: "critical",
        lastKnownActivity:
          "Territorial expansion into northern Complexo do Alemão sectors",
      },
      {
        id: "militias",
        name: "Rio Militia Networks",
        shortName: "Militias",
        type: "militia",
        primaryTerritory: ["Rio de Janeiro — West Zone"],
        capacity: 65,
        trend: "growing",
        threatLevel: "high",
        lastKnownActivity:
          "Expansion of utility extortion networks in Zona Oeste municipalities",
      },
      {
        id: "gde",
        name: "Guardiões do Estado",
        shortName: "GDE",
        type: "gang",
        primaryTerritory: ["Ceará", "Rio Grande do Norte"],
        capacity: 58,
        trend: "growing",
        threatLevel: "high",
        lastKnownActivity:
          "Atlantic Gateway narcotics shipments to West Africa via Ceará ports",
      },
      {
        id: "fdn",
        name: "Família do Norte",
        shortName: "FDN",
        type: "cartel",
        primaryTerritory: ["Amazonas", "Roraima"],
        capacity: 45,
        trend: "weakening",
        threatLevel: "moderate",
        lastKnownActivity:
          "Merger activity with illegal mining syndicates in upper Amazon basin",
      },
    ],
    activeOperations: [
      {
        id: "op_complexo",
        name: "Operation Complexo",
        type: "military",
        location: "Rio de Janeiro",
        objective: "Establish federal security perimeter in Complexo do Alemão",
        startTurn: 1,
        status: "active",
        leadAgency: "BNOE / Federal Police",
      },
      {
        id: "op_espelho",
        name: "Operação Espelho",
        type: "judicial",
        location: "National",
        objective: "ANIP lifestyle audits of federal judiciary and customs officials",
        startTurn: 1,
        status: "active",
        leadAgency: "ANIP",
      },
    ],
    anipCases: 12,
    anipAssetsFrozen: 0.8,
    intelligenceEvents: [],
    unemployment: 11.2,
    fdiFlow: 8.4,
    fdiHistory: [6.1, 5.8, 7.2, 6.9, 7.8, 8.1, 8.4],
    tradeBalance: 12.3,
    informalEconomy: 40,
    creditRating: "BB",
    businessRegistrations: 4200,
    businessRegistrationHistory: [3100, 3400, 3200, 3600, 3800, 4000, 4200],
    approvalHistory: [45, 45, 45, 45, 45, 45, 45],
    sovereignDebt: 88,
    publicInvestment: 3.2,
    mediaSentiment: 52,
    mediaSentimentHistory: [52, 52, 52, 52, 52, 52, 52],
    pressCoverage: 35,
    dominantNarrative: "New administration faces inherited crises",
    internationalCoverage: 15,
    newsArticles: [],
    pendingInterviews: [
      {
        id: "interview_001",
        outlet: "Folha de S.Paulo",
        topic: "Security strategy and the PCC crisis",
        risk: "medium",
        opportunity: "high",
        deadline: 4,
        accepted: null,
      },
      {
        id: "interview_002",
        outlet: "InfoMoney",
        topic: "Economic reform agenda and investor confidence",
        risk: "low",
        opportunity: "medium",
        deadline: 5,
        accepted: null,
      },
    ],
    mediaEvents: [],
    diplomaticRelations: [
      {
        id: "argentina",
        name: "Argentina",
        type: "country",
        relationshipScore: 60,
        relationshipStatus: "friendly",
        primaryInterests: ["Mercosul stability", "border security", "trade access"],
        recentInteraction: "Routine bilateral trade meeting",
        trend: "stable",
        pressureCapacity: "medium",
        flagEmoji: "🇦🇷",
        region: "south_america",
      },
      {
        id: "usa",
        name: "United States",
        type: "country",
        relationshipScore: 50,
        relationshipStatus: "neutral",
        primaryInterests: ["counter-narcotics", "trade", "democratic governance"],
        recentInteraction: "DEA counter-narcotics coordination call",
        trend: "stable",
        pressureCapacity: "high",
        flagEmoji: "🇺🇸",
        region: "north_america",
      },
      {
        id: "eu",
        name: "European Union",
        type: "bloc",
        relationshipScore: 55,
        relationshipStatus: "friendly",
        primaryInterests: ["Amazon preservation", "trade agreement", "human rights"],
        recentInteraction: "Mercosul-EU trade talks resumed",
        trend: "improving",
        pressureCapacity: "high",
        flagEmoji: "🇪🇺",
        region: "europe",
      },
      {
        id: "china",
        name: "China",
        type: "country",
        relationshipScore: 45,
        relationshipStatus: "neutral",
        primaryInterests: [
          "commodity exports",
          "infrastructure investment",
          "market access",
        ],
        recentInteraction: "Soy export contract renewal",
        trend: "stable",
        pressureCapacity: "high",
        flagEmoji: "🇨🇳",
        region: "asia",
      },
      {
        id: "bolivia",
        name: "Bolivia",
        type: "country",
        relationshipScore: 48,
        relationshipStatus: "neutral",
        primaryInterests: ["border security", "development aid", "coca policy"],
        recentInteraction: "Border patrol coordination meeting",
        trend: "stable",
        pressureCapacity: "low",
        flagEmoji: "🇧🇴",
        region: "south_america",
      },
      {
        id: "paraguay",
        name: "Paraguay",
        type: "country",
        relationshipScore: 46,
        relationshipStatus: "neutral",
        primaryInterests: ["Itaipu dam", "border trade", "Mercosul access"],
        recentInteraction: "Itaipu energy pricing dispute",
        trend: "deteriorating",
        pressureCapacity: "low",
        flagEmoji: "🇵🇾",
        region: "south_america",
      },
      {
        id: "venezuela",
        name: "Venezuela",
        type: "country",
        relationshipScore: 30,
        relationshipStatus: "strained",
        primaryInterests: [
          "sanctions relief",
          "migration management",
          "political recognition",
        ],
        recentInteraction: "Migration crisis border management",
        trend: "deteriorating",
        pressureCapacity: "low",
        flagEmoji: "🇻🇪",
        region: "south_america",
      },
      {
        id: "colombia",
        name: "Colombia",
        type: "country",
        relationshipScore: 58,
        relationshipStatus: "friendly",
        primaryInterests: ["counter-narcotics", "Amazon security", "trade"],
        recentInteraction: "Joint counter-narcotics operation",
        trend: "improving",
        pressureCapacity: "medium",
        flagEmoji: "🇨🇴",
        region: "south_america",
      },
      {
        id: "uk",
        name: "United Kingdom",
        type: "country",
        relationshipScore: 52,
        relationshipStatus: "neutral",
        primaryInterests: [
          "trade post-Brexit",
          "financial services",
          "democratic governance",
        ],
        recentInteraction: "Trade framework discussions",
        trend: "stable",
        pressureCapacity: "medium",
        flagEmoji: "🇬🇧",
        region: "europe",
      },
      {
        id: "un",
        name: "United Nations",
        type: "organisation",
        relationshipScore: 50,
        relationshipStatus: "neutral",
        primaryInterests: ["human rights", "multilateralism", "climate commitments"],
        recentInteraction: "Human Rights Council periodic review",
        trend: "stable",
        pressureCapacity: "medium",
        flagEmoji: "🇺🇳",
        region: "multilateral",
      },
      {
        id: "imf",
        name: "IMF",
        type: "organisation",
        relationshipScore: 55,
        relationshipStatus: "neutral",
        primaryInterests: ["fiscal discipline", "debt sustainability", "structural reform"],
        recentInteraction: "Article IV consultation",
        trend: "stable",
        pressureCapacity: "high",
        flagEmoji: "🏛️",
        region: "multilateral",
      },
      {
        id: "mercosul",
        name: "Mercosul",
        type: "bloc",
        relationshipScore: 62,
        relationshipStatus: "friendly",
        primaryInterests: [
          "regional integration",
          "trade harmonisation",
          "political stability",
        ],
        recentInteraction: "Mercosul summit preparatory meeting",
        trend: "stable",
        pressureCapacity: "medium",
        flagEmoji: "🌎",
        region: "south_america",
      },
      {
        id: "african_union",
        name: "African Union",
        type: "organisation",
        relationshipScore: 40,
        relationshipStatus: "neutral",
        primaryInterests: [
          "south-south cooperation",
          "trade",
          "development assistance",
        ],
        recentInteraction: "Brazil-Africa economic forum",
        trend: "improving",
        pressureCapacity: "low",
        flagEmoji: "🌍",
        region: "africa",
      },
    ],
    globalStanding: 52,
    activeNegotiations: 2,
    allianceStrength: 58,
    diplomaticPressures: [
      {
        id: "pressure_001",
        source: "United Nations Human Rights Council",
        trigger: "Reports of civilian casualties in ongoing security operations",
        demand: "Independent investigation into use of force in favela operations",
        severity: "moderate",
        turn: 1,
        resolved: false,
      },
    ],
    diplomaticOpportunities: [
      {
        id: "opp_001",
        partner: "United States",
        description:
          "DEA is seeking a deeper intelligence sharing framework on Amazon narcotics routes",
        benefit:
          "Access to US satellite intelligence, +8 to security index, improved US relations",
        expiresOnTurn: 6,
        seized: false,
      },
      {
        id: "opp_002",
        partner: "European Union",
        description:
          "EU trade negotiators are ready to accelerate Mercosul-EU agreement if Brazil demonstrates deforestation commitments",
        benefit: "Trade deal fast-track, major FDI boost, improved EU relations",
        expiresOnTurn: 8,
        seized: false,
      },
    ],
    diplomaticEvents: [],
    upcomingDiplomaticEvents: [
      {
        id: "event_001",
        name: "UN General Assembly",
        description:
          "Brazil delivers its annual address to the UN General Assembly. A strong speech can boost global standing significantly.",
        dueTurn: 8,
        type: "summit",
        importance: "high",
      },
      {
        id: "event_002",
        name: "Mercosul Summit",
        description:
          "Regional leaders meet. Brazil as the largest member is expected to lead on trade harmonisation agenda.",
        dueTurn: 6,
        type: "summit",
        importance: "moderate",
      },
    ],
    projects: INITIAL_PROJECTS.map((p) => ({ ...p })),
    worldDriftLog: [],
    triggeredFailureThresholdIds: [],
    worldEvents: [],
    resolvedWorldEvents: [],
  };
}

export function advanceGameDate(currentDate: string, daysToAdd = 7): string {
  const parsed = new Date(currentDate);
  if (Number.isNaN(parsed.getTime())) {
    return currentDate;
  }
  parsed.setUTCDate(parsed.getUTCDate() + daysToAdd);
  return formatGameDate(parsed);
}

export function pushTurnRecord(
  history: TurnRecord[],
  record: TurnRecord,
  max = 30
): TurnRecord[] {
  return [...history, record].slice(-max);
}

export function clamp0to100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Appends a value to a rolling numeric history, keeping only the last `max` entries. */
export function pushCapped(history: number[], value: number, max = 7): number[] {
  return [...history, value].slice(-max);
}

/** Extracts a single readable sentence/line from a longer narrative, for collapsed summaries. */
export function firstSentence(text: string, maxLength = 160): string {
  const clean = text.trim().split("\n\n")[0].split("\n")[0].trim();
  const match = clean.match(/^.*?[.!?](?:\s|$)/);
  const sentence = (match ? match[0] : clean).trim();
  return sentence.length > maxLength
    ? `${sentence.slice(0, maxLength - 1).trim()}…`
    : sentence;
}

/** Builds the game-state payload shared by advisor briefings and meetings. */
export function buildAdvisorContext(state: GameState): AdvisorContext {
  return {
    countryName: state.countryName,
    playerTitle: state.playerTitle,
    turn: state.turn,
    date: state.date,
    approval: state.approval,
    securityIndex: state.securityIndex,
    gdpGrowth: state.gdpGrowth,
    inflation: state.inflation,
    activeProjects: state.activeProjects,
    situation: state.situation,
    recentEvents: state.history.slice(-5).map((h) => ({
      turn: h.turn,
      date: h.date,
      summary: h.eventSummary,
    })),
  };
}
