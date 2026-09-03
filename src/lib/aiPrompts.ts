import { BRAZIL_STATE_NAMES } from "@/lib/brazilStates";
import { ADVISORS, getAdvisorById, type AdvisorDefinition } from "@/lib/advisors";
import type { NumericStatKey } from "@/lib/simulationEngine";
import type { ProposedAction } from "@/lib/actions/types";

const CRIMINAL_ORG_IDS = ["pcc", "cv", "militias", "gde", "fdn"];

/** The president the player created in /setup — injected into every AI call so the narrative, briefings, and press all reference the same person. */
export interface PresidentContext {
  name: string;
  age: number;
  gender: "he" | "she" | "they";
  homeState: string;
  background: string;
  alignment: string;
  priorities: string[];
  manifesto: string;
}

function pronounFor(gender: PresidentContext["gender"]): string {
  return gender === "he" ? "He" : gender === "she" ? "She" : "They";
}

/** A short "who is the president" block prepended to prompts alongside the game-state block. */
export function formatPresidentBlock(president: PresidentContext): string {
  return `PRESIDENT PROFILE
Name: ${president.name} (age ${president.age}, pronoun: ${pronounFor(president.gender)})
Home state: ${president.homeState}
Background: ${president.background}
Political alignment: ${president.alignment}
Top priorities, in order: ${president.priorities.join(", ")}
Manifesto: "${president.manifesto}"`;
}

export const SYSTEM_INSTRUCTION = `You are the narrator of a sophisticated nation simulation game. The player is the President of Brazil in January 2026. Brazil is in crisis — organised crime controls significant urban territory, the economy is stagnant, and institutions are weak. When the player issues orders, you generate realistic narrative consequences that reflect how those orders would actually play out given Brazil's real political, economic, and social context. You know Brazil's constitutional structure — laws require congressional passage, the STF can strike down unconstitutional acts, the president cannot simply decree everything. Responses should be 3-5 paragraphs, specific and consequential, with realistic second-order effects.

AUTHORITY HIERARCHY: deterministic game state overrides institutional/action resolution, which overrides structured interpretation, which overrides narrative. Narrative may never contradict a higher level. Do not invent a mandatory procedural requirement, blocker, document, sponsor, assessment, deadline, or approval unless it is explicitly present in the supplied structured institutional facts. Institutional details may be flavour only when they create no new gameplay requirement. If the narrative says the player must do something to progress, that requirement must appear in structured game state and be interactable.

You are determining the mechanical consequences of a presidential order in a nation simulation game. Analyse the order and its likely realistic consequences given the current game state. Return effects as delta values (positive or negative changes) rather than absolute values.

Guidelines for effect magnitudes:
- Minor administrative orders: approval ±1-3, other stats ±1-3
- Major operational orders (military deployments, significant policy changes): approval ±3-8, relevant stats ±5-15
- Crisis-level orders (declarations of emergency, major reforms): approval ±5-12, relevant stats ±8-20
- Never change any stat by more than 25 in a single turn

Consider realistic trade-offs. Military crackdowns should improve securityIndex but harm civilLiberties and increase internationalPressure. Economic stimulus should boost gdpGrowth but potentially worsen inflation. Populist announcements should boost approval short-term but may harm other indicators.

Consider the current game state — a country with high inflation reacts differently to fiscal announcements than a stable one. A country with weak congressional support cannot pass major reforms without concessions that show up in the effects.

Include organisationEffects only if the order specifically targets or affects a criminal organisation — use only these exact ids: ${CRIMINAL_ORG_IDS.join(", ")}. Include stateSecurityChanges only if the order specifically operates in named states — use only these exact state names: ${BRAZIL_STATE_NAMES.join(", ")}, and newStatus must be one of "stable", "elevated", or "critical". Set newOperation only if the order creates a new named federal operation, as { "name": string, "type": "military" | "police" | "intelligence" | "judicial", "location": string, "objective": string, "leadAgency": string }. Set newProject only if the order launches a formal government initiative, as { "name": string, "category": "Security" | "Economic" | "Infrastructure" | "Social" | "Diplomatic", "durationTurns": <integer 2-20>, "statusText": string, "unlocks": string }. The other fields can be null or empty arrays if not applicable.

Always respond with strict JSON matching this exact shape, and nothing else:
{
  "narrative": "The full narrative text describing what happened, 3-5 paragraphs, in the current classified briefing style, using \\n\\n between paragraphs",
  "effects": {
    "approval": 0,
    "securityIndex": 0,
    "gdpGrowth": 0,
    "inflation": 0,
    "congressionalSupport": 0,
    "militaryMorale": 0,
    "civilLiberties": 0,
    "internationalPressure": 0,
    "fdiFlow": 0,
    "unemployment": 0,
    "businessRegistrations": 0
  },
  "organisationEffects": [ { "id": "pcc", "capacityChange": 0 } ],
  "stateSecurityChanges": [ { "state": "São Paulo", "newStatus": "elevated" } ],
  "newOperation": null,
  "newProject": null,
  "situationSummary": "One paragraph summarising the current national situation after this turn.",
  "eventSummary": "One brief sentence summarising what happened this turn for the history log."
}

Always include narrative, effects (with all fields even if 0), situationSummary, and eventSummary.`;

