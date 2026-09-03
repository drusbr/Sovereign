import assert from "node:assert/strict";
import test from "node:test";
import type { EventFact } from "./eventFacts.ts";
import type { ProposedAction } from "./actions/types.ts";
import type { TurnResult } from "./aiPrompts.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { buildStoryCandidates } from "./storyAggregator.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { renderEvent, renderStory } from "./proceduralWriter.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "./gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createProjectFromAction, processLifecycleTurn } from "./operationsProjectsEngine.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { applyCongressAction, ensureLegislativeProceedings } from "./congress.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { currentTurnFiscalFlows, fiscalCommitments } from "./fiscalPresentation.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { resolveTurn } from "./turn/resolveTurn.ts";

function fact(overrides: Partial<EventFact>): EventFact { return { id: "fact", turn: 2, occurredTurn: 2, date: "January 15, 2026", type: "PROJECT_MILESTONE", category: "government", source: "PROJECT", importance: "MEDIUM", subjects: [{ id: "entity", type: "PROJECT", name: "Federal Programme" }], metrics: {}, dedupeKey: "fact", surfacedToPresident: false, ...overrides }; }
function action(overrides: Partial<ProposedAction> = {}): ProposedAction { return { id: "action-1", actorId: "BRA", rawOrder: "Fund a hospital programme with R$12bn.", actionType: "FUND_PROJECT", authority: { type: "EXECUTIVE" }, targets: [], parameters: { amountBRLBillions: 12, spendingCategory: "health" }, estimatedCosts: [], prerequisites: [], status: "PROPOSED", validationIssues: [], ...overrides }; }
const zeroAI: TurnResult = { narrative: "Institutional processing completed.", effects: {}, organisationEffects: [], stateSecurityChanges: [], newOperation: null, newProject: null, situationSummary: "The national position is unchanged.", eventSummary: "An order was reviewed." };

test("project domains use different structures without internal language", () => {
  const education = renderEvent(fact({ subjects: [{ id: "school", type: "PROJECT", name: "Escola Viva Pilot" }], metrics: { milestone: 50, spent: 1, budget: 4 } }), "GENERAL_NEWS");
  const infrastructure = renderEvent(fact({ id: "infra", subjects: [{ id: "port", type: "PROJECT", name: "Santos Port Expansion" }], metrics: { milestone: 50, spent: 8, budget: 20 }, dedupeKey: "infra" }), "GENERAL_NEWS");
  assert.notEqual(education.headline, infrastructure.headline);
  for (const copy of [education, infrastructure]) assert.doesNotMatch(`${copy.headline} ${copy.body}`, /simulation record|EventFact|deterministic outcome|state variable/i);
});

test("UUIDs are replaced in player-facing operation copy", () => {
  const rendered = renderEvent(fact({ type: "OPERATION_LAUNCHED", source: "OPERATION", category: "security", subjects: [{ id: "op", type: "OPERATION", name: "Federal Operation d6a59fc0-5ed9-4b98-903d-207621cc6113" }], geography: ["São Paulo"], metrics: { budget: 2 }, relatedOperationIds: ["op"] }), "GENERAL_NEWS");
  assert.doesNotMatch(`${rendered.headline} ${rendered.body}`, /d6a59fc0|[0-9a-f]{8}-[0-9a-f]{4}/i);
});

test("related operation facts merge while unrelated facts remain separate", () => {
  const launch = fact({ id: "launch", type: "OPERATION_LAUNCHED", source: "OPERATION", category: "security", importance: "HIGH", subjects: [{ id: "op", type: "OPERATION", name: "Federal Anti-PCC Operation" }], relatedOperationIds: ["op"], metrics: { budget: 1.5 }, dedupeKey: "launch" });
  const casualty = fact({ id: "casualty", type: "OPERATION_CASUALTIES", source: "OPERATION", category: "security", importance: "HIGH", subjects: launch.subjects, relatedOperationIds: ["op"], metrics: { governmentCasualties: 2, civilianCasualties: 0 }, dedupeKey: "casualty" });
  const unrelated = fact({ id: "unrelated", type: "PROJECT_FAILED", importance: "HIGH", subjects: [{ id: "hospital", type: "PROJECT", name: "Hospital Expansion" }], relatedProjectIds: ["hospital"], metrics: { budget: 12, spent: 4.8, progress: 31 }, dedupeKey: "unrelated" });
  const stories = buildStoryCandidates([launch, casualty, unrelated]);
  assert.equal(stories.length, 2);
  const operation = stories.find((story) => story.family === "OPERATION")!;
  assert.equal(operation.facts.length, 2);
  const rendered = renderStory(operation, "GENERAL_NEWS");
  assert.match(rendered.body, /2 government casualties/); assert.match(rendered.body, /R\$1\.5bn/);
});

