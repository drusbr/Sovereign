import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "./gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { applyCongressAction, assessLegislativeEntry, calculateCongressSupport, chamberRule, createLegislativeProceeding, determineChamberOutcome, ensureLegislativeProceedings, resolveCongressVote } from "./congress.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { inferExplicitLegislativeAction, parseActionInterpretation } from "./actions/interpretation.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { applyActionValidation } from "./actions/validation.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { processInstitutionalActions } from "./turn/institutionalProcessing.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { buildTurnPrompt } from "./aiPrompts.ts";
import type { ProposedAction } from "./actions/types.ts";

function legislativeAction(id = "tax-bill"): ProposedAction {
  return {
    id,
    actorId: "BRA",
    rawOrder: "Raise the top federal income tax rate by five percentage points.",
    actionType: "LEGISLATIVE_PROPOSAL",
    authority: { type: "LEGISLATIVE", institution: "National Congress" },
    targets: [{ id: "congress", type: "INSTITUTION", name: "National Congress" }],
    parameters: {}, estimatedCosts: [], prerequisites: [], status: "PENDING",
    validationIssues: [{ code: "REQUIRES_LEGISLATION", severity: "BLOCKER", message: "Requires legislation." }],
  };
}

test("legislative action creates one persistent proceeding", () => {
  const state = createInitialGameState();
  const once = ensureLegislativeProceedings(state, [legislativeAction()], 1);
  const twice = ensureLegislativeProceedings(once, [legislativeAction()], 2);
  assert.equal(once.legislativeProceedings.length, 1);
  assert.equal(twice.legislativeProceedings.length, 1);
  assert.equal(twice.legislativeProceedings[0].actionId, "tax-bill");
  assert.equal(twice.legislativeProceedings[0].actionResolution.status, "PENDING");
});

test("executive action does not create legislation", () => {
  const executive = { ...legislativeAction(), id: "executive", authority: { type: "EXECUTIVE" as const }, validationIssues: [] };
  assert.equal(ensureLegislativeProceedings(createInitialGameState(), [executive], 1).legislativeProceedings.length, 0);
});

test("support calculation uses coalition and bicameral thresholds", () => {
  const state = createInitialGameState();
  const bill = createLegislativeProceeding(legislativeAction(), 1);
  const low = calculateCongressSupport({ ...state, congressionalSupport: 30 }, bill);
  const high = calculateCongressSupport({ ...state, congressionalSupport: 70 }, bill);
  assert.equal(high.chamber.quorum, 257);
  assert.equal(high.senate.quorum, 41);
  assert.ok(high.chamber.support > low.chamber.support);
  assert.ok(high.senate.support > low.senate.support);
});

test("negotiation costs AP and increases projected support", () => {
  const state = ensureLegislativeProceedings(createInitialGameState(), [legislativeAction()], 1);
  const bill = state.legislativeProceedings[0];
  const before = calculateCongressSupport(state, bill);
  const result = applyCongressAction(state, bill.id, "NEGOTIATE");
  const afterBill = result.state.legislativeProceedings[0];
  const after = calculateCongressSupport(result.state, afterBill);
  assert.equal(result.state.actionPoints, state.actionPoints - 1);
  assert.ok(after.chamber.support > before.chamber.support);
  assert.equal(afterBill.status, "NEGOTIATING");
});

test("Chamber can pass while Senate fails, leaving legislation failed", () => {
  let state = ensureLegislativeProceedings(createInitialGameState(), [legislativeAction("split-vote")], 1);
  state = { ...state, congressionalSupport: 58, actionPoints: 3, legislativeProceedings: state.legislativeProceedings.map((bill) => ({ ...bill, senateModifier: -30 })) };
  const result = resolveCongressVote(state, state.legislativeProceedings[0].id);
  assert.equal(result.voteResult?.chamber.passed, true);
  assert.equal(result.voteResult?.senate.passed, false);
  assert.equal(result.state.legislativeProceedings[0].status, "FAILED");
  assert.equal(result.state.legislativeProceedings[0].actionResolution.status, "FAILED");
});

test("both chambers can pass and retain the associated action id", () => {
  let state = ensureLegislativeProceedings(createInitialGameState(), [legislativeAction("passing-bill")], 1);
  state = { ...state, congressionalSupport: 75, actionPoints: 3, legislativeProceedings: state.legislativeProceedings.map((bill) => ({ ...bill, supportModifier: 15, senateModifier: 15 })) };
  const result = resolveCongressVote(state, state.legislativeProceedings[0].id);
  const bill = result.state.legislativeProceedings[0];
  assert.equal(bill.voteResult?.chamber.passed, true);
  assert.equal(bill.voteResult?.senate.passed, true);
  assert.equal(bill.status, "PASSED");
  assert.equal(bill.actionId, "passing-bill");
  assert.equal(bill.actionResolution.status, "EXECUTED");
});