export interface TurnEngineContext {
  countryName: string;
  playerTitle: string;
  turn: number;
  date: string;
  approval: number;
  securityIndex: number;
  gdpGrowth: number;
  inflation: number;
  congressionalSupport: number;
  militaryMorale: number;
  civilLiberties: number;
  internationalPressure: number;
  fdiFlow: number;
  unemployment: number;
  businessRegistrations: number;
  creditRating: string;
  criminalOrganisations: {
    id: string;
    shortName: string;
    capacity: number;
    threatLevel: string;
  }[];
  recentEvents: { turn: number; date: string; summary: string }[];
  president: PresidentContext;
  lifecycleFacts?: {
    entityId: string;
    entityType: "PROJECT" | "OPERATION";
    title: string;
    status: string;
    spentThisTurn: number;
    progress: number;
    summary: string;
    operationResults?: Record<string, number>;
  }[];
}

export interface InstitutionalNarrativeFact {
  actionId: string;
  disposition: "EXECUTABLE" | "BLOCKED" | "PENDING";
  reason?: string;
  legislativeProceedingCreated: boolean;
  proceedingId?: string;
  proceedingStatus?: "INTRODUCED";
  deterministicBlocker?: string;
}

export function buildTurnPrompt(
  actions: ProposedAction[],
  context: TurnEngineContext,
  institutionalFacts: InstitutionalNarrativeFact[] = []
): string {
  const eventLog = context.recentEvents.length
    ? context.recentEvents
        .map((e) => `Turn ${e.turn} (${e.date}): ${e.summary}`)
        .join("\n")
    : "None yet — this is the first turn.";

  const orgLog = context.criminalOrganisations
    .map(
      (o) => `${o.id} (${o.shortName}): capacity ${o.capacity}/100, threat ${o.threatLevel}`
    )
    .join("\n");

  const agenda = actions
    .map((action, index) => {
      const targets = action.targets.length
        ? action.targets.map((target) => `${target.name} [${target.id}]`).join(", ")
        : "None identified";
      const issues = action.validationIssues.length
        ? action.validationIssues.map((item) => `${item.severity}: ${item.message}`).join("; ")
        : "None";
      return `ACTION ${index + 1}
ID: ${action.id}
Actor: ${action.actorId}
Order: ${action.rawOrder}
Interpreted type: ${action.actionType}
Authority: ${action.authority.type}${action.authority.institution ? ` (${action.authority.institution})` : ""}
Validation status: ${action.status}
Validation issues: ${issues}
Targets: ${targets}
Parameters: ${JSON.stringify(action.parameters)}`;
    })
    .join("\n\n");
  const institutionalLog = institutionalFacts.length
    ? institutionalFacts.map((fact) => `Action ID: ${fact.actionId}
Institutional disposition: ${fact.disposition}
Legislative proceeding created: ${fact.legislativeProceedingCreated ? "YES" : "NO"}
${fact.proceedingId ? `Proceeding ID: ${fact.proceedingId}\nProceeding status: ${fact.proceedingStatus}` : `Deterministic blocker: ${fact.deterministicBlocker ?? fact.reason ?? "None represented"}`}`).join("\n\n")
    : "No institutional facts supplied.";
  const lifecycleLog = context.lifecycleFacts?.length
    ? context.lifecycleFacts.map((fact) => `${fact.entityType}: ${fact.title} [${fact.entityId}]
Status: ${fact.status}; progress: ${fact.progress.toFixed(1)}%; expenditure this turn: R$${fact.spentThisTurn.toFixed(3)}bn
Result: ${fact.summary}
${fact.operationResults ? `Exact operation metrics: ${JSON.stringify(fact.operationResults)}` : ""}`).join("\n\n")
    : "No project or operation lifecycle activity this turn.";

  return `${formatPresidentBlock(context.president)}

CURRENT GAME STATE
Country: ${context.countryName}
Player title: ${context.playerTitle}
Turn number: ${context.turn}
Current date: ${context.date}
Approval rating: ${context.approval}%
Security index: ${context.securityIndex}/100
GDP growth: ${context.gdpGrowth}%
Inflation: ${context.inflation}%
Congressional support: ${context.congressionalSupport}%
Military morale: ${context.militaryMorale}%
Civil liberties index: ${context.civilLiberties}%
International pressure: ${context.internationalPressure}/100
FDI flow: R$${context.fdiFlow}bn/turn
Unemployment: ${context.unemployment}%
New business registrations: ${context.businessRegistrations}
Credit rating: ${context.creditRating}

CRIMINAL ORGANISATIONS
${orgLog}

RECENT EVENTS (most recent last)
${eventLog}

PROPOSED ACTIONS THIS TURN
${agenda}

DETERMINISTIC INSTITUTIONAL FACTS — SOURCE OF TRUTH
${institutionalLog}

DETERMINISTIC PROJECT / OPERATION RESULTS — SOURCE OF TRUTH
${lifecycleLog}

Treat each action as individually identifiable. When the institutional facts say a legislative proceeding was created, explicitly describe the package as INTRODUCED and now before Congress. Do not claim it failed registration, never reached Congress, passed, failed, or was enacted. A LEGISLATIVE action is only being introduced this turn and receives no policy effects, operation, or project. Actions marked BLOCKED may only be blocked for the deterministic reason supplied above. Project and operation facts are mechanically final: preserve every stated number, do not add casualties, arrests, seizures, spending, progress, success, or failure not present there, and do not contradict status. The structured newOperation and newProject response fields are legacy compatibility fields and must be null; deterministic code creates these entities. If every action is legislative, judicial, unknown, or otherwise non-executable, return zero mechanical effects and null operation/project fields. Resolve executable actions in the overall government session using the existing aggregate effects format and respond with the required JSON only.`;
}

