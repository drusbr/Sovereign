import type { GameState } from "@/lib/gameState";

// ---------------------------------------------------------------------------
// Home state adjacency — used for the neighbouring-state approval bonus.
// Keyed by the @svg-maps/brazil two-letter state ids (see brazilStates.ts).
// ---------------------------------------------------------------------------

export const STATE_NEIGHBOURS: Record<string, string[]> = {
  ac: ["am", "ro"],
  al: ["pe", "se", "ba"],
  ap: ["pa"],
  am: ["ac", "ro", "mt", "pa", "rr"],
  ba: ["se", "al", "pe", "pi", "to", "go", "mg", "es"],
  ce: ["pi", "pe", "pb", "rn"],
  df: ["go"],
  es: ["ba", "mg", "rj"],
  go: ["mt", "to", "ba", "mg", "ms", "df"],
  ma: ["pi", "to", "pa"],
  mt: ["ro", "am", "pa", "to", "go", "ms"],
  ms: ["mt", "go", "mg", "sp", "pr"],
  mg: ["ba", "es", "rj", "sp", "ms", "go", "df"],
  pa: ["ap", "ma", "to", "mt", "am", "rr"],
  pb: ["rn", "ce", "pe"],
  pr: ["ms", "sp", "sc"],
  pe: ["pb", "ce", "pi", "ba", "al"],
  pi: ["ma", "ce", "pe", "ba", "to"],
  rj: ["es", "mg", "sp"],
  rn: ["ce", "pb"],
  rs: ["sc"],
  ro: ["ac", "am", "mt"],
  rr: ["am", "pa"],
  sc: ["pr", "rs"],
  sp: ["mg", "rj", "pr", "ms"],
  se: ["al", "ba"],
  to: ["ma", "pi", "ba", "go", "mt", "pa"],
};

// ---------------------------------------------------------------------------
// Step 1 — political backgrounds
// ---------------------------------------------------------------------------

export type PoliticalBackgroundId =
  | "military"
  | "academic"
  | "business"
  | "legal"
  | "career_politician"
  | "civil_society";

export interface PoliticalBackground {
  id: PoliticalBackgroundId;
  title: string;
  icon: "Shield" | "BookOpen" | "TrendingUp" | "Scale" | "Users" | "Heart";
  description: string;
  bonusLine: string;
  effects: Partial<Record<keyof GameState, number>>;
}

export const POLITICAL_BACKGROUNDS: PoliticalBackground[] = [
  {
    id: "military",
    title: "Military Career",
    icon: "Shield",
    description:
      "Decorated service in the Brazilian Armed Forces. Respected by the security establishment, viewed with caution by civil society.",
    bonusLine: "Military Morale +10, Security Index +6, Civil Liberties -4",
    effects: { militaryMorale: 10, securityIndex: 6, civilLiberties: -4 },
  },
  {
    id: "academic",
    title: "Academic & Technocrat",
    icon: "BookOpen",
    description:
      "Former university rector and policy architect. Respected internationally, sometimes seen as out of touch with ordinary Brazilians.",
    bonusLine: "GDP Growth tendency +0.4, FDI +1.2, Congressional Support +4",
    effects: { gdpGrowth: 0.4, fdiFlow: 1.2, congressionalSupport: 4 },
  },
  {
    id: "business",
    title: "Business & Industry",
    icon: "TrendingUp",
    description:
      "Built companies and created jobs. Markets trust you. Labour unions do not.",
    bonusLine:
      "FDI +2.5, GDP Growth +0.3, Business Registrations +1200, Approval among wealthy +8, Approval among poor -5",
    effects: {
      fdiFlow: 2.5,
      gdpGrowth: 0.3,
      businessRegistrations: 1200,
      approval: 2,
    },
  },
  {
    id: "legal",
    title: "Legal & Judiciary",
    icon: "Scale",
    description:
      "A career in law and the courts. You understand institutions deeply. You move carefully.",
    bonusLine: "Civil Liberties +8, Institutional Integrity +10, Congressional Support +6",
    effects: { civilLiberties: 8, congressionalSupport: 6 },
  },
  {
    id: "career_politician",
    title: "Career Politician",
    icon: "Users",
    description:
      "You have spent decades in Congress and state government. You know how the game is played.",
    bonusLine: "Congressional Support +15, Coalition building advantage, Approval -3 (seen as part of the old system)",
    effects: { congressionalSupport: 15, approval: -3 },
  },
  {
    id: "civil_society",
    title: "Civil Society & Activism",
    icon: "Heart",
    description:
      "You came from outside the political establishment. People trust you. Institutions are wary.",
    bonusLine:
      "Approval +10, Civil Liberties +5, Congressional Support -8, International Reputation +6",
    effects: { approval: 10, civilLiberties: 5, congressionalSupport: -8 },
  },
];

