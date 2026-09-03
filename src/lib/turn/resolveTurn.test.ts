import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { finalizeTurn, resolveTurn } from "./resolveTurn.ts";
import type { ProposedAction } from "../actions/types.ts";
import type { TurnResult } from "../aiPrompts.ts";

function action(authority: ProposedAction["authority"] = { type: "EXECUTIVE" }): ProposedAction {
  return {
    id: `action-${authority.type.toLowerCase()}`,
    actorId: "BRA",
    rawOrder: "Direct the Health Ministry to publish hospital waiting-time data.",
    actionType: "POLICY_DIRECTIVE",
    authority,
    targets: [{ id: "health", type: "INSTITUTION", name: "Ministry of Health" }],
    parameters: {},
    estimatedCosts: [],
    prerequisites: [],
    status: "PROPOSED",
    validationIssues: [],
  };
}

const aiResult: TurnResult = {
  narrative: "The ministry published the data.",
  effects: { approval: 2, securityIndex: 1 },
  organisationEffects: [],
  stateSecurityChanges: [],
  newOperation: null,
  newProject: null,
  situationSummary: "Public-service transparency has increased.",
  eventSummary: "Hospital waiting-time data was published.",
};

function finish(actions: ProposedAction[]) {
  const draft = resolveTurn({ state: createInitialGameState(), actions, aiResult });
  return finalizeTurn(draft, {
    plan: { deterministicEvents: [], randomSeeds: [], generateNovel: false, cooldownUpdates: {} },
  });
}

test("resolves a valid turn, applies effects and advances turn/date", () => {
  const result = finish([action()]);
  assert.equal(result.state.turn, 2);
  assert.equal(result.state.date, "January 15, 2026");
  assert.equal(result.state.approval, 47);
  assert.equal(result.actionResolutions[0].status, "EXECUTED");
  assert.equal(result.actionResolutions[0].actionId, "action-executive");
});

test("institutionally blocked action survives as blocked", () => {
  const result = finish([action({ type: "INDEPENDENT", institution: "Banco Central" })]);
  assert.equal(result.actionResolutions[0].status, "BLOCKED");
  assert.match(result.actionResolutions[0].reason ?? "", /independent/i);
  assert.equal(result.turnRecord.actions?.[0].id, "action-independent");
});

test("legislative action creates a pending proceeding without applying policy effects", () => {
  const legislative = action({ type: "LEGISLATIVE", institution: "National Congress" });
  legislative.actionType = "LEGISLATIVE_PROPOSAL";
  legislative.rawOrder = "Introduce legislation to raise the top federal income tax rate by 5 percentage points and use the additional revenue to increase healthcare spending.";
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [legislative], aiResult });
  assert.equal(draft.actionResolutions[0].status, "PENDING");
  assert.equal(draft.state.legislativeProceedings.length, 1);
  assert.equal(draft.state.legislativeProceedings[0].actionId, legislative.id);
  assert.equal(draft.actionResolutions[0].proceedingId, `bill-${legislative.id}`);
  assert.equal(draft.turnRecord.institutionalRecords?.[0].proceedingCreated, true);
  assert.equal(draft.turnRecord.institutionalRecords?.[0].proceedingId, `bill-${legislative.id}`);
  assert.equal(draft.state.approval, initial.approval);
  assert.deepEqual(draft.generatedEffects, {});
});

test("does not mutate the original state", () => {
  const state = createInitialGameState();
  const snapshot = structuredClone(state);
  const draft = resolveTurn({ state, actions: [action()], aiResult });
  finalizeTurn(draft, {
    plan: { deterministicEvents: [], randomSeeds: [], generateNovel: false, cooldownUpdates: {} },
  });
  assert.deepEqual(state, snapshot);
});

test("equivalent deterministic inputs produce equivalent outputs", () => {
  assert.deepEqual(finish([action()]), finish([action()]));
});