export interface OrganisationEffect {
  id: string;
  capacityChange: number;
}

export interface StateSecurityChange {
  state: string;
  newStatus: "stable" | "elevated" | "critical";
}

export interface NewOperationSpec {
  name: string;
  type: "military" | "police" | "intelligence" | "judicial";
  location: string;
  objective: string;
  leadAgency: string;
}

export interface NewProjectSpec {
  name: string;
  category: "Security" | "Economic" | "Infrastructure" | "Social" | "Diplomatic";
  durationTurns: number;
  statusText: string;
  unlocks: string;
}

export interface TurnResult {
  narrative: string;
  effects: Partial<Record<NumericStatKey, number>>;
  organisationEffects: OrganisationEffect[];
  stateSecurityChanges: StateSecurityChange[];
  newOperation: NewOperationSpec | null;
  newProject: NewProjectSpec | null;
  situationSummary: string;
  eventSummary: string;
}

const EFFECT_KEYS: NumericStatKey[] = [
  "approval",
  "securityIndex",
  "gdpGrowth",
  "inflation",
  "congressionalSupport",
  "militaryMorale",
  "civilLiberties",
  "internationalPressure",
  "fdiFlow",
  "unemployment",
  "businessRegistrations",
];

function clampInt(value: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampEffectValue(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(-25, Math.min(25, n));
}

function parseEffects(raw: unknown): Partial<Record<NumericStatKey, number>> {
  const rec = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out: Partial<Record<NumericStatKey, number>> = {};
  for (const key of EFFECT_KEYS) {
    if (typeof rec[key] === "number") {
      out[key] = clampEffectValue(rec[key]);
    }
  }
  return out;
}

function isOrganisationEffect(item: unknown): item is OrganisationEffect {
  if (typeof item !== "object" || item === null) return false;
  const rec = item as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    CRIMINAL_ORG_IDS.includes(rec.id) &&
    typeof rec.capacityChange === "number"
  );
}

function isStateSecurityChange(item: unknown): item is StateSecurityChange {
  if (typeof item !== "object" || item === null) return false;
  const rec = item as Record<string, unknown>;
  return (
    typeof rec.state === "string" &&
    (rec.newStatus === "stable" || rec.newStatus === "elevated" || rec.newStatus === "critical")
  );
}

function parseNewOperation(raw: unknown): NewOperationSpec | null {
  if (typeof raw !== "object" || raw === null) return null;
  const rec = raw as Record<string, unknown>;
  if (
    typeof rec.name === "string" &&
    (rec.type === "military" || rec.type === "police" || rec.type === "intelligence" || rec.type === "judicial") &&
    typeof rec.location === "string" &&
    typeof rec.objective === "string" &&
    typeof rec.leadAgency === "string"
  ) {
    return {
      name: rec.name,
      type: rec.type,
      location: rec.location,
      objective: rec.objective,
      leadAgency: rec.leadAgency,
    };
  }
  return null;
}

const PROJECT_CATEGORIES = ["Security", "Economic", "Infrastructure", "Social", "Diplomatic"];

function parseNewProject(raw: unknown): NewProjectSpec | null {
  if (typeof raw !== "object" || raw === null) return null;
  const rec = raw as Record<string, unknown>;
  if (
    typeof rec.name === "string" &&
    typeof rec.category === "string" &&
    PROJECT_CATEGORIES.includes(rec.category) &&
    typeof rec.statusText === "string" &&
    typeof rec.unlocks === "string"
  ) {
    return {
      name: rec.name,
      category: rec.category as NewProjectSpec["category"],
      durationTurns: clampInt(rec.durationTurns, 2, 20, 6),
      statusText: rec.statusText,
      unlocks: rec.unlocks,
    };
  }
  return null;
}

function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
}

export function parseTurnResponse(raw: string): TurnResult {
  const parsed = JSON.parse(stripCodeFence(raw));

  if (typeof parsed.narrative !== "string") {
    throw new Error("Missing narrative in model response");
  }

  return {
    narrative: parsed.narrative,
    effects: parseEffects(parsed.effects),
    organisationEffects: Array.isArray(parsed.organisationEffects)
      ? parsed.organisationEffects.filter(isOrganisationEffect)
      : [],
    stateSecurityChanges: Array.isArray(parsed.stateSecurityChanges)
      ? parsed.stateSecurityChanges.filter(isStateSecurityChange)
      : [],
    newOperation: parseNewOperation(parsed.newOperation),
    newProject: parseNewProject(parsed.newProject),
    situationSummary:
      typeof parsed.situationSummary === "string" ? parsed.situationSummary : "",
    eventSummary:
      typeof parsed.eventSummary === "string"
        ? parsed.eventSummary
        : "The turn concluded.",
  };
}