test("voting is reproducible for identical state and proceeding", () => {
  const state = ensureLegislativeProceedings(createInitialGameState(), [legislativeAction("repeatable")], 1);
  assert.deepEqual(
    resolveCongressVote(state, state.legislativeProceedings[0].id).voteResult,
    resolveCongressVote(state, state.legislativeProceedings[0].id).voteResult
  );
});

test("old saves hydrate with an empty Congress docket", () => {
  const oldSave = createInitialGameState() as Partial<ReturnType<typeof createInitialGameState>>;
  delete oldSave.legislativeProceedings;
  assert.deepEqual(hydrateGameState(oldSave).legislativeProceedings, []);
});

const PLAYTEST_ORDER = "Introduce legislation to raise the top federal income tax rate by 5 percentage points and use the additional revenue to increase healthcare spending.";

test("playtest compound order deterministically enters Congress and retains debug linkage", () => {
  const draftAction = { ...legislativeAction("playtest-package"), rawOrder: PLAYTEST_ORDER, actionType: "UNKNOWN" as const, authority: { type: "UNKNOWN" as const }, validationIssues: [], status: "PROPOSED" as const };
  const inferred = inferExplicitLegislativeAction(draftAction);
  assert.ok(inferred);
  const validated = applyActionValidation(createInitialGameState(), inferred);
  const processed = processInstitutionalActions(createInitialGameState(), [validated]);
  const state = ensureLegislativeProceedings(createInitialGameState(), [validated], 1);
  assert.equal(validated.authority.type, "LEGISLATIVE");
  assert.equal(processed[0].disposition, "PENDING");
  assert.equal(state.legislativeProceedings.length, 1);
  assert.equal(state.legislativeProceedings[0].actionId, "playtest-package");
  assert.equal(state.legislativeProceedings[0].id, "bill-playtest-package");
  assert.equal(ensureLegislativeProceedings(state, [validated], 2).legislativeProceedings.length, 1);
});

test("parser normalizes a compound legislative package returned as OTHER", () => {
  const draft = { ...legislativeAction("compound-parser"), rawOrder: PLAYTEST_ORDER };
  const parsed = parseActionInterpretation(JSON.stringify({
    actionType: "OTHER",
    authority: { type: "LEGISLATIVE", institution: "National Congress" },
    targets: [], parameters: {}, estimatedCosts: [], prerequisites: [],
  }), draft);
  assert.equal(parsed.actionType, "LEGISLATIVE_PROPOSAL");
  assert.equal(parsed.authority.type, "LEGISLATIVE");
});

test("malformed legislative action receives a deterministic entry blocker", () => {
  const malformed = applyActionValidation(createInitialGameState(), {
    ...legislativeAction("malformed"), actorId: "USA",
  });
  const decision = assessLegislativeEntry(malformed);
  const processed = processInstitutionalActions(createInitialGameState(), [malformed]);
  assert.equal(decision.entersCongress, false);
  assert.equal(processed[0].disposition, "BLOCKED");
  assert.match(decision.blocker ?? "", /canonical government actor/i);
  assert.equal(ensureLegislativeProceedings(createInitialGameState(), [malformed], 1).legislativeProceedings.length, 0);
});

test("ordinary-law approval is a simple majority of votes cast, distinct from quorum", () => {
  const result = determineChamberOutcome(
    { yes: 250, no: 249, abstain: 14 },
    chamberRule("ORDINARY", "CHAMBER")
  );
  assert.equal(result.quorum, 257);
  assert.equal(result.approvalThreshold, 250);
  assert.equal(result.passed, true);
});

test("turn narrative context exposes the created proceeding as institutional truth", () => {
  const action = legislativeAction("narrative-package");
  const prompt = buildTurnPrompt([action], {
    countryName: "Brazil", playerTitle: "President", turn: 1, date: "January 8, 2026",
    approval: 45, securityIndex: 47, gdpGrowth: 1.8, inflation: 4.6,
    congressionalSupport: 50, militaryMorale: 60, civilLiberties: 70,
    internationalPressure: 20, fdiFlow: 8.4, unemployment: 11.2,
    businessRegistrations: 4200, creditRating: "BB", criminalOrganisations: [],
    recentEvents: [],
    president: { name: "Marina Duarte", age: 48, gender: "they", homeState: "São Paulo", background: "", alignment: "centre", priorities: [], manifesto: "" },
  }, [{
    actionId: action.id,
    disposition: "PENDING",
    legislativeProceedingCreated: true,
    proceedingId: `bill-${action.id}`,
    proceedingStatus: "INTRODUCED",
  }]);
  assert.match(prompt, /Legislative proceeding created: YES/);
  assert.match(prompt, /Proceeding status: INTRODUCED/);
  assert.match(prompt, /SOURCE OF TRUTH/);
});
