import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState, hydrateGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createLegislativeProceeding } from "../congress.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { applyFiscalAction } from "../fiscal.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { resolveTurn } from "../turn/resolveTurn.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createPolicyDevelopmentRequest, resolvePolicyDevelopmentRequest } from "./request.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { compileDevelopedOption } from "./compile.ts";
import type { GameState } from "../gameState.ts";

const zeroAI = {
  narrative: "n", effects: {}, organisationEffects: [], stateSecurityChanges: [],
  newOperation: null, newProject: null, situationSummary: "s", eventSummary: "e",
};

test("a strategic objective creates a READY request with three options", () => {
  const state = createInitialGameState();
  const request = createPolicyDevelopmentRequest(
    state,
    "Reduce inflation without sacrificing infrastructure investment."
  );
  assert.ok(request);
  assert.equal(request!.status, "READY");
  assert.equal(request!.objectiveId, "REDUCE_INFLATION");
  assert.deepEqual(request!.constraintIds, ["PRESERVE_INFRASTRUCTURE_INVESTMENT"]);
  assert.equal(request!.options.length, 3);
  assert.equal(request!.selectedOptionId, undefined);
  assert.ok(request!.expiresOnTurn > request!.createdTurn);
});

test("a non-matching order produces no request", () => {
  const state = createInitialGameState();
  assert.equal(createPolicyDevelopmentRequest(state, "Dismiss the Finance Minister."), null);
});

test("resolving a request marks it RESOLVED with the selected option id, without touching options", () => {
  const state = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Lower inflation while keeping infrastructure spending.")!;
  const withRequest = { ...state, policyDevelopmentRequests: [request] };
  const optionId = request.options[0].id;
  const resolved = resolvePolicyDevelopmentRequest(withRequest, request.id, optionId);
  const stored = resolved.policyDevelopmentRequests[0];
  assert.equal(stored.status, "RESOLVED");
  assert.equal(stored.selectedOptionId, optionId);
  assert.deepEqual(stored.options, request.options);
});

test("old saves hydrate with policyDevelopmentRequests: []", () => {
  const oldSave = createInitialGameState() as Partial<ReturnType<typeof createInitialGameState>>;
  delete oldSave.policyDevelopmentRequests;
  assert.deepEqual(hydrateGameState(oldSave).policyDevelopmentRequests, []);
});

test("requests and generated options survive save/hydration", () => {
  const state = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.")!;
  const saved = { ...state, policyDevelopmentRequests: [request] };
  const hydrated = hydrateGameState(saved);
  assert.deepEqual(hydrated.policyDevelopmentRequests, [request]);
});

test("the strategic objective itself is never inserted into resolveTurn — only compiled actions are", () => {
  const state = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.")!;
  // resolveTurn's action pipeline is untouched by request creation: it is a
  // GameState mutation only, never a call into resolveTurn/institutionalProcessing.
  const withRequest: GameState = { ...state, policyDevelopmentRequests: [request] };
  const result = resolveTurn({ state: withRequest, actions: [], aiResult: zeroAI });
  assert.equal(result.state.policyDevelopmentRequests.length, 1);
  assert.equal(result.state.policyDevelopmentRequests[0].status, "READY");
  assert.equal(result.actionResolutions.length, 0);
});

test("revenue action produces a normal CONSTITUTIONAL-free LegislativeProceeding via existing Congress code", () => {
  const state = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.")!;
  const revenueOption = request.options.find((o) => o.approach === "REVENUE_LED")!;
  const [revenueAction] = compileDevelopedOption(revenueOption, request, state);
  const bill = createLegislativeProceeding(revenueAction, state.turn);
  assert.equal(bill.billType, "ORDINARY");
  assert.equal(bill.actionId, revenueAction.id);
});

test("expenditure action reaches the existing fiscal engine unchanged", () => {
  const state = createInitialGameState();
  const request = createPolicyDevelopmentRequest(state, "Reduce inflation without sacrificing infrastructure investment.")!;
  const expenditureOption = request.options.find((o) => o.approach === "EXPENDITURE_LED")!;
  const [expenditureAction] = compileDevelopedOption(expenditureOption, request, state);
  const result = applyFiscalAction(state, expenditureAction);
  assert.ok(result.entry);
  assert.equal(result.entry!.kind, "DECREASE_SPENDING");
  assert.ok(result.state.fiscal.discretionaryBudgetAvailable > state.fiscal.discretionaryBudgetAvailable);
});