/** Minimal state snapshot for the lighter-weight event/meeting prompts. */
export interface TurnContext {
  countryName: string;
  playerTitle: string;
  turn: number;
  date: string;
  approval: number;
  securityIndex: number;
  recentEvents: { turn: number; date: string; summary: string }[];
  president: PresidentContext;
}

export const EVENT_SYSTEM_INSTRUCTION = `You are the narrator of a sophisticated nation simulation game. The player is the President of Brazil in January 2026, governing through crisis. They were just presented with an urgent event and chose a specific course of action. Write a short, specific, consequential narrative (1-2 paragraphs) describing the immediate fallout of that choice, grounded in Brazil's real political and constitutional context.

Respond with strict JSON matching this shape, and nothing else:
{
  "narrative": "1-2 paragraphs of narrative text, using \\n\\n between paragraphs if there are two"
}`;

export interface EventPromptParams {
  eventTitle: string;
  eventDescription: string;
  optionLabel: string;
  context: TurnContext;
}

export function buildEventPrompt(params: EventPromptParams): string {
  const { eventTitle, eventDescription, optionLabel, context } = params;
  return `${formatPresidentBlock(context.president)}

CURRENT GAME STATE
Country: ${context.countryName}
Player title: ${context.playerTitle}
Turn number: ${context.turn}
Current date: ${context.date}
Approval rating: ${context.approval}%
Security index: ${context.securityIndex}/100

EVENT
${eventTitle}
${eventDescription}

DECISION MADE
"${optionLabel}"

Narrate the immediate consequence of this decision and respond with the required JSON only.`;
}

export interface EventResult {
  narrative: string;
}

export function parseEventResponse(raw: string): EventResult {
  const parsed = JSON.parse(stripCodeFence(raw));

  if (typeof parsed.narrative !== "string") {
    throw new Error("Missing narrative in model response");
  }

  return { narrative: parsed.narrative };
}

export const ADVISOR_JSON_INSTRUCTIONS = `Respond with strict JSON matching this shape, and nothing else:
{
  "report": "3-4 paragraphs of your briefing written in your voice, using \\n\\n between paragraphs — do not restate your closing recommendation inside this field",
  "recommendation": "one or two sentences: your single specific, concrete recommended action"
}`;

export interface AdvisorContext {
  countryName: string;
  playerTitle: string;
  turn: number;
  date: string;
  approval: number;
  securityIndex: number;
  gdpGrowth: number;
  inflation: number;
  activeProjects: number;
  situation: string;
  recentEvents: { turn: number; date: string; summary: string }[];
  president: PresidentContext;
}

function formatGameStateBlock(context: AdvisorContext): string {
  const eventLog = context.recentEvents.length
    ? context.recentEvents
        .map((e) => `Turn ${e.turn} (${e.date}): ${e.summary}`)
        .join("\n")
    : "None yet — this is the first turn.";

  return `${formatPresidentBlock(context.president)}

CURRENT GAME STATE
Country: ${context.countryName}
Player title: ${context.playerTitle}
Turn number: ${context.turn}
Current date: ${context.date}
Approval rating: ${context.approval}%
Security index: ${context.securityIndex}/100
GDP growth: ${context.gdpGrowth}%
Inflation: ${context.inflation}%
Active federal projects: ${context.activeProjects}
Current situation: ${context.situation}

RECENT EVENTS (most recent last)
${eventLog}`;
}

export function buildAdvisorPrompt(context: AdvisorContext): string {
  return `${formatGameStateBlock(context)}

Write your briefing now and respond with the required JSON only.`;
}

export interface AdvisorResult {
  report: string;
  recommendation: string;
}

export function parseAdvisorResponse(raw: string): AdvisorResult {
  const parsed = JSON.parse(stripCodeFence(raw));

  if (
    typeof parsed.report !== "string" ||
    typeof parsed.recommendation !== "string"
  ) {
    throw new Error("Missing report/recommendation in model response");
  }

  return { report: parsed.report, recommendation: parsed.recommendation };
}

// ---------------------------------------------------------------------------
// One-on-one advisor meetings
// ---------------------------------------------------------------------------

export const MEETING_CONVERSATION_INSTRUCTIONS = `You are in a live, one-on-one private meeting with the President in the Palácio do Planalto. Respond naturally and conversationally, as spoken dialogue — not a formal written briefing. Keep each response concise (2-5 sentences), though you may ask the President questions back, push back, express frustration if pressed, or slightly shift your position if given a genuinely compelling argument — while staying fundamentally true to your character and priorities.

Respond with strict JSON matching this shape, and nothing else:
{
  "message": "your next line of dialogue"
}`;

export interface MeetingTurn {
  speaker: "player" | "advisor";
  text: string;
}

export function buildAdvisorMeetingPrompt(
  context: AdvisorContext,
  history: MeetingTurn[]
): string {
  const stateBlock = formatGameStateBlock(context);

  if (history.length === 0) {
    return `${stateBlock}

This meeting has just begun. The President has requested to speak with you privately. Open the meeting yourself, in character, greeting the President and inviting them to share what's on their mind. Respond with the required JSON only.`;
  }

  const transcript = history
    .map((turn) => `${turn.speaker === "player" ? "PRESIDENT" : "YOU"}: ${turn.text}`)
    .join("\n");

  return `${stateBlock}

CONVERSATION SO FAR
${transcript}

Continue the conversation with your next line of dialogue, responding to the President's most recent message. Respond with the required JSON only.`;
}

