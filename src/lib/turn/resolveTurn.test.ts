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

// --- Advance Turn / no orders issued --------------------------------------
// Declining to issue any presidential order is a legitimate strategic choice, not
// an invalid input. resolveTurn must run the full deterministic turn pipeline with
// an empty actions array — no fake action, no reduced simulation path.

const noOrdersAiResult: TurnResult = {
  narrative: "No new presidential orders were issued this week.",
  effects: {},
  organisationEffects: [],
  stateSecurityChanges: [],
  newOperation: null,
  newProject: null,
  situationSummary: "The situation is unchanged from the previous week.",
  eventSummary: "No new orders were issued.",
};

test("resolveTurn succeeds with an empty actions array", () => {
  const initial = createInitialGameState();
  assert.doesNotThrow(() => resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult }));
});

test("an empty-order turn still advances turn number and date, and resets AP", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });
  assert.equal(draft.state.turn, initial.turn + 1);
  assert.equal(draft.state.date, "January 15, 2026");
  assert.equal(draft.state.actionPoints, 3);
});

test("an empty-order turn still runs the fiscal weekly close", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });
  // The seed fiscal state runs a recurring deficit, so one week's close should
  // visibly accrue debt even with zero player actions.
  assert.ok(draft.state.fiscal.publicDebt > initial.fiscal.publicDebt);
});

test("an empty-order turn still advances Economic Simulation V2", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });
  // advanceEconomy() ran and stamped this turn's fiscal-stance snapshot, proving the
  // causal economy engine executed rather than being skipped for an empty turn.
  assert.equal(draft.state.economyDynamics.previousFiscalStance.turn, draft.state.turn);
  assert.ok(Number.isFinite(draft.state.gdpGrowth));
  assert.ok(Number.isFinite(draft.state.inflation));
  assert.ok(Number.isFinite(draft.state.unemployment));
});

test("an empty-order turn still progresses active project/operation lifecycles", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });
  const progressed = initial.projects.some((seed) => {
    const advanced = draft.state.projects.find((p) => p.id === seed.id);
    return advanced && advanced.lifecycle.spent > seed.lifecycle.spent;
  });
  assert.ok(progressed, "at least one seed project should have spent budget this turn with no player action needed");
});

test("an empty-order turn creates no fake action or fabricated history entry", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });
  assert.deepEqual(draft.turnRecord.actions, []);
  assert.equal(draft.turnRecord.orders, "");
  assert.deepEqual(draft.actionResolutions, []);
});

test("an empty-order turn does not require any mechanical LLM effects", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });
  // The supplied aiResult carried zero effects; nothing in the pipeline needed more
  // than the deterministic no-op shape to produce a valid, advanced turn.
  assert.deepEqual(draft.generatedEffects, {});
});

test("a READY Policy Development request does not block an empty-order turn from advancing", () => {
  const initial = createInitialGameState();
  const withReadyRequest = {
    ...initial,
    policyDevelopmentRequests: [
      {
        id: "policy-request-1-1",
        rawInstruction: "Reduce inflation without sacrificing infrastructure investment.",
        objectiveId: "REDUCE_INFLATION",
        constraintIds: ["PRESERVE_INFRASTRUCTURE_INVESTMENT"],
        status: "READY" as const,
        options: [],
        createdTurn: 1,
        expiresOnTurn: 7,
      },
    ],
  };
  const draft = resolveTurn({ state: withReadyRequest, actions: [], aiResult: noOrdersAiResult });
  assert.equal(draft.state.turn, withReadyRequest.turn + 1);
  // Untouched — advancing time neither resolves nor discards it.
  assert.equal(draft.state.policyDevelopmentRequests[0].status, "READY");
});
