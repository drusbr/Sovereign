import type { EventFact } from "@/lib/eventFacts";
import type { GameState, InterviewRequest, NewsArticle } from "@/lib/gameState";

export type EncounterType = "MEDIA_INTERVIEW" | "PRESS_CONFERENCE" | "DIPLOMATIC_MEETING" | "STATE_VISIT" | "INTERNATIONAL_SUMMIT" | "CABINET_MEETING" | "CRISIS_MEETING" | "POLITICAL_NEGOTIATION";
export type EncounterStatus = "AVAILABLE" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "DECLINED" | "EXPIRED" | "CANCELLED";
export type ResponseStance = "DEFEND" | "ACKNOWLEDGE" | "MODERATE" | "CHALLENGE";
export type ResponseTone = "MEASURED" | "ASSERTIVE" | "EMPATHETIC" | "CONFRONTATIONAL";
export type AssessmentConfidence = "LOW" | "MODERATE" | "HIGH";

export interface EncounterParticipant { id: string; type: "PRESIDENT" | "JOURNALIST" | "ADVISOR" | "FOREIGN_OFFICIAL" | "POLITICIAN"; displayName: string; role: string; countryId?: string; institutionId?: string; organisationId?: string; }
export interface AdvisorAssessment { advisorRole: "economic" | "security" | "social" | "foreign" | "chief_of_staff"; text: string; confidence: AssessmentConfidence; }
export interface EncounterResponseOption { id: string; label: string; displayText: string; profile: { stance: ResponseStance; tone: ResponseTone; commitment: "LOW" | "MODERATE" | "HIGH"; argument: string; createsCommitment?: boolean }; assessment: AdvisorAssessment; }
export interface InterviewQuestion { id: string; topic: string; questionIntent: string; subjectIds: string[]; salience: number; difficulty: number; displayQuestion: string; responseOptions: EncounterResponseOption[]; }
export interface EncounterResponse { questionId: string; responseId: string; profile: EncounterResponseOption["profile"]; resolvedTurn: number; immediateEffects: Record<string, number>; seed: number; }
export interface EncounterOutcome { summary: string; themes: string[]; eventFactIds: string[]; aggregateEffects: Record<string, number>; }
export interface InteractiveEncounter { id: string; type: EncounterType; status: EncounterStatus; title: string; description: string; participants: EncounterParticipant[]; location: string; date: string; topics: string[]; context: string[]; decisionNodes: InterviewQuestion[]; currentNode: number; responses: EncounterResponse[]; hiddenState: Record<string, number | string | boolean>; outcome: EncounterOutcome | null; relatedEntityIds: string[]; sourceEventIds: string[]; sourceRequestId?: string; createdTurn: number; completedTurn: number | null; }