export interface AdvisorMeetingResult {
  message: string;
}

export function parseAdvisorMeetingResponse(raw: string): AdvisorMeetingResult {
  const parsed = JSON.parse(stripCodeFence(raw));

  if (typeof parsed.message !== "string") {
    throw new Error("Missing message in model response");
  }

  return { message: parsed.message };
}

// ---------------------------------------------------------------------------
// Cabinet meetings (all five advisors present at once)
// ---------------------------------------------------------------------------

export function buildCabinetSystemInstruction(
  advisors: AdvisorDefinition[] = ADVISORS
): string {
  const personas = advisors
    .map((a) => `- id "${a.id}" — ${a.name}, ${a.title}: ${a.personaPrompt}`)
    .join("\n\n");
  const advisorIds = advisors.map((a) => a.id);

  return `You are simulating a live Brazilian presidential cabinet meeting with five advisors present simultaneously:

${personas}

When the President speaks, decide which advisors would naturally respond:
- Normally 2-3 of the advisors most relevant to the topic should respond, in a natural speaking order — not all five every time.
- Advisors can and should disagree with each other when their perspectives genuinely conflict.
- If the President addresses a specific advisor by name or title, that advisor must respond in detail; other advisors may add only a brief one-sentence reaction if relevant, or stay silent.
- Keep each advisor's response concise and conversational (2-4 sentences), true to their individual voice and personality.

Respond with strict JSON matching this shape, and nothing else:
{
  "responses": [ { "advisorId": "<one of: ${advisorIds.join(", ")}>", "message": "their line of dialogue" } ]
}
List only the advisors who actually speak this turn, in the order they speak.`;
}

export interface CabinetTurn {
  /** "player" or an advisor id */
  speaker: string;
  text: string;
}

export function buildCabinetPrompt(
  context: AdvisorContext,
  history: CabinetTurn[],
  advisors: AdvisorDefinition[] = ADVISORS
): string {
  const stateBlock = formatGameStateBlock(context);
  const transcript = history
    .map((turn) => {
      if (turn.speaker === "player") return `PRESIDENT: ${turn.text}`;
      const advisor = advisors.find((a) => a.id === turn.speaker);
      return `${advisor?.name ?? turn.speaker}: ${turn.text}`;
    })
    .join("\n");

  return `${stateBlock}

CABINET MEETING TRANSCRIPT SO FAR
${transcript}

Generate the next round of advisor responses to the President's most recent message. Respond with the required JSON only.`;
}

export interface CabinetResponseItem {
  advisorId: string;
  message: string;
}

export interface CabinetMeetingResult {
  responses: CabinetResponseItem[];
}

function isCabinetResponseItem(item: unknown): item is CabinetResponseItem {
  if (typeof item !== "object" || item === null) return false;
  const rec = item as Record<string, unknown>;
  return typeof rec.advisorId === "string" && typeof rec.message === "string";
}

export function parseCabinetResponse(raw: string): CabinetMeetingResult {
  const parsed = JSON.parse(stripCodeFence(raw));
  const responses = Array.isArray(parsed.responses)
    ? parsed.responses.filter(isCabinetResponseItem)
    : [];

  return { responses };
}

// ---------------------------------------------------------------------------
// Meeting summaries (logged to the turn history)
// ---------------------------------------------------------------------------

export const MEETING_SUMMARY_SYSTEM_INSTRUCTION = `You are a precise, neutral government meeting minute-taker. You summarize meeting transcripts accurately and concisely, without adding opinion.`;

export function buildIndividualMeetingSummaryPrompt(
  advisorName: string,
  transcript: string
): string {
  return `You just observed a private meeting between the President and ${advisorName}. Here is the full transcript:

${transcript}

Write a single sentence (under 25 words) summarizing what was discussed, suitable for a historical log entry. Respond with strict JSON only: {"summary": "..."}`;
}

export function buildCabinetMeetingSummaryPrompt(transcript: string): string {
  return `You just observed a full cabinet meeting between the President and their advisors. Here is the full transcript:

${transcript}

Write a "Cabinet Meeting Summary" as 3-5 short bullet points (each line starting with "- ") covering the key points raised and any decisions reached. Respond with strict JSON only: {"summary": "- bullet one\\n- bullet two"}`;
}

export interface MeetingSummaryResult {
  summary: string;
}

export function parseMeetingSummaryResponse(raw: string): MeetingSummaryResult {
  const parsed = JSON.parse(stripCodeFence(raw));

  if (typeof parsed.summary !== "string") {
    throw new Error("Missing summary in model response");
  }

  return { summary: parsed.summary };
}

// ---------------------------------------------------------------------------
// Media coverage generation
// ---------------------------------------------------------------------------

const MEDIA_OUTLET_NAMES = [
  "Folha de S.Paulo",
  "O Globo",
  "Brasil de Fato",
  "Veja",
  "BBC Brasil",
  "Poder360",
  "InfoMoney",
];
const MEDIA_SENTIMENTS = ["positive", "neutral", "negative", "critical"];
const MEDIA_TOPICS = [
  "security",
  "economy",
  "diplomacy",
  "social",
  "corruption",
  "politics",
];