export function getPoliticalBackground(
  id: PoliticalBackgroundId | string
): PoliticalBackground | undefined {
  return POLITICAL_BACKGROUNDS.find((b) => b.id === id);
}

// ---------------------------------------------------------------------------
// Step 1 — portrait options (12 fixed avatar seeds)
// ---------------------------------------------------------------------------

export const PORTRAIT_SEEDS: string[] = [
  "portrait-01",
  "portrait-02",
  "portrait-03",
  "portrait-04",
  "portrait-05",
  "portrait-06",
  "portrait-07",
  "portrait-08",
  "portrait-09",
  "portrait-10",
  "portrait-11",
  "portrait-12",
];

// ---------------------------------------------------------------------------
// Step 2 — political alignment
// ---------------------------------------------------------------------------

export type PoliticalAlignment = "left" | "centre" | "right";

export interface AlignmentOption {
  id: PoliticalAlignment;
  name: string;
  description: string;
  coalitionSeats: number;
  regionNote: string;
  approvalProfile: string;
  congressionalNote: string;
}

export const TOTAL_CONGRESSIONAL_SEATS = 100;

export const POLITICAL_ALIGNMENTS: AlignmentOption[] = [
  {
    id: "left",
    name: "Aliança Progressista",
    description:
      "Prioritises social welfare, public investment, and redistribution. Strong base among workers, unions, and the poor. Business community is cautious.",
    coalitionSeats: 38,
    regionNote: "Strong in Northeast and North",
    approvalProfile: "Poor +12, Working class +8, Business -6, Wealthy -10",
    congressionalNote:
      "Will need to negotiate with centrist parties to pass economic legislation.",
  },
  {
    id: "centre",
    name: "Centro Democrático",
    description:
      "Pragmatic governance across the political spectrum. Broad but shallow support. Trusted by institutions, exciting to nobody.",
    coalitionSeats: 52,
    regionNote: "Spread nationally",
    approvalProfile: "Balanced across groups, no strong positives or negatives",
    congressionalNote:
      "Best positioned to build majorities but will face demands from all sides.",
  },
  {
    id: "right",
    name: "Renovação Nacional",
    description:
      "Economic liberalism, fiscal discipline, and strong security policy. Trusted by markets and the military. Viewed with suspicion by labour movements.",
    coalitionSeats: 41,
    regionNote: "Strong in South and Southeast",
    approvalProfile: "Business +10, Wealthy +8, Working class -5, Poor -8",
    congressionalNote:
      "Strong on economic reform but will need allies to pass social legislation.",
  },
];

export function getAlignment(id: string): AlignmentOption | undefined {
  return POLITICAL_ALIGNMENTS.find((a) => a.id === id);
}

// ---------------------------------------------------------------------------
// Step 4 — presidential priorities
// ---------------------------------------------------------------------------

export type PriorityId =
  | "economic_modernisation"
  | "public_safety"
  | "corruption"
  | "social_welfare"
  | "environment"
  | "education"
  | "healthcare"
  | "foreign_investment"
  | "infrastructure"
  | "political_reform";

export interface PriorityOption {
  id: PriorityId;
  title: string;
  icon:
    | "TrendingUp"
    | "Shield"
    | "Scale"
    | "Heart"
    | "Leaf"
    | "BookOpen"
    | "Activity"
    | "Globe"
    | "Building"
    | "Landmark";
  description: string;
}

export const PRESIDENTIAL_PRIORITIES: PriorityOption[] = [
  {
    id: "economic_modernisation",
    title: "Economic Modernisation",
    icon: "TrendingUp",
    description:
      "Reduce the tax burden, attract foreign investment, and modernise Brazil's economic infrastructure.",
  },
  {
    id: "public_safety",
    title: "Public Safety & Rule of Law",
    icon: "Shield",
    description:
      "Dismantle organised crime, strengthen the justice system, and restore security in contested territories.",
  },
  {
    id: "corruption",
    title: "Fight Against Corruption",
    icon: "Scale",
    description:
      "Build independent institutions, prosecute the corrupt, and clean up public procurement.",
  },
  {
    id: "social_welfare",
    title: "Social Welfare & Poverty Reduction",
    icon: "Heart",
    description:
      "Expand the social safety net, improve welfare programmes, and reduce inequality.",
  },
  {
    id: "environment",
    title: "Environmental Protection",
    icon: "Leaf",
    description:
      "Protect the Amazon, enforce environmental laws, and position Brazil as a global sustainability leader.",
  },
  {
    id: "education",
    title: "Education Reform",
    icon: "BookOpen",
    description:
      "Modernise the curriculum, professionalise teaching, and improve outcomes in public schools.",
  },
  {
    id: "healthcare",
    title: "Healthcare Improvement",
    icon: "Activity",
    description:
      "Strengthen the SUS, reduce waiting times, and expand coverage to underserved regions.",
  },
  {
    id: "foreign_investment",
    title: "Foreign Investment & Trade",
    icon: "Globe",
    description:
      "Open new markets, attract manufacturing, and position Brazil in global supply chains.",
  },
  {
    id: "infrastructure",
    title: "Infrastructure Development",
    icon: "Building",
    description:
      "Build ports, railways, and digital infrastructure to unlock economic growth.",
  },
  {
    id: "political_reform",
    title: "Political & Institutional Reform",
    icon: "Landmark",
    description:
      "Strengthen democratic institutions, reform electoral law, and improve government transparency.",
  },
];

