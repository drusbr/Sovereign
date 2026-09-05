import type { EventFact } from "@/lib/eventFacts";
import type { StoryCandidate, StoryFamily } from "@/lib/storyAggregator";

export type NarrativeStyle = "PRESIDENTIAL_BRIEFING" | "GENERAL_NEWS" | "ECONOMIC_NEWS" | "SECURITY_INTELLIGENCE" | "NOTIFICATION";
export interface RenderedEvent { headline: string; body: string; templateId: string; style: NarrativeStyle; }

const UUID_SOURCE = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
function hasUuid(text: string): boolean { return new RegExp(UUID_SOURCE, "i").test(text); }
function hash(text: string): number { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function money(value: unknown): string { return `R$${Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 3 })}bn`; }
function metric(event: EventFact, key: string): number { return Number(event.metrics?.[key] ?? 0); }

export function playerFacingEntityName(event: EventFact): string {
  const raw = event.subjects[0]?.name?.trim() ?? "";
  if (raw && !hasUuid(raw)) return raw;
  if (event.source === "OPERATION") return `Federal Security Operation${event.geography?.[0] ? ` in ${event.geography[0]}` : ""}`;
  if (event.source === "PROJECT") return "Federal Government Programme";
  if (event.source === "CONGRESS") return "Government Legislation";
  return "Federal authorities";
}

function choose(candidate: StoryCandidate, style: NarrativeStyle, recent: string[], families: string[]): number {
  const start = hash(`${candidate.id}:${candidate.angle}:${style}`) % families.length;
  for (let i = 0; i < families.length; i++) {
    const index = (start + i) % families.length;
    if (!recent.includes(`${candidate.family}:${candidate.angle}:${style}:${families[index]}`)) return index;
  }
  return start;
}

function operationCopy(candidate: StoryCandidate, variant: number) {
  const launch = candidate.facts.find((fact) => fact.type === "OPERATION_LAUNCHED");
  const result = candidate.facts.find((fact) => fact.type === "OPERATION_BREAKTHROUGH" || fact.type === "OPERATION_DEVELOPMENT");
  const casualty = candidate.facts.find((fact) => fact.type === "OPERATION_CASUALTIES");
  const fact = result ?? casualty ?? launch ?? candidate.primaryFact;
  const name = playerFacingEntityName(fact);
  const governmentCasualties = casualty ? metric(casualty, "governmentCasualties") : metric(fact, "governmentCasualties");
  const civilianCasualties = casualty ? metric(casualty, "civilianCasualties") : metric(fact, "civilianCasualties");
  const headline = casualty
    ? [ `${name} Opens With Casualties`, "Federal Operation Reports Casualties During Opening Phase", `${name}: Personnel Wounded as Security Deployment Proceeds` ][variant]
    : result ? [ `${name} Disrupts Criminal Networks`, `Federal Authorities Report Gains in ${name}`, `${name} Intensifies Pressure on Organised Crime` ][variant]
      : [ `${name} Begins`, `Federal Security Deployment Opens in ${fact.geography?.[0] ?? "Brazil"}`, `Government Launches ${name}` ][variant];
  const sentences: string[] = [];
  if (launch) sentences.push(`${name} began operations in ${launch.geography?.[0] ?? "Brazil"} under an authorised budget of ${money(launch.metrics?.budget)}.`);
  if (result) sentences.push(`Authorities reported ${metric(result, "arrests")} arrests, including ${metric(result, "highValueArrests")} high-value arrests, while ${metric(result, "facilitiesDisrupted")} facilities were disrupted and ${money(result.metrics?.assetsSeized)} in assets was seized.`);
  if (result) sentences.push(`The targeted organisation's operational capacity fell by ${metric(result, "criminalCapacityReduction")} points. Civilian casualties: ${civilianCasualties}.`);
  if (casualty) sentences.push(`The operation recorded ${governmentCasualties} government casualties and ${civilianCasualties} civilian casualties during the same phase.`);
  return { headline, body: sentences.join(" ") || `${name} remains active.` };
}

function projectDomain(event: EventFact): "education" | "health" | "infrastructure" | "security" | "government" {
  const text = `${playerFacingEntityName(event)} ${event.category}`.toLowerCase();
  if (/school|education|escola/.test(text)) return "education";
  if (/hospital|health|sus/.test(text)) return "health";
  if (/rail|road|port|nuclear|energy|infrastructure|construction/.test(text)) return "infrastructure";
  if (/security|battalion|police/.test(text)) return "security";
  return "government";
}

function projectCopy(candidate: StoryCandidate, variant: number) {
  const event = candidate.primaryFact;
  const name = playerFacingEntityName(event);
  const domain = projectDomain(event);
  const noun = `${domain} programme`;
  const m = event.metrics ?? {};
  if (event.type === "PROJECT_FAILED") return { headline: [`Funding Shortfall Ends ${name}`, `${name} Fails After Financing Breakdown`, `Government Terminates ${name}`][variant], body: `${name} has failed after funding interruption. The ${noun} carried an authorised budget of ${money(m.budget)}, of which ${money(m.spent)} was spent before delivery stopped at ${m.progress}%. The termination is expected to draw scrutiny over the undelivered commitment.` };
  if (event.type === "PROJECT_STALLED") return { headline: [`Funding Constraints Stall ${name}`, `${name} Put on Hold`, `Delivery Pauses on ${name}`][variant], body: `${name} has been suspended with delivery at ${m.progress}%. Expenditure stands at ${money(m.spent)} against an authorised budget of ${money(m.budget)} while officials review financing.` };
  if (event.type === "PROJECT_COMPLETED") return { headline: [`${name} Enters Service`, `Government Completes ${name}`, `${domain === "infrastructure" ? "Construction" : "Delivery"} Concludes on ${name}`][variant], body: `${name} has completed implementation. Final expenditure was ${money(m.spent)} against an authorised budget of ${money(m.budget)}, bringing the government's ${domain} initiative into its operational phase.` };
  const headlines: Record<typeof domain, string[]> = {
    education: [`${name} Moves Into Next Delivery Phase`, "Education Pilot Reaches Major Implementation Stage", `${name} Expands Delivery`],
    health: [`${name} Expands Health-Service Delivery`, "Health Programme Clears Implementation Milestone", `${name} Moves Into Next Phase`],
    infrastructure: [`Construction Advances on ${name}`, `${name} Clears Major Delivery Stage`, `Works Progress on ${name}`],
    security: [`${name} Advances Training and Deployment`, "Security Programme Reaches Implementation Milestone", `${name} Moves Closer to Operational Readiness`],
    government: [`${name} Reaches Major Delivery Stage`, `Implementation Advances on ${name}`, `${name} Moves Into Next Phase`],
  };
  const stage = Number(m.milestone) >= 75 ? "final delivery stage" : Number(m.milestone) >= 50 ? "main implementation phase" : "first major delivery phase";
  const bodies = domain === "infrastructure"
    ? [`Construction has entered its ${stage}, with contractors reporting ${m.milestone}% of planned works delivered. ${money(m.spent)} has been disbursed from the ${money(m.budget)} authorised envelope.`, `Works on ${name} have moved beyond the ${m.milestone}% mark. Treasury records show ${money(m.spent)} spent, leaving the remaining commitment tied to the next construction phase.`, `${name} cleared a major engineering milestone as physical delivery reached ${m.milestone}%. Spending now stands at ${money(m.spent)} of the approved ${money(m.budget)}.`]
    : domain === "education"
      ? [`The programme is extending delivery to its next group of schools after reaching ${m.milestone}% implementation. Recorded spending is ${money(m.spent)} from an authorised ${money(m.budget)}.`, `${name} has moved into its ${stage}, expanding training and classroom delivery rather than merely completing administrative setup. Expenditure totals ${money(m.spent)}.`, `Education officials report that ${name} is now ${m.milestone}% implemented. The next phase shifts attention toward delivery outcomes under the remaining budget commitment.`]
      : domain === "health"
        ? [`Health-service rollout has reached ${m.milestone}%, moving the programme into its ${stage}. Federal expenditure totals ${money(m.spent)}.`, `${name} has expanded operational delivery as implementation passed ${m.milestone}%. ${money(m.spent)} of the ${money(m.budget)} allocation has entered the accounts.`, `The health programme cleared its latest service-delivery threshold. Implementation stands at ${m.milestone}% with remaining funds reserved for the next rollout phase.`]
        : domain === "security"
          ? [`Training, procurement and deployment readiness have reached ${m.milestone}% under ${name}. Expenditure stands at ${money(m.spent)} against ${money(m.budget)} authorised.`, `${name} entered its next operational-readiness phase after passing ${m.milestone}% implementation. Officials are now shifting from setup toward deployment capability.`, `Federal security authorities report ${m.milestone}% programme delivery, with ${money(m.spent)} committed to readiness and institutional capacity.`]
          : [`${name} entered its ${stage} at ${m.milestone}% delivery. Recorded expenditure is ${money(m.spent)} against an authorised ${money(m.budget)}.`, `Implementation advanced beyond the latest milestone, shifting responsibility toward the next delivery stage. Spending now totals ${money(m.spent)}.`, `Federal administrators report ${m.milestone}% delivery on ${name}; the remaining commitment will finance the next implementation phase.`];
  return { headline: headlines[domain][variant], body: bodies[variant] };
}

function congressCopy(candidate: StoryCandidate, variant: number) {
  const event = candidate.primaryFact; const name = playerFacingEntityName(event);
  const passed = event.type === "LEGISLATION_PASSED"; const failed = event.type === "LEGISLATION_FAILED";
  const headline = passed ? [`Congress Clears ${name}`, `Senate Completes Passage of ${name}`, `${name} Wins Bicameral Approval`][variant]
    : failed ? [`${name} Defeated in Congress`, `Congress Rejects ${name}`, `${name} Falls Short of Bicameral Approval`][variant]
      : [`${name} Enters Congress`, `Government Introduces ${name}`, `Congress Opens Debate on ${name}`][variant];
  const fiscal = candidate.facts.find((fact) => fact.type === "MAJOR_EXPENDITURE");
  const fiscalContext = fiscal ? ` The enacted package adds ${money(Number(fiscal.metrics?.annualExpenditureImpact ?? fiscal.metrics?.expenditure ?? 0))} to annual expenditure${Number(fiscal.metrics?.annualRevenueImpact ?? 0) > 0 ? ` and ${money(fiscal.metrics?.annualRevenueImpact)} to annual revenue` : ""}. Its net current-turn cash effect is ${money(Math.abs(Number(fiscal.metrics?.currentTurnCashImpact ?? 0)))}.` : "";
  const body = passed || failed ? `${name} ${passed ? "passed" : "failed to pass"} both chambers. The Chamber recorded ${metric(event, "chamberYes")} votes in favour and the Senate recorded ${metric(event, "senateYes")}.${passed ? fiscalContext : ""}` : `${name} has been introduced for consideration by the Chamber of Deputies and Federal Senate.`;
  return { headline, body };
}

function fiscalCopy(candidate: StoryCandidate, variant: number) {
  const event = candidate.primaryFact;
  if (event.type === "MAJOR_EXPENDITURE") return { headline: [`${money(event.metrics?.expenditure)} Federal Spending Commitment Enters Accounts`, `New Federal Measures Add ${money(event.metrics?.expenditure)} in Expenditure`, "Treasury Records Major New Expenditure"][variant], body: `The federal accounts recorded ${money(event.metrics?.expenditure)} in new expenditure across ${event.metrics?.transactions} transaction${Number(event.metrics?.transactions) === 1 ? "" : "s"}. The outlays will feed through to the government's financing requirement and debt position.` };
  return { headline: [`Debt Ratio Crosses ${event.metrics?.threshold}%`, "Federal Debt Moves Through Key Threshold", "Treasury Position Shifts as Debt Ratio Changes"][variant], body: `Federal debt-to-GDP moved from ${event.previousValues?.debtToGDP}% to ${event.currentValues?.debtToGDP}%, crossing the ${event.metrics?.threshold}% threshold.` };
}

function monetaryCopy(candidate: StoryCandidate, variant: number) {
  const event = candidate.primaryFact;
  const previous = Number(event.previousValues?.selic ?? 0);
  const current = Number(event.currentValues?.selic ?? previous);
  const change = Number(event.metrics?.change ?? current - previous);
  const inflation = Number(event.metrics?.inflation ?? 0);
  const target = Number(event.metrics?.inflationTarget ?? 0);
  const verb = change > 0 ? "raises" : change < 0 ? "cuts" : "holds";
  const headlines = change === 0
    ? [`COPOM Holds Selic at ${current.toFixed(2)}%`, `Central Bank Maintains Selic at ${current.toFixed(2)}%`, `COPOM Leaves Policy Rate Unchanged`]
    : [`COPOM ${verb === "raises" ? "Raises" : "Cuts"} Selic to ${current.toFixed(2)}%`, `Central Bank Moves Policy Rate ${Math.abs(change).toFixed(2)} Points ${change > 0 ? "Higher" : "Lower"}`, `Selic Set at ${current.toFixed(2)}% After COPOM Meeting`];
  const reasons = event.causes?.length ? event.causes.join(" and ") : "the committee assessed current economic conditions";
  return {
    headline: headlines[variant],
    body: `The Monetary Policy Committee ${verb === "holds" ? "maintained" : verb === "raises" ? "increased" : "reduced"} the Selic target from ${previous.toFixed(2)}% to ${current.toFixed(2)}%. Annual inflation stood at ${inflation.toFixed(2)}% against a ${target.toFixed(2)}% target; the committee cited ${reasons}. The stance will affect demand gradually rather than changing inflation immediately.`,
  };
}

function externalCopy(candidate: StoryCandidate, variant: number) {
  const event = candidate.primaryFact;
  const previous = Number(event.previousValues?.exchangeRateBrlPerUsd ?? 0);
  const current = Number(event.currentValues?.exchangeRateBrlPerUsd ?? previous);
  const weakened = current > previous;
  const headlines = weakened
    ? ["Real Weakens Against the Dollar", "Brazilian Real Depreciates", "External Conditions Put Pressure on the Real"]
    : ["Real Strengthens Against the Dollar", "Brazilian Real Appreciates", "External Conditions Support the Real"];
  return {
    headline: headlines[variant],
    body: `The Brazilian real ${weakened ? "depreciated" : "appreciated"} from R$${previous.toFixed(2)} to R$${current.toFixed(2)} per US dollar as ${event.causes?.[0] ?? "external conditions changed"}. ${weakened ? "The move is adding to imported price pressure while gradually improving export competitiveness." : "The move is easing imported price pressure while gradually reducing export competitiveness."}`,
  };
}

function genericCopy(candidate: StoryCandidate, variant: number) {
  const event = candidate.primaryFact; const name = playerFacingEntityName(event); const label = event.type.replaceAll("_", " ").toLowerCase();
  const headline = [`${name}: ${label}`, `${name} Marks New National Development`, `Government Faces ${label}`][variant];
  const previous = event.previousValues ? Object.entries(event.previousValues).map(([key, value]) => `${key} ${value}`).join(", ") : "";
  const current = event.currentValues ? Object.entries(event.currentValues).map(([key, value]) => `${key} ${value}`).join(", ") : "";
  return { headline, body: `${name} recorded ${label}.${previous || current ? ` The previous position was ${previous || "not reported"}; the current position is ${current || "not reported"}.` : ""}` };
}

function copyFor(candidate: StoryCandidate, variant: number) {
  if (candidate.primaryFact.type === "EXCHANGE_RATE_SHIFT") return externalCopy(candidate, variant);
  if (candidate.family === "OPERATION") return operationCopy(candidate, variant);
  if (candidate.family === "PROJECT") return projectCopy(candidate, variant);
  if (candidate.family === "CONGRESS") return congressCopy(candidate, variant);
  if (candidate.family === "FISCAL") return fiscalCopy(candidate, variant);
  if (candidate.family === "MONETARY") return monetaryCopy(candidate, variant);
  return genericCopy(candidate, variant);
}
function templateFamilies(family: StoryFamily): string[] { return family === "PROJECT" ? ["delivery-led", "institution-led", "programme-led"] : family === "OPERATION" ? ["operation-led", "authority-led", "impact-led"] : family === "CONGRESS" ? ["institution-led", "measure-led", "outcome-led"] : ["subject-led", "change-led", "consequence-led"]; }

export function renderStory(candidate: StoryCandidate, style: NarrativeStyle, context: { recentTemplateIds?: string[] } = {}): RenderedEvent {
  const families = templateFamilies(candidate.family); const variant = choose(candidate, style, context.recentTemplateIds ?? [], families);
  const templateId = `${candidate.family}:${candidate.angle}:${style}:${families[variant]}`; const copy = copyFor(candidate, variant);
  const headline = style === "PRESIDENTIAL_BRIEFING" ? `${copy.headline} — Presidential Briefing` : style === "SECURITY_INTELLIGENCE" ? `SECURITY ASSESSMENT: ${copy.headline}` : copy.headline;
  const body = style === "PRESIDENTIAL_BRIEFING" ? `${copy.body} ${candidate.primaryFact.surfacedToPresident ? "This development warrants presidential attention." : "No immediate presidential decision is required."}` : style === "ECONOMIC_NEWS" ? `${copy.body} Markets and fiscal authorities will assess the effect on the financing outlook.` : copy.body;
  return { headline, body, templateId, style };
}

export function renderEvent(event: EventFact, style: NarrativeStyle, context: { recentTemplateIds?: string[] } = {}): RenderedEvent {
  const family: StoryFamily = event.source === "CONGRESS" ? "CONGRESS" : event.source === "FISCAL" ? "FISCAL" : event.source === "MONETARY" ? "MONETARY" : event.source === "PROJECT" ? "PROJECT" : event.source === "OPERATION" || event.source === "SECURITY" ? "OPERATION" : event.source === "ECONOMY" ? "ECONOMY" : event.source === "WORLD" ? "WORLD" : "GENERAL";
  return renderStory({ id: `story-${event.id}`, turn: event.turn, family, angle: event.type.toLowerCase(), primaryFact: event, facts: [event], storyWorthiness: 100 }, style, context);
}

export function buildEventEnrichmentPrompt(event: EventFact, baseline: RenderedEvent): string {
  return `Improve the prose of this report without changing its factual content.\n\nAUTHORITATIVE EVENT FACT:\n${JSON.stringify(event)}\n\nPROCEDURAL BASELINE:\nHeadline: ${baseline.headline}\nBody: ${baseline.body}\n\nYou may improve framing and describe plausible reaction. Do not invent or change outcomes, numbers, status, casualties, legislation, fiscal effects, participating actors, or authoritative game state. Return JSON only: {"headline":"...","body":"..."}`;
}