function hash(text: string): number { let h = 2166136261; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function clamp(value: number, min = 0, max = 100): number { return Math.max(min, Math.min(max, value)); }
function assessment(role: AdvisorAssessment["advisorRole"], text: string, confidence: AssessmentConfidence): AdvisorAssessment { return { advisorRole: role, text, confidence }; }

function options(state: GameState, topic: string): EncounterResponseOption[] {
  type Draft = [string, string, string, ResponseStance, ResponseTone, AdvisorAssessment["advisorRole"], string, AssessmentConfidence];
  const economic = /econom|fiscal|inflation|tax|growth|debt|employment/i.test(topic);
  const security = /security|crime|police|pcc|operation|violence/i.test(topic);
  const foreign = /foreign|diplom|international|alliance|trade|mercosul/i.test(topic);
  const health = /health|hospital|sus|care/i.test(topic);
  const context = economic ? `Inflation is ${state.inflation.toFixed(1)}% and debt is ${state.sovereignDebt.toFixed(1)}% of GDP.` : security ? `Security stands at ${Math.round(state.securityIndex)} and the leading criminal threat retains substantial capacity.` : `Approval is ${Math.round(state.approval)}% and coalition support is ${Math.round(state.congressionalSupport)}%.`;
  const drafts: Draft[] = security ? [
    ["escalate", "Escalate federal operations", "We will intensify federal operations wherever criminal groups challenge the authority of the state.", "DEFEND", "ASSERTIVE", "security", `${context} Escalation may show resolve, but operational readiness will determine whether it produces results.`, "MODERATE"],
    ["intelligence", "Emphasise intelligence-led enforcement", "We will target command structures, finances and logistics before committing wider forces.", "MODERATE", "MEASURED", "security", "This approach fits the present need to convert intelligence into durable disruption rather than temporary territorial gains.", "HIGH"],
    ["prevention", "Focus on prevention and local capacity", "Security also requires schools, services and capable local policing so criminal groups cannot continually recruit.", "ACKNOWLEDGE", "EMPATHETIC", "social", "The argument may broaden support in affected communities, though results will take longer to demonstrate.", "MODERATE"],
    ["liberties", "Stress civil-liberties safeguards", "Every operation will remain subject to law, civilian oversight and investigation where force is misused.", "ACKNOWLEDGE", "MEASURED", "chief_of_staff", `Civil-liberties safeguards can protect legitimacy while international pressure is ${Math.round(state.internationalPressure)}.`, "HIGH"],
  ] : economic ? [
    ["fiscal", "Defend fiscal responsibility", "Every permanent commitment must have durable funding; we will not disguise today's spending as tomorrow's problem.", "DEFEND", "MEASURED", "economic", `${context} Credibility depends on showing the funding source, not simply asserting discipline.`, "HIGH"],
    ["growth", "Set out the growth strategy", "Investment, productivity and formal business creation are how Brazil will grow its way into a stronger fiscal position.", "DEFEND", "ASSERTIVE", "economic", `Growth is currently ${state.gdpGrowth.toFixed(1)}%; the argument is stronger when tied to implemented reforms.`, "MODERATE"],
    ["inflation", "Put inflation control first", "Price stability is the immediate priority because inflation is a tax paid most heavily by working families.", "ACKNOWLEDGE", "MEASURED", "economic", `At ${state.inflation.toFixed(1)}%, a clear anti-inflation position is credible but may constrain spending promises.`, "HIGH"],
    ["long-term", "Ask for temporary sacrifice", "Some measures will be difficult now, but postponing reform would leave the country poorer and less resilient.", "CHALLENGE", "ASSERTIVE", "chief_of_staff", "The message may appeal to reform supporters while exposing the government to short-term opposition attacks.", "LOW"],
  ] : foreign ? [
    ["autonomy", "Assert strategic autonomy", "Brazil will cooperate widely while retaining the freedom to define its own national interest.", "DEFEND", "ASSERTIVE", "foreign", "Strategic autonomy is domestically legible, but partners may seek clearer commitments.", "MODERATE"],
    ["alliances", "Emphasise alliance building", "Brazil's influence grows when dependable partners know where we stand and what we can deliver together.", "MODERATE", "MEASURED", "foreign", `Alliance strength is ${Math.round(state.allianceStrength)}; consistency would reinforce this answer.`, "HIGH"],
    ["regional", "Claim regional leadership", "Brazil must lead practical regional cooperation on trade, security and democratic stability.", "DEFEND", "ASSERTIVE", "foreign", "Regional leadership creates expectations that Brazil will commit resources as well as words.", "MODERATE"],
    ["pragmatic", "Offer pragmatic diplomacy", "We will judge each relationship by concrete cooperation rather than ideological alignment.", "ACKNOWLEDGE", "MEASURED", "chief_of_staff", "Pragmatism preserves room to manoeuvre, though it may appear evasive on difficult partners.", "LOW"],
  ] : health ? [
    ["capacity", "Commit to capacity expansion", "We will expand frontline capacity where queues and geographic gaps are most severe.", "DEFEND", "ASSERTIVE", "social", "Visible capacity can build trust, but the fiscal commitment must be sustained through implementation.", "MODERATE"],
    ["prevention", "Prioritise prevention", "A stronger SUS must prevent illness earlier rather than paying more after families reach crisis point.", "MODERATE", "MEASURED", "social", "Prevention offers durable gains, although those gains will be difficult to demonstrate immediately.", "HIGH"],
    ["equity", "Make equity the test", "Federal policy will be judged by whether poor and remote communities receive the same dignity of care.", "ACKNOWLEDGE", "EMPATHETIC", "social", "This speaks directly to underserved communities but raises expectations for measurable regional delivery.", "HIGH"],
    ["efficiency", "Emphasise delivery efficiency", "We will reduce waiting times by fixing procurement, scheduling and digital coordination before adding bureaucracy.", "CHALLENGE", "MEASURED", "economic", "Efficiency protects the fiscal case, provided it does not sound like a substitute for necessary capacity.", "MODERATE"],
  ] : [
    ["results", "Define a measurable result", `The government should be judged by concrete delivery on ${topic}, not by announcements.`, "DEFEND", "ASSERTIVE", "chief_of_staff", `${context} A measurable standard creates credibility and a future test of performance.`, "MODERATE"],
    ["accountability", "Accept responsibility", "The concern is legitimate. We will publish results and correct failures without abandoning the objective.", "ACKNOWLEDGE", "EMPATHETIC", "social", "Candour can restore trust when followed by visible action.", "HIGH"],
    ["institutional", "Emphasise institutional safeguards", "The policy will proceed through lawful institutions, oversight and regular review.", "MODERATE", "MEASURED", "chief_of_staff", `With coalition support at ${Math.round(state.congressionalSupport)}%, institutional discipline matters to delivery.`, "HIGH"],
    ["premise", "Challenge the premise", "That framing ignores the cost of inaction and the conditions this administration inherited.", "CHALLENGE", "CONFRONTATIONAL", "chief_of_staff", "Confrontation can energise supporters but prolong controversy.", "LOW"],
  ];
  return drafts.map(([id, label, displayText, stance, tone, role, text, confidence]) => ({ id, label, displayText, profile: { stance, tone, commitment: stance === "DEFEND" ? "HIGH" : stance === "CHALLENGE" ? "LOW" : "MODERATE", argument: id.toUpperCase(), createsCommitment: /commit|safeguard|capacity|inflation/.test(id) }, assessment: assessment(role, text, confidence) }));
}

export function buildInterviewEncounter(state: GameState, request: InterviewRequest): InteractiveEncounter {
  const facts = state.eventHistory.filter((event) => event.occurredTurn >= state.turn - 3).slice(-8);
  const questions: InterviewQuestion[] = [];
  const add = (intent: string, topic: string, wording: string, subjectIds: string[] = []) => questions.push({ id: `q-${questions.length + 1}-${intent.toLowerCase()}`, topic, questionIntent: intent, subjectIds, salience: 70 + questions.length * 5, difficulty: 55 + questions.length * 8, displayQuestion: wording, responseOptions: options(state, topic) });
  add("REQUEST_TOPIC_CHALLENGE", request.topic, `President, the issue of ${request.topic} is at the centre of this request. What result should Brazilians hold your government accountable for?`);
  if (state.inflation > 4 || /econom|fiscal|tax|spend/i.test(request.topic)) add("FISCAL_CREDIBILITY_CHALLENGE", "Fiscal responsibility", `Inflation is ${state.inflation.toFixed(1)}% and federal debt stands at ${state.sovereignDebt.toFixed(1)}% of GDP. How do you defend the government's economic direction?`, facts.filter((f) => f.category === "economy").flatMap((f) => f.subjects.map((s) => s.id)));
  if (state.securityIndex < 60 || /security|crime|police|pcc/i.test(request.topic)) add("SECURITY_ACCOUNTABILITY", "Public security", `The security index is ${Math.round(state.securityIndex)} and organised crime remains entrenched. Why should the public believe your strategy is working?`, state.criminalOrganisations.slice(0, 2).map((o) => o.id));
  const salient = facts.find((f) => f.surfacedToPresident);
  if (salient) add("RECENT_RECORD_CHALLENGE", salient.category, `Your administration recently faced ${salient.subjects[0]?.name ?? "a major national development"}. What responsibility do you accept for the consequences?`, salient.subjects.map((s) => s.id));
  if (questions.length < 2) add("PUBLIC_SERVICES_CHALLENGE", "Government delivery", `What concrete improvement should citizens expect from the federal government before the end of this term?`);
  add("GOVERNING_MANDATE", "Political mandate", `Your approval stands at ${Math.round(state.approval)}%. What do you say to Brazilians who remain unconvinced by your presidency?`);
  return { id: `encounter-interview-${request.id}`, type: "MEDIA_INTERVIEW", status: "ACCEPTED", title: `${request.outlet} Presidential Interview`, description: request.topic, participants: [{ id: "president", type: "PRESIDENT", displayName: state.playerName, role: state.playerTitle }, { id: `journalist-${request.id}`, type: "JOURNALIST", displayName: request.interviewer ?? request.outlet, role: request.outlet }], location: "Palácio do Planalto, Brasília", date: state.date, topics: [...new Set(questions.map((q) => q.topic))], context: facts.map((f) => f.dedupeKey), decisionNodes: questions.slice(0, 5), currentNode: 0, responses: [], hiddenState: { audiencePressure: request.risk === "high" ? 75 : request.risk === "medium" ? 55 : 35, outletReach: request.opportunity === "high" ? 80 : request.opportunity === "medium" ? 60 : 40 }, outcome: null, relatedEntityIds: [...new Set(questions.flatMap((q) => q.subjectIds))], sourceEventIds: facts.map((f) => f.id), sourceRequestId: request.id, createdTurn: state.turn, completedTurn: null };
}

function resolveEffects(state: GameState, encounter: InteractiveEncounter, question: InterviewQuestion, option: EncounterResponseOption): { effects: Record<string, number>; seed: number } {
  const seed = hash(`${state.turn}:${encounter.id}:${question.id}:${option.id}:${Math.round(state.approval)}:${Math.round(state.mediaSentiment)}`);
  const uncertainty = (seed % 3) - 1;
  let media = 0, approval = 0, congress = 0;
  if (option.profile.stance === "ACKNOWLEDGE") { media = state.mediaSentiment < 55 ? 2 : 1; approval = 1; }
  if (option.profile.stance === "MODERATE") { media = 1; congress = 1; }
  if (option.profile.stance === "DEFEND") { media = state.approval >= 50 ? 1 : -1; approval = state.approval >= 50 ? 1 : 0; }
  if (option.profile.stance === "CHALLENGE") { media = state.mediaSentiment < 40 ? -2 : -1; approval = state.approval < 40 ? 1 : -1; }
  if (question.questionIntent === "FISCAL_CREDIBILITY_CHALLENGE" && state.inflation > 7 && option.profile.stance === "DEFEND") media -= 1;
  return { seed, effects: { mediaSentiment: clamp(media + uncertainty, -3, 3), approval: clamp(approval + (uncertainty > 0 ? 1 : 0), -2, 2), congressionalSupport: clamp(congress, -2, 2) } };
}

export function startEncounter(state: GameState, encounterId: string): GameState { return { ...state, encounters: state.encounters.map((e) => e.id === encounterId && e.status === "ACCEPTED" ? { ...e, status: "IN_PROGRESS" } : e) }; }

export function answerEncounter(state: GameState, encounterId: string, questionId: string, responseId: string): GameState {
  const encounter = state.encounters.find((e) => e.id === encounterId);
  if (!encounter || encounter.status !== "IN_PROGRESS") return state;
  const question = encounter.decisionNodes[encounter.currentNode];
  const option = question?.responseOptions.find((item) => item.id === responseId);
  if (!question || question.id !== questionId || !option || encounter.responses.some((r) => r.questionId === question.id)) return state;
  const resolved = resolveEffects(state, encounter, question, option);
  const response: EncounterResponse = { questionId: question.id, responseId: option.id, profile: option.profile, resolvedTurn: state.turn, immediateEffects: resolved.effects, seed: resolved.seed };
  const responses = [...encounter.responses, response];
  const complete = responses.length >= encounter.decisionNodes.length;
  const aggregate = responses.reduce<Record<string, number>>((all, item) => { for (const [key, value] of Object.entries(item.immediateEffects)) all[key] = (all[key] ?? 0) + value; return all; }, {});
  const factId = `fact-interview-${encounter.id}`;
  const updated: InteractiveEncounter = { ...encounter, currentNode: encounter.currentNode + 1, responses, status: complete ? "COMPLETED" : "IN_PROGRESS", completedTurn: complete ? state.turn : null, outcome: complete ? { summary: `The ${encounter.participants[1]?.role ?? "media"} interview concluded after ${responses.length} questions.`, themes: encounter.topics.slice(0, 3), eventFactIds: [factId], aggregateEffects: aggregate } : null };
  let next: GameState = { ...state, approval: clamp(state.approval + resolved.effects.approval), mediaSentiment: clamp(state.mediaSentiment + resolved.effects.mediaSentiment), congressionalSupport: clamp(state.congressionalSupport + resolved.effects.congressionalSupport), encounters: state.encounters.map((e) => e.id === encounterId ? updated : e) };
  if (complete && !state.eventHistory.some((f) => f.id === factId)) {
    const fact: EventFact = { id: factId, turn: state.turn, occurredTurn: state.turn, date: state.date, type: "MEDIA_INTERVIEW_COMPLETED", category: "politics", source: "MEDIA", importance: "MEDIUM", subjects: [{ id: encounter.id, type: "INSTITUTION", name: encounter.participants[1]?.role ?? "National media" }], metrics: { questions: responses.length }, consequences: encounter.topics.slice(0, 3), dedupeKey: `interview:${encounter.id}:completed`, surfacedToPresident: true, debug: { significanceScore: 55, llmEnriched: false } };
    const article: NewsArticle = { id: `procedural-${factId}`, turn: state.turn, date: state.date, outlet: (encounter.participants[1]?.role as NewsArticle["outlet"]) || "Folha de S.Paulo", headline: `${state.playerName} faces questions on ${encounter.topics[0]}`, body: `The presidential interview concluded after ${responses.length} substantive questions. ${encounter.topics.slice(0, 3).join(", ")} dominated the exchange, and political observers are assessing the government's answers.`, sentiment: aggregate.mediaSentiment > 1 ? "positive" : aggregate.mediaSentiment < -1 ? "negative" : "neutral", topic: /security/i.test(encounter.topics.join(" ")) ? "security" : /fiscal|econom/i.test(encounter.topics.join(" ")) ? "economy" : "politics", isBreaking: false, eventFactId: factId, eventFactIds: [factId], isProcedural: true };
    next = { ...next, eventHistory: [...next.eventHistory, fact].slice(-500), newsArticles: [...next.newsArticles, article].slice(-100), mediaEvents: [...next.mediaEvents, { turn: state.turn, date: state.date, description: `${encounter.participants[1]?.role ?? "National media"} presidential interview completed`, sentimentImpact: aggregate.mediaSentiment ?? 0 }] };
  }
  return next;
}

function requestFact(state: GameState, request: InterviewRequest, accepted: boolean): EventFact { return { id: `fact-interview-${request.id}-${accepted ? "accepted" : "declined"}`, turn: state.turn, occurredTurn: state.turn, date: state.date, type: accepted ? "INTERVIEW_ACCEPTED" : "INTERVIEW_DECLINED", category: "politics", source: "MEDIA", importance: "LOW", subjects: [{ id: request.id, type: "INSTITUTION", name: request.outlet }], metrics: {}, dedupeKey: `interview:${request.id}:${accepted ? "accepted" : "declined"}`, surfacedToPresident: false, debug: { significanceScore: 20, llmEnriched: false } }; }
export function acceptInterviewRequest(state: GameState, requestId: string): GameState { const request = state.pendingInterviews.find((i) => i.id === requestId); if (!request) return state; const existing = state.encounters.some((e) => e.sourceRequestId === requestId); const fact = requestFact(state, request, true); return { ...state, pendingInterviews: state.pendingInterviews.map((i) => i.id === requestId ? { ...i, accepted: true } : i), encounters: existing ? state.encounters : [...state.encounters, buildInterviewEncounter(state, request)], eventHistory: state.eventHistory.some((e) => e.id === fact.id) ? state.eventHistory : [...state.eventHistory, fact] }; }
export function declineInterviewRequest(state: GameState, requestId: string): GameState { const request = state.pendingInterviews.find((i) => i.id === requestId); if (!request) return state; const fact = requestFact(state, request, false); return { ...state, pendingInterviews: state.pendingInterviews.map((i) => i.id === requestId ? { ...i, accepted: false } : i), encounters: state.encounters.map((e) => e.sourceRequestId === requestId ? { ...e, status: "DECLINED" } : e), eventHistory: state.eventHistory.some((e) => e.id === fact.id) ? state.eventHistory : [...state.eventHistory, fact] }; }
export function expireEncounters(state: GameState): GameState { return { ...state, encounters: state.encounters.map((e) => e.status === "AVAILABLE" && state.turn > e.createdTurn + 3 ? { ...e, status: "EXPIRED" } : e), pendingInterviews: state.pendingInterviews.map((i) => i.accepted === null && i.deadline < state.turn ? { ...i, accepted: false } : i) }; }