export function getPriority(id: string): PriorityOption | undefined {
  return PRESIDENTIAL_PRIORITIES.find((p) => p.id === id);
}

/** Primary-priority effect magnitudes. Secondary = half, tertiary = quarter (rounded). */
export const PRIORITY_PRIMARY_EFFECTS: Record<
  PriorityId,
  Partial<Record<keyof GameState, number>>
> = {
  economic_modernisation: { gdpGrowth: 0.3, fdiFlow: 1.5, businessRegistrations: 800 },
  public_safety: { securityIndex: 8, militaryMorale: 5 },
  corruption: { congressionalSupport: 5, civilLiberties: 6, anipCases: 5 },
  social_welfare: { approval: 6, unemployment: -0.4 },
  environment: { internationalPressure: -8, civilLiberties: 4 },
  education: { approval: 4, unemployment: -0.2 },
  healthcare: { approval: 5, mediaSentiment: 6 },
  foreign_investment: { fdiFlow: 2.0, gdpGrowth: 0.2 },
  infrastructure: { activeProjects: 2, gdpGrowth: 0.1 },
  political_reform: { congressionalSupport: 8, civilLiberties: 8, anipCases: 3 },
};

function scaleEffects(
  effects: Partial<Record<keyof GameState, number>>,
  factor: number
): Partial<Record<keyof GameState, number>> {
  const scaled: Partial<Record<keyof GameState, number>> = {};
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value !== "number") continue;
    const isInteger = Number.isInteger(value);
    const result = value * factor;
    scaled[key as keyof GameState] = isInteger ? Math.round(result) : Math.round(result * 10) / 10;
  }
  return scaled;
}

/** Returns the scaled effect set for a priority given its selection order (1st/2nd/3rd). */
export function priorityEffectsForRank(
  priorityId: PriorityId,
  rank: 1 | 2 | 3
): Partial<Record<keyof GameState, number>> {
  const base = PRIORITY_PRIMARY_EFFECTS[priorityId];
  if (rank === 1) return base;
  if (rank === 2) return scaleEffects(base, 0.5);
  return scaleEffects(base, 0.25);
}

export const PRIORITY_STARTER_PROJECTS: Record<
  PriorityId,
  { name: string; description: string; turns: number }
> = {
  economic_modernisation: {
    name: "Tax Administration Modernisation Programme",
    description:
      "Modernise federal tax administration and compliance systems for a future simplified framework",
    turns: 8,
  },
  public_safety: {
    name: "BNOE Special Battalion Formation",
    description: "Establish an elite federal counter-crime unit trained by BOPE veterans",
    turns: 5,
  },
  corruption: {
    name: "ANIP Independence Act",
    description: "Establish the independent anti-corruption agency with full investigative powers",
    turns: 6,
  },
  social_welfare: {
    name: "Ponte para o Trabalho Reform",
    description: "Restructure social welfare into a work-transition model with sliding benefit scale",
    turns: 7,
  },
  environment: {
    name: "Amazon Enforcement Initiative",
    description: "Deploy federal resources to combat illegal deforestation and mining",
    turns: 6,
  },
  education: {
    name: "Escola Viva Pilot Programme",
    description:
      "Full-day school programme with STEM labs and vocational training in underserved areas",
    turns: 10,
  },
  healthcare: {
    name: "SUS Digital Platform",
    description:
      "National telemedicine system connecting remote communities with specialist physicians",
    turns: 7,
  },
  foreign_investment: {
    name: "Brasil Competitivo Package",
    description: "Zero tariffs on capital goods and semiconductor manufacturing for 36 months",
    turns: 4,
  },
  infrastructure: {
    name: "Santos Port Phase 1 Expansion",
    description: "Dredging and berth construction to increase export capacity by 35%",
    turns: 12,
  },
  political_reform: {
    name: "Compras Transparentes Act",
    description: "Digital public procurement platform with beneficial ownership registry",
    turns: 5,
  },
};