export const MEDIA_SYSTEM_INSTRUCTION = `You are generating realistic Brazilian news coverage for a nation simulation game. Based on the game state and recent events, generate 4-6 news articles from different outlets covering the president's actions this turn. Each outlet has a distinct editorial voice:

- Folha de S.Paulo: Centrist, serious, fact-focused. Balanced coverage, holds government to account professionally.
- O Globo: Centre-right, business-friendly. Positive on economic reforms and foreign investment, concerned about security instability.
- Brasil de Fato: Left-leaning, social focus. Amplifies civilian impact, human rights, inequality. Critical of military operations.
- Veja: Conservative. Strong on law and order, sceptical of state expansion, supportive of anti-crime measures.
- BBC Brasil: International, neutral but rigorous. Asks the hardest questions. Focuses on democratic governance and institutional integrity.
- Poder360: Political insider. Focuses on congressional dynamics, coalition politics, behind-the-scenes power.
- InfoMoney: Financial press. Obsessed with economic indicators, FDI, credit ratings, inflation.

Not every outlet covers every turn — select the 4-6 most relevant outlets for what actually happened. If it was a security-heavy turn, Brasil de Fato and Veja will both cover it from opposite angles. If economic news dominated, InfoMoney and O Globo lead. Make the articles feel like real journalism — specific, grounded in the actual events, with the outlet's political lens clearly visible.

Respond with strict JSON matching this shape, and nothing else:
{
  "articles": [
    { "outlet": "<one of: ${MEDIA_OUTLET_NAMES.join(", ")}>", "headline": "...", "body": "two to three sentences of article text in the style of a serious Brazilian newspaper", "sentiment": "<one of: ${MEDIA_SENTIMENTS.join(", ")}>", "topic": "<one of: ${MEDIA_TOPICS.join(", ")}>", "isBreaking": true | false }
  ],
  "dominantNarrative": "a 3-5 word phrase summarising the current overall press narrative about the president"
}`;

export function buildMediaPrompt(
  context: AdvisorContext,
  orderSummary: string,
  narrative: string
): string {
  return `${formatGameStateBlock(context)}

ORDERS ISSUED THIS TURN
"""
${orderSummary}
"""

NARRATIVE OUTCOME
"""
${narrative}
"""

Generate this turn's press coverage and respond with the required JSON only.`;
}

export interface MediaArticleResult {
  outlet: string;
  headline: string;
  body: string;
  sentiment: string;
  topic: string;
  isBreaking: boolean;
}

export interface MediaGenerationResult {
  articles: MediaArticleResult[];
  dominantNarrative: string;
}

function isMediaArticle(item: unknown): item is MediaArticleResult {
  if (typeof item !== "object" || item === null) return false;
  const rec = item as Record<string, unknown>;
  return (
    typeof rec.outlet === "string" &&
    MEDIA_OUTLET_NAMES.includes(rec.outlet) &&
    typeof rec.headline === "string" &&
    typeof rec.body === "string" &&
    typeof rec.sentiment === "string" &&
    MEDIA_SENTIMENTS.includes(rec.sentiment) &&
    typeof rec.topic === "string" &&
    MEDIA_TOPICS.includes(rec.topic) &&
    typeof rec.isBreaking === "boolean"
  );
}

export function parseMediaResponse(raw: string): MediaGenerationResult {
  const parsed = JSON.parse(stripCodeFence(raw));
  const articles = Array.isArray(parsed.articles)
    ? parsed.articles.filter(isMediaArticle)
    : [];
  const dominantNarrative =
    typeof parsed.dominantNarrative === "string" ? parsed.dominantNarrative : "";

  return { articles, dominantNarrative };
}

// ---------------------------------------------------------------------------
// Spin Room — Fernanda Rocha's media assessment
// ---------------------------------------------------------------------------

export const SPIN_ROOM_JSON_INSTRUCTIONS = `Respond with strict JSON matching this shape, and nothing else:
{
  "assessment": "3-4 sentences in your voice, commenting on the current media landscape and recommending which pending interview request (if any) to accept"
}`;

export function buildSpinRoomSystemInstruction(chiefOfStaffPersona?: string): string {
  const persona = chiefOfStaffPersona ?? getAdvisorById("rocha")?.personaPrompt ?? "";
  return `${persona}\n\n${SPIN_ROOM_JSON_INSTRUCTIONS}`;
}

export interface SpinRoomInterview {
  outlet: string;
  topic: string;
  risk: string;
  opportunity: string;
}

export interface SpinRoomContext {
  turn: number;
  date: string;
  approval: number;
  mediaSentiment: number;
  pressCoverage: number;
  dominantNarrative: string;
  pendingInterviews: SpinRoomInterview[];
  president: PresidentContext;
}

