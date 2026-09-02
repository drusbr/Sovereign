import type {
  DomesticCategory,
  EventResponseOption,
  GameState,
  InternationalCategory,
  WorldEvent,
} from "@/lib/gameState";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

type EventBuilderOutput = Pick<
  WorldEvent,
  | "type"
  | "category"
  | "title"
  | "location"
  | "description"
  | "context"
  | "severity"
  | "requiresResponse"
  | "responseOptions"
>;

interface DeterministicEventDef {
  id: string;
  condition: (s: GameState) => boolean;
  probability: number;
  durationTurns: number;
  eventBuilder: (state: GameState, turn: number) => EventBuilderOutput;
}

function option(
  label: string,
  description: string,
  effects: EventResponseOption["effects"],
  requiresActionPoints: number,
  consequenceNarrative: string
): EventResponseOption {
  return {
    id: slugify(label),
    label,
    description,
    effects,
    requiresActionPoints,
    consequenceNarrative,
  };
}

// ---------------------------------------------------------------------------
// A) Deterministic events — forced by specific game-state conditions
// ---------------------------------------------------------------------------

export const DETERMINISTIC_EVENTS: DeterministicEventDef[] = [
  {
    id: "unemployment_protests",
    condition: (s) => s.unemployment > 12 && s.approval < 40,
    probability: 0.7,
    durationTurns: 3,
    eventBuilder: () => ({
      type: "domestic",
      category: "social_unrest",
      title: "Mass Unemployment Protests",
      location: "São Paulo, Rio de Janeiro, Recife",
      description:
        "Tens of thousands are protesting rising unemployment. Union leaders are threatening a general strike.",
      context:
        "Joblessness has been climbing for months, and patience with the administration's economic response is wearing thin among organised labour.",
      severity: "high",
      requiresResponse: true,
      responseOptions: [
        option(
          "Emergency jobs programme",
          "Launch a rapid public-works hiring initiative targeted at the worst-hit metro areas.",
          { approval: 6, unemployment: -0.5, sovereignDebt: 2 },
          1,
          "The emergency jobs programme provides quick relief to unemployed workers, though economists warn of the fiscal cost."
        ),
        option(
          "Meet with union leaders",
          "Open direct negotiations with union federations to de-escalate the strike threat.",
          { approval: 3, congressionalSupport: 2 },
          1,
          "Direct talks cool tempers and buy political room, though the underlying unemployment problem remains unaddressed."
        ),
        option(
          "Deploy federal police to maintain order",
          "Send federal forces to secure protest zones and keep transit corridors open.",
          { approval: -4, civilLiberties: -5, securityIndex: 2 },
          1,
          "A visible police presence keeps the streets orderly but draws sharp criticism over heavy-handed tactics."
        ),
        option(
          "Ignore and stay the course",
          "Make no public response and let the current economic programme run.",
          { approval: -6, congressionalSupport: -3 },
          0,
          "The silence reads as indifference, and the protests grow louder in the administration's absence."
        ),
      ],
    }),
  },
  {
    id: "amazon_fire_crisis",
    condition: (s) => s.civilLiberties < 55,
    probability: 0.3,
    durationTurns: 3,
    eventBuilder: () => ({
      type: "domestic",
      category: "environmental",
      title: "Major Amazon Fires",
      location: "Amazonas, Pará, Rondônia",
      description:
        "Satellite imagery shows massive Amazon fires. Indigenous communities are reporting displacement. International media coverage is intense.",
      context:
        "Weakened enforcement capacity has coincided with a sharp rise in illegal land-clearing activity across the Amazon basin.",
      severity: "critical",
      requiresResponse: true,
      responseOptions: [
        option(
          "Deploy federal firefighting forces and IBAMA enforcement",
          "Commit federal resources and environmental agents to contain the fires and prosecute illegal clearing.",
          { approval: 4, civilLiberties: 3, internationalPressure: -8, sovereignDebt: 1 },
          2,
          "Federal intervention brings the fires under control within weeks and earns cautious international praise."
        ),
        option(
          "Announce federal environmental protection package",
          "Unveil a legislative package strengthening protections without a large-scale deployment.",
          { approval: 2, internationalPressure: -5 },
          1,
          "The announcement signals intent, though observers note it does little to stop fires already burning."
        ),
        option(
          "Blame illegal loggers, promise investigation",
          "Publicly attribute the fires to criminal actors and pledge a formal inquiry.",
          { approval: -2, internationalPressure: 5 },
          0,
          "The deflection satisfies few — the fires continue burning while the investigation drags on."
        ),
        option(
          "Deny the severity of the crisis",
          "Dismiss international coverage as exaggerated and take no new action.",
          { approval: -6, internationalPressure: 15, civilLiberties: -3 },
          0,
          "The denial collides with satellite evidence and triggers a wave of international condemnation."
        ),
      ],
    }),
  },
  {
    id: "high_profile_favela_incident",
    condition: (s) => s.securityIndex < 50 && s.civilLiberties < 65,
    probability: 0.4,
    durationTurns: 2,
    eventBuilder: () => ({
      type: "domestic",
      category: "public_incident",
      title: "Civilian Casualties in Favela Operation",
      location: "Rio de Janeiro",
      description:
        "A federal police operation in Complexo do Alemão has resulted in the death of a nine-year-old girl caught in crossfire. Community leaders and human rights organisations are demanding accountability.",
      context:
        "Intensified security operations in contested territory have raised the risk of civilian harm, and this incident has become a national flashpoint.",
      severity: "high",
      requiresResponse: true,
      responseOptions: [
        option(
          "Order independent investigation and suspend involved officers",
          "Commission an outside inquiry and place the officers involved on administrative leave.",
          { approval: 3, civilLiberties: 5, militaryMorale: -4, securityIndex: -2 },
          1,
          "The investigation is welcomed by rights groups, though rank-and-file officers see it as abandonment."
        ),
        option(
          "Visit the family and offer state compensation",
          "Make a personal visit to the grieving family and announce a compensation fund.",
          { approval: 6, civilLiberties: 2, mediaSentiment: 5 },
          1,
          "The visit is widely covered and humanises the response, easing public anger without resolving the underlying tactics."
        ),
        option(
          "Defend the operation as necessary",
          "Publicly stand by the operation as a legitimate use of force against organised crime.",
          { approval: -3, civilLiberties: -6, militaryMorale: 3, internationalPressure: 8 },
          0,
          "Security forces feel vindicated, but the defiant tone inflames human rights criticism at home and abroad."
        ),
        option(
          "Remain silent",
          "Issue no public statement and let the security apparatus manage the fallout internally.",
          { approval: -5, civilLiberties: -3, mediaSentiment: -6 },
          0,
          "The silence is read as evasion, and the story dominates the news cycle for days longer than it might have."
        ),
      ],
    }),
  },
  {
    id: "northeast_drought",
    condition: () => true,
    probability: 0.15,
    durationTurns: 4,
    eventBuilder: () => ({
      type: "domestic",
      category: "natural_disaster",
      title: "Severe Drought in Semi-Arid Northeast",
      location: "Ceará, Rio Grande do Norte, Piauí, Bahia interior",
      description:
        "The worst drought in a decade is affecting eight million people. Water reserves are critical. Agricultural losses are mounting.",
      context:
        "Cyclical dry seasons in the sertão have combined with reduced reservoir investment to produce an unusually severe water crisis.",
      severity: "high",
      requiresResponse: true,
      responseOptions: [
        option(
          "Declare federal emergency and deploy resources",
          "Formally declare a state of emergency, unlocking federal water-truck and relief funding.",
          { approval: 5, sovereignDebt: 3, gdpGrowth: -0.2 },
          2,
          "Emergency relief reaches affected municipalities within days, easing the immediate humanitarian strain."
        ),
        option(
          "Launch long-term irrigation infrastructure programme",
          "Commit to a multi-year canal and reservoir expansion programme for the region.",
          { approval: 3, activeProjects: 1, sovereignDebt: 2 },
          2,
          "The infrastructure commitment is welcomed as a durable fix, though relief for this drought arrives slowly."
        ),
        option(
          "Coordinate with state governments only",
          "Leave primary response to state governments, offering federal coordination support.",
          { approval: -1, congressionalSupport: -1 },
          1,
          "State governments manage as best they can, but the patchwork response leaves gaps in the hardest-hit towns."
        ),
        option(
          "Ignore — states will manage",
          "Take no federal action and leave the drought response entirely to local authorities.",
          { approval: -5, congressionalSupport: -3 },
          0,
          "The absence of federal support becomes a rallying point for opposition governors in the region."
        ),
      ],
    }),
  },
  {
    id: "hospital_crisis",
    condition: (s) => s.publicInvestment < 2.5,
    probability: 0.35,
    durationTurns: 3,
    eventBuilder: () => ({
      type: "domestic",
      category: "health_crisis",
      title: "Public Hospital System on the Brink",
      location: "National — worst in Bahia and Maranhão",
      description:
        "Public hospitals are reporting critical shortages of staff, beds, and basic supplies. Emergency rooms are turning away non-critical patients.",
      context:
        "Years of underinvestment in the public health network have left SUS hospitals unable to absorb even routine demand surges.",
      severity: "high",
      requiresResponse: true,
      responseOptions: [
        option(
          "Emergency health funding package",
          "Direct emergency funds to the worst-affected public hospitals immediately.",
          { approval: 5, publicInvestment: 0.5, sovereignDebt: 2 },
          2,
          "The emergency funding stabilises the most critical wards, though systemic shortages persist elsewhere."
        ),
        option(
          "Announce long-term SUS reform plan",
          "Unveil a multi-year plan to rebuild public health capacity and staffing.",
          { approval: 2, congressionalSupport: 1 },
          1,
          "The reform plan is cautiously welcomed, but hospitals on the ground see no immediate relief."
        ),
        option(
          "Blame state mismanagement",
          "Publicly attribute the crisis to state-level administrative failures.",
          { approval: -2, congressionalSupport: -2 },
          0,
          "Governors reject the framing, and the public largely sides against a federal government seen as passing blame."
        ),
        option(
          "Take no action",
          "Make no policy response and let hospitals manage within existing budgets.",
          { approval: -5, mediaSentiment: -4 },
          0,
          "Understaffed wards continue turning away patients, and the story becomes a recurring media fixture."
        ),
      ],
    }),
  },
  {
    id: "congressional_scandal",
    condition: (s) => s.congressionalSupport > 70,
    probability: 0.25,
    durationTurns: 3,
    eventBuilder: () => ({
      type: "domestic",
      category: "political_event",
      title: "Coalition Vote-Buying Scandal",
      location: "Brasília",
      description:
        "Leaked recordings suggest senior coalition figures traded committee appointments for votes on your flagship legislation. The opposition is demanding a congressional inquiry.",
      context:
        "A comfortable governing majority has bred exactly the kind of backroom dealmaking now under scrutiny.",
      severity: "moderate",
      requiresResponse: true,
      responseOptions: [
        option(
          "Demand resignations and cooperate with inquiry",
          "Call for the implicated figures to step aside and fully cooperate with investigators.",
          { approval: 4, congressionalSupport: -6, mediaSentiment: 4 },
          1,
          "The clean-break posture earns public credit but visibly strains the governing coalition."
        ),
        option(
          "Order internal party investigation",
          "Handle the matter through party channels rather than a public inquiry.",
          { approval: -1, congressionalSupport: -2 },
          1,
          "The internal review satisfies few outside observers and does little to quiet the controversy."
        ),
        option(
          "Dismiss allegations as political attack",
          "Frame the leak as an opposition smear ahead of upcoming votes.",
          { approval: -3, congressionalSupport: -4, mediaSentiment: -5 },
          0,
          "The dismissal rings hollow once further details emerge, compounding the damage."
        ),
        option(
          "Say nothing publicly",
          "Let the coalition's own leadership manage the fallout without presidential comment.",
          { approval: -2, mediaSentiment: -3 },
          0,
          "The vacuum of leadership lets the story run unchecked through the news cycle."
        ),
      ],
    }),
  },
  {
    id: "currency_attack",
    condition: (s) => s.inflation > 8,
    probability: 0.3,
    durationTurns: 2,
    eventBuilder: () => ({
      type: "domestic",
      category: "economic_shock",
      title: "Speculative Attack on the Real",
      location: "National financial markets",
      description:
        "International currency traders are aggressively shorting the Real, betting inflation will force a disorderly devaluation. The Central Bank is burning through reserves to defend the currency.",
      context:
        "Persistently high inflation has eroded confidence in fiscal discipline, inviting speculative pressure on the exchange rate.",
      severity: "high",
      requiresResponse: true,
      responseOptions: [
        option(
          "Back the Central Bank's rate defence publicly",
          "Voice full support for aggressive interest-rate action to defend the currency.",
          { approval: -2, inflation: -0.8, gdpGrowth: -0.3 },
          1,
          "The show of support steadies markets, though the resulting rate hikes cool growth in the short term."
        ),
        option(
          "Announce fiscal austerity signal",
          "Commit publicly to near-term spending restraint to reassure markets.",
          { approval: -3, sovereignDebt: -2, congressionalSupport: -2 },
          1,
          "Markets respond well to the fiscal signal, but the austerity talk unsettles coalition partners."
        ),
        option(
          "Impose capital controls",
          "Restrict short-term capital outflows to blunt the speculative attack directly.",
          { approval: 1, internationalPressure: 6, fdiFlow: -1.5 },
          2,
          "Capital controls halt the immediate bleeding but spook longer-term investors."
        ),
        option(
          "Downplay the situation",
          "Publicly insist fundamentals are sound and no action is needed.",
          { approval: -4, inflation: 0.5, fdiFlow: -1.0 },
          0,
          "The reassurance fails to convince markets, and the currency slides further."
        ),
      ],
    }),
  },
  {
    id: "corruption_revelation",
    condition: () => true,
    probability: 0.12,
    durationTurns: 3,
    eventBuilder: () => ({
      type: "domestic",
      category: "political_event",
      title: "Federal Contract Kickback Scheme Exposed",
      location: "Brasília",
      description:
        "Federal Police investigators have uncovered a kickback scheme involving infrastructure contracts awarded by a ministry within your administration.",
      context:
        "A joint Federal Police and Comptroller General investigation has been running quietly for months before today's raids.",
      severity: "moderate",
      requiresResponse: true,
      responseOptions: [
        option(
          "Fire the implicated minister immediately",
          "Remove the minister from office the same day the allegations surface.",
          { approval: 5, congressionalSupport: -2, mediaSentiment: 4 },
          1,
          "The swift removal is read as decisive accountability, though it costs a key coalition ally."
        ),
        option(
          "Order full ANIP audit of the ministry",
          "Commission a comprehensive audit before taking personnel action.",
          { approval: 2, anipCases: 1 },
          1,
          "The measured response satisfies institutionalists, though critics wanted faster action."
        ),
        option(
          "Express confidence in the minister pending investigation",
          "Publicly back the minister while the investigation runs its course.",
          { approval: -4, mediaSentiment: -5 },
          0,
          "The show of support ages badly as further evidence emerges in subsequent weeks."
        ),
        option(
          "Decline to comment",
          "Avoid public statements while the investigation proceeds.",
          { approval: -2, mediaSentiment: -3 },
          0,
          "The silence is interpreted as evasive, keeping the story alive longer than a direct response would have."
        ),
      ],
    }),
  },
  {
    id: "major_industrial_accident",
    condition: () => true,
    probability: 0.1,
    durationTurns: 2,
    eventBuilder: () => ({
      type: "domestic",
      category: "public_incident",
      title: "Chemical Plant Explosion in Cubatão",
      location: "Cubatão, São Paulo",
      description:
        "An explosion at a petrochemical facility has killed at least twelve workers and forced the evacuation of nearby communities. Regulators are questioning safety oversight.",
      context:
        "The facility had a documented history of safety-inspection deferrals prior to the incident.",
      severity: "high",
      requiresResponse: true,
      responseOptions: [
        option(
          "Order nationwide industrial safety inspection sweep",
          "Direct federal regulators to conduct emergency inspections at comparable facilities nationwide.",
          { approval: 4, civilLiberties: 1, gdpGrowth: -0.1 },
          1,
          "The inspection sweep reassures the public, though industry groups warn of compliance costs."
        ),
        option(
          "Visit the site and meet affected families",
          "Travel to Cubatão to meet victims' families and survey the damage in person.",
          { approval: 5, mediaSentiment: 4 },
          1,
          "The visit is well received and demonstrates presidential attention to the tragedy."
        ),
        option(
          "Order investigation, defer to state regulators",
          "Call for an inquiry while leaving primary oversight authority with the state.",
          { approval: -1, congressionalSupport: -1 },
          0,
          "The deferral draws criticism that federal oversight of industrial safety is too weak."
        ),
        option(
          "Make no federal response",
          "Treat the explosion as a state and local matter with no federal statement.",
          { approval: -5, mediaSentiment: -5 },
          0,
          "The absence of a federal response becomes a story in itself, amplifying public anger."
        ),
      ],
    }),
  },
  {
    id: "student_protests",
    condition: (s) => s.approval < 45 && s.congressionalSupport < 50,
    probability: 0.3,
    durationTurns: 2,
    eventBuilder: () => ({
      type: "domestic",
      category: "social_unrest",
      title: "University Students Occupy Federal Buildings",
      location: "Brasília, Belo Horizonte, Porto Alegre",
      description:
        "Student federations have occupied federal university administration buildings, demanding reversal of proposed education budget cuts.",
      context:
        "Broader public dissatisfaction with the government has spilled into the education sector, where budget pressure has already strained public universities.",
      severity: "moderate",
      requiresResponse: true,
      responseOptions: [
        option(
          "Reverse the proposed education cuts",
          "Publicly commit to restoring the disputed education budget lines.",
          { approval: 4, congressionalSupport: -2, sovereignDebt: 1 },
          1,
          "The reversal defuses the occupation quickly but reopens fiscal negotiations with Congress."
        ),
        option(
          "Open dialogue with student federations",
          "Send the Education Minister to negotiate directly with occupation leaders.",
          { approval: 2, mediaSentiment: 2 },
          1,
          "Talks lower the temperature, though students hold firm on their core demands."
        ),
        option(
          "Order buildings cleared",
          "Direct federal police to clear the occupied buildings.",
          { approval: -5, civilLiberties: -4 },
          1,
          "The clearance ends the occupation but generates viral images of police confronting students."
        ),
        option(
          "Wait it out",
          "Take no action and let the occupation run its course.",
          { approval: -2, congressionalSupport: -1 },
          0,
          "The occupation drags on for weeks, becoming a recurring embarrassment."
        ),
      ],
    }),
  },
];