test("minor milestones are updates while major failures are news", () => {
  assert.equal(buildStoryCandidates([fact({ metrics: { milestone: 25, budget: 2, spent: 0.5 } })]).length, 0);
  assert.equal(buildStoryCandidates([fact({ id: "failure", type: "PROJECT_FAILED", importance: "HIGH", metrics: { budget: 50, spent: 12, progress: 24 }, dedupeKey: "failure" })]).length, 1);
});

test("legislation cannot enter project lifecycle and legacy bill hydrates safely", () => {
  const state = createInitialGameState();
  assert.equal(createProjectFromAction(state, action({ rawOrder: "Fund the STU Tax Reform Bill with R$2bn." })), null);
  const legacy = structuredClone(state); legacy.projects[1].name = "STU Tax Reform Bill";
  const hydrated = hydrateGameState(legacy);
  assert.equal(hydrated.projects.some((project) => project.name === "STU Tax Reform Bill"), false);
});

test("Congress deduplicates negotiation and persists enacted fiscal effects", () => {
  let state = createInitialGameState(); state.congressionalSupport = 95;
  const billAction = action({ actionType: "INCREASE_SPENDING", authority: { type: "LEGISLATIVE" }, parameters: { annualAmountBRLBillions: 30, spendingCategory: "health", timing: "ANNUAL_RECURRING" } });
  state = ensureLegislativeProceedings(state, [billAction], state.turn); const id = state.legislativeProceedings[0].id;
  const once = applyCongressAction(state, id, "NEGOTIATE").state; const twice = applyCongressAction(once, id, "NEGOTIATE").state;
  assert.equal(twice.legislativeProceedings[0].concessions.length, 1);
  const voted = applyCongressAction({ ...twice, actionPoints: 3 }, id, "CALL_VOTE");
  assert.equal(voted.voteResult?.passed, true); assert.equal(voted.state.legislativeProceedings[0].voteResult?.passed, true);
  const enacted = voted.state.fiscal.ledger.find((entry) => entry.proceedingId === id)!;
  assert.equal(enacted.annualRunRateImpact, -30); assert.equal(enacted.currentTurnCashImpact, -30 / 52);
  assert.throws(() => applyCongressAction(voted.state, id, "NEGOTIATE"), /closed/);
});

test("fiscal flows reconcile and lifecycle expenditure appears once", () => {
  let state = createInitialGameState(); state.projects = []; state.activeProjects = 0;
  state = { ...state, projects: [createProjectFromAction(state, action())!], activeProjects: 1 };
  const processed = processLifecycleTurn(state, state.turn).state; const flows = currentTurnFiscalFlows(processed.fiscal, state.turn);
  assert.equal(flows.entries.filter((entry) => entry.projectId === processed.projects[0].id).length, 1);
  assert.equal(flows.net, flows.revenue - flows.expenditure);
  const commitment = fiscalCommitments(processed).find((item) => item.id === processed.projects[0].id)!;
  assert.equal(Number((commitment.authorised - commitment.spent).toFixed(8)), Number(commitment.remaining.toFixed(8)));
  assert.equal(Object.values(processed.fiscal.revenueByCategory).reduce((a, b) => a + b, 0), processed.fiscal.primaryRevenue);
});

test("frozen assets cannot become expenditure", () => {
  const state = createInitialGameState(); state.anipAssetsFrozen = 0.008; state.activeOperations = []; state.projects = []; state.activeProjects = 0;
  const frozen = action({ rawOrder: "Redirect the R$8m of frozen PCC-linked assets into social assistance.", actionType: "INCREASE_SPENDING", parameters: { amountBRL: 8_000_000, spendingCategory: "socialProtection" } });
  const result = resolveTurn({ state, actions: [frozen], aiResult: zeroAI });
  assert.equal(result.actionResolutions[0].status, "BLOCKED"); assert.match(result.actionResolutions[0].reason ?? "", /remain frozen|not available/i);
  assert.equal(result.state.anipAssetsFrozen, 0.008); assert.equal(result.state.fiscal.ledger.length, state.fiscal.ledger.length);
});