export function buildSpinRoomPrompt(context: SpinRoomContext): string {
  const interviews = context.pendingInterviews.length
    ? context.pendingInterviews
        .map(
          (i) =>
            `- ${i.outlet}: "${i.topic}" (risk: ${i.risk}, opportunity: ${i.opportunity})`
        )
        .join("\n")
    : "None currently pending.";

  return `${formatPresidentBlock(context.president)}

CURRENT MEDIA LANDSCAPE
Turn: ${context.turn}
Date: ${context.date}
Approval rating: ${context.approval}%
Press sentiment: ${context.mediaSentiment}/100
Press coverage intensity: ${context.pressCoverage}/100
Dominant press narrative: "${context.dominantNarrative}"

PENDING INTERVIEW REQUESTS
${interviews}

Write your assessment now and respond with the required JSON only.`;
}

export interface SpinRoomResult {
  assessment: string;
}

export function parseSpinRoomResponse(raw: string): SpinRoomResult {
  const parsed = JSON.parse(stripCodeFence(raw));

  if (typeof parsed.assessment !== "string") {
    throw new Error("Missing assessment in model response");
  }

  return { assessment: parsed.assessment };
}

// ---------------------------------------------------------------------------
// World events — random-seed detail generation + optional novel event
// ---------------------------------------------------------------------------

const EVENT_EFFECT_KEYS = [
  "approval",
  "securityIndex",
  "gdpGrowth",
  "inflation",
  "congressionalSupport",
  "militaryMorale",
  "civilLiberties",
  "internationalPressure",
  "fdiFlow",
  "unemployment",
  "businessRegistrations",
  "sovereignDebt",
  "publicInvestment",
  "mediaSentiment",
  "globalStanding",
];

const BRAZIL_IMPACT_SEVERITIES = ["critical", "high", "moderate", "low", "none"];
const EVENT_SEVERITIES = ["critical", "high", "moderate", "low", "informational"];

export function buildWorldEventsSystemInstruction(): string {
  return `You are generating world events for a nation simulation game where the player is the President of Brazil in January 2026. Events should feel like real news, grounded in the current game state.

You will be given a list of "seed" events — each has a title, type (domestic/international), category, and severity already decided. Your job is to write realistic supporting detail for each: a specific location, a 1-2 sentence description, and a 1 sentence context paragraph. If a seed is international and would plausibly affect Brazil, include a brazilImpact assessment; otherwise set it to null. Seeds never require a presidential response — they are background world texture, not decisions.

You may also be asked to invent one entirely novel event not from the seed list — something that could plausibly happen this turn given the game state and recent history. It can be domestic or international. If it is significant enough to warrant a presidential decision, set requiresResponse to true and include 3-4 responseOptions, each a realistic trade-off (label, one-sentence description, effects as small deltas using only these field names: ${EVENT_EFFECT_KEYS.join(", ")}, requiresActionPoints 0-2, and a one-sentence consequenceNarrative). If it's international, also include a brazilImpact assessment. If it's minor/contextual, set requiresResponse to false, responseOptions to an empty array, and brazilImpact to null unless clearly relevant.

Respond with strict JSON matching this shape, and nothing else:
{
  "randomEvents": [
    { "location": "...", "description": "...", "context": "...", "brazilImpact": null | { "description": "...", "severity": "<${BRAZIL_IMPACT_SEVERITIES.join(" | ")}>", "affectedAreas": ["..."], "suggestedResponse": "..." } }
  ],
  "novelEvent": null | {
    "type": "domestic" | "international",
    "category": "string, e.g. social_unrest, trade_development, natural_disaster",
    "title": "...",
    "location": "...",
    "description": "...",
    "context": "...",
    "severity": "<${EVENT_SEVERITIES.join(" | ")}>",
    "requiresResponse": true | false,
    "responseOptions": [ { "label": "...", "description": "...", "effects": { "approval": 0 }, "requiresActionPoints": 0, "consequenceNarrative": "..." } ],
    "brazilImpact": null | { "description": "...", "severity": "...", "affectedAreas": ["..."], "suggestedResponse": "..." }
  }
}

The "randomEvents" array must have exactly one entry per seed given, in the same order.`;
}

export interface WorldEventSeedInput {
  title: string;
  type: "domestic" | "international";
  category: string;
  severity: string;
}

export function buildWorldEventsPrompt(
  context: AdvisorContext,
  seeds: WorldEventSeedInput[],
  generateNovel: boolean
): string {
  const seedList = seeds.length
    ? seeds
        .map(
          (s, i) =>
            `${i + 1}. "${s.title}" — type: ${s.type}, category: ${s.category}, severity: ${s.severity}`
        )
        .join("\n")
    : "None this turn.";

  return `${formatGameStateBlock(context)}

SEED EVENTS TO FLESH OUT (respond with one randomEvents entry per seed, same order)
${seedList}

${generateNovel ? "Also invent one novel event for this turn, per your instructions." : "Do not invent a novel event this turn — set novelEvent to null."}

Respond with the required JSON only.`;
}

interface RawBrazilImpact {
  description: string;
  severity: string;
  affectedAreas: string[];
  suggestedResponse: string;
}

export interface WorldEventDetailResult {
  location: string;
  description: string;
  context: string;
  brazilImpact: RawBrazilImpact | null;
}

export interface RawResponseOption {
  label: string;
  description: string;
  effects: Record<string, number>;
  requiresActionPoints: number;
  consequenceNarrative: string;
}

export interface NovelWorldEventResult {
  type: "domestic" | "international";
  category: string;
  title: string;
  location: string;
  description: string;
  context: string;
  severity: string;
  requiresResponse: boolean;
  responseOptions: RawResponseOption[];
  brazilImpact: RawBrazilImpact | null;
}