// ---------------------------------------------------------------------------
// B) Random event library — can fire regardless of state
// ---------------------------------------------------------------------------

export interface RandomEventSeed {
  title: string;
  type: "domestic" | "international";
  category: DomesticCategory | InternationalCategory;
  severity: WorldEvent["severity"];
  probability: number;
}

export const RANDOM_EVENTS: RandomEventSeed[] = [
  // Domestic
  { title: "High-Profile Corruption Arrest", type: "domestic", category: "political_event", severity: "moderate", probability: 0.15 },
  { title: "Major Industrial Accident", type: "domestic", category: "public_incident", severity: "high", probability: 0.08 },
  { title: "Celebrity Death Dominates News", type: "domestic", category: "public_incident", severity: "informational", probability: 0.1 },
  { title: "Tech Startup IPO Success", type: "domestic", category: "economic_shock", severity: "informational", probability: 0.12 },
  // International
  { title: "US Presidential Statement on Latin America", type: "international", category: "diplomatic_incident", severity: "moderate", probability: 0.15 },
  { title: "Argentine Economic Crisis Deepens", type: "international", category: "economic_shock", severity: "high", probability: 0.1 },
  { title: "Global Oil Price Spike", type: "international", category: "economic_shock", severity: "high", probability: 0.08 },
  { title: "Bolivian Political Instability", type: "international", category: "geopolitical_shift", severity: "moderate", probability: 0.1 },
  { title: "Chinese Trade Delegation Visit", type: "international", category: "trade_development", severity: "moderate", probability: 0.15 },
  { title: "European Election Results", type: "international", category: "foreign_election", severity: "informational", probability: 0.1 },
  { title: "UN Climate Summit Announcement", type: "international", category: "diplomatic_incident", severity: "moderate", probability: 0.08 },
];

// ---------------------------------------------------------------------------
// Planning — pure, synchronous. AI detail generation happens separately.
// ---------------------------------------------------------------------------

export function evaluateDeterministicEvents(
  state: GameState,
  turn: number
): WorldEvent[] {
  const events: WorldEvent[] = [];

  for (const def of DETERMINISTIC_EVENTS) {
    if (!def.condition(state)) continue;
    if (Math.random() >= def.probability) continue;

    const built = def.eventBuilder(state, turn);
    events.push({
      id: `wevent_${turn}_${def.id}`,
      ...built,
      startTurn: turn,
      expiresOnTurn: turn + def.durationTurns,
      brazilImpact: null,
      status: "active",
      playerResponse: null,
      resolvedOnTurn: null,
    });
  }

  return events;
}

/** Rolls the dice against the random-event library, returning any that triggered. */
export function rollRandomEventSeeds(): RandomEventSeed[] {
  return RANDOM_EVENTS.filter((seed) => Math.random() < seed.probability);
}

/** 30% chance per turn to also generate one entirely novel AI-authored event. */
export function shouldGenerateNovelEvent(): boolean {
  return Math.random() < 0.3;
}

export interface TurnEventPlan {
  deterministicEvents: WorldEvent[];
  randomSeeds: RandomEventSeed[];
  generateNovel: boolean;
}