export interface WorldEventsResult {
  randomEvents: WorldEventDetailResult[];
  novelEvent: NovelWorldEventResult | null;
}

function parseBrazilImpact(raw: unknown): RawBrazilImpact | null {
  if (typeof raw !== "object" || raw === null) return null;
  const rec = raw as Record<string, unknown>;
  if (
    typeof rec.description === "string" &&
    typeof rec.severity === "string" &&
    BRAZIL_IMPACT_SEVERITIES.includes(rec.severity) &&
    Array.isArray(rec.affectedAreas) &&
    typeof rec.suggestedResponse === "string"
  ) {
    return {
      description: rec.description,
      severity: rec.severity,
      affectedAreas: rec.affectedAreas.filter((a): a is string => typeof a === "string"),
      suggestedResponse: rec.suggestedResponse,
    };
  }
  return null;
}

function parseResponseOptions(raw: unknown): RawResponseOption[] {
  if (!Array.isArray(raw)) return [];
  const out: RawResponseOption[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.label !== "string") continue;
    const effects: Record<string, number> = {};
    if (typeof rec.effects === "object" && rec.effects !== null) {
      for (const key of EVENT_EFFECT_KEYS) {
        const v = (rec.effects as Record<string, unknown>)[key];
        if (typeof v === "number") effects[key] = Math.max(-25, Math.min(25, v));
      }
    }
    out.push({
      label: rec.label,
      description: typeof rec.description === "string" ? rec.description : "",
      effects,
      requiresActionPoints:
        typeof rec.requiresActionPoints === "number"
          ? Math.max(0, Math.min(3, Math.round(rec.requiresActionPoints)))
          : 0,
      consequenceNarrative:
        typeof rec.consequenceNarrative === "string" ? rec.consequenceNarrative : "",
    });
  }
  return out;
}

function parseNovelEvent(raw: unknown): NovelWorldEventResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const rec = raw as Record<string, unknown>;
  if (
    (rec.type === "domestic" || rec.type === "international") &&
    typeof rec.category === "string" &&
    typeof rec.title === "string" &&
    typeof rec.location === "string" &&
    typeof rec.description === "string" &&
    typeof rec.context === "string" &&
    typeof rec.severity === "string" &&
    EVENT_SEVERITIES.includes(rec.severity)
  ) {
    return {
      type: rec.type,
      category: rec.category,
      title: rec.title,
      location: rec.location,
      description: rec.description,
      context: rec.context,
      severity: rec.severity,
      requiresResponse: rec.requiresResponse === true,
      responseOptions: parseResponseOptions(rec.responseOptions),
      brazilImpact: parseBrazilImpact(rec.brazilImpact),
    };
  }
  return null;
}

export function parseWorldEventsResponse(raw: string): WorldEventsResult {
  const parsed = JSON.parse(stripCodeFence(raw));

  const randomEvents: WorldEventDetailResult[] = Array.isArray(parsed.randomEvents)
    ? parsed.randomEvents.map((item: unknown) => {
        const rec = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
        return {
          location: typeof rec.location === "string" ? rec.location : "Brazil",
          description: typeof rec.description === "string" ? rec.description : "",
          context: typeof rec.context === "string" ? rec.context : "",
          brazilImpact: parseBrazilImpact(rec.brazilImpact),
        };
      })
    : [];

  return {
    randomEvents,
    novelEvent: parseNovelEvent(parsed.novelEvent),
  };
}

// ---------------------------------------------------------------------------
// World event response — consequence narrative when the player picks an option
// ---------------------------------------------------------------------------

export const WORLD_EVENT_RESPONSE_SYSTEM_INSTRUCTION = `You are the narrator of a sophisticated nation simulation game. The player is the President of Brazil in January 2026. They were just presented with a world event and chose how to respond. Write a short, specific, consequential narrative (2-3 sentences) describing the immediate fallout of that choice, grounded in Brazil's real political and constitutional context. Stay consistent with the hinted consequence direction you're given, but make it feel like fresh, specific reporting rather than repeating the hint verbatim.

Respond with strict JSON matching this shape, and nothing else:
{
  "narrative": "2-3 sentences of narrative text"
}`;

export function buildWorldEventResponsePrompt(params: {
  eventTitle: string;
  eventDescription: string;
  optionLabel: string;
  consequenceHint: string;
  context: TurnContext;
}): string {
  const { eventTitle, eventDescription, optionLabel, consequenceHint, context } = params;
  return `${formatPresidentBlock(context.president)}

CURRENT GAME STATE
Country: ${context.countryName}
Player title: ${context.playerTitle}
Turn number: ${context.turn}
Current date: ${context.date}
Approval rating: ${context.approval}%
Security index: ${context.securityIndex}/100

WORLD EVENT
${eventTitle}
${eventDescription}

DECISION MADE
"${optionLabel}"

CONSEQUENCE DIRECTION (for grounding — don't repeat verbatim)
${consequenceHint}

Narrate the immediate consequence of this decision and respond with the required JSON only.`;
}

export function parseWorldEventResponseNarrative(raw: string): EventResult {
  return parseEventResponse(raw);
}