/**
 * Plans this turn's events: deterministic triggers fire fully-formed (no AI
 * needed), random-library rolls produce seeds that still need AI detail, and
 * a novel-event flag. Padded/trimmed to land in the 3-6 events/turn range.
 */
export function planTurnEvents(state: GameState, turn: number): TurnEventPlan {
  const deterministicEvents = evaluateDeterministicEvents(state, turn);
  let randomSeeds = rollRandomEventSeeds();
  const generateNovel = shouldGenerateNovelEvent();

  let total = deterministicEvents.length + randomSeeds.length + (generateNovel ? 1 : 0);

  // Ensure at least 3 events/turn by force-adding unused random seeds.
  const unused = RANDOM_EVENTS.filter(
    (seed) => !randomSeeds.some((s) => s.title === seed.title)
  ).sort((a, b) => b.probability - a.probability);
  let i = 0;
  while (total < 3 && i < unused.length) {
    randomSeeds.push(unused[i]);
    total++;
    i++;
  }

  // Cap at 6 total by trimming random seeds first (deterministic/novel are more meaningful).
  const maxRandom = Math.max(0, 6 - deterministicEvents.length - (generateNovel ? 1 : 0));
  randomSeeds = randomSeeds.slice(0, maxRandom);

  return { deterministicEvents, randomSeeds, generateNovel };
}
