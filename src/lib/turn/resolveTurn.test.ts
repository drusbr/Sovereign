import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { finalizeTurn, resolveTurn } from "./resolveTurn.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { deriveOneOffFiscalImpulse } from "../economy/fiscalTransmission.ts";
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
  // causal economy engine executed rather than being skipped for an empty turn. It's
  // labelled with the completed turn (1), not the already-advanced state.turn (2).
  assert.equal(draft.state.economyDynamics.previousFiscalStance.turn, draft.turnRecord.turn);
  assert.equal(draft.state.economyDynamics.previousFiscalStance.turn, draft.state.turn - 1);
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

// --- Economic V2 fiscal-attribution regression (turn-index fix) -----------
// A lifecycle expenditure is stamped with the turn it actually occurred in
// (postLifecycleExpenditure, unchanged), but by the time advanceEconomy runs,
// state.turn has already advanced past it. These prove the completed-turn value is
// threaded through correctly so that spend is still found.

test("a lifecycle expenditure stamped turn N is included in the economy calculation even though state.turn has already advanced to N+1", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });

  // The turn that was just completed (and whose ledger entries are stamped with it).
  assert.equal(draft.turnRecord.turn, 1);
  // GameState has already moved on to the next turn by the time this runs.
  assert.equal(draft.state.turn, 2);

  const completedTurnLedgerEntries = draft.state.fiscal.ledger.filter(
    (entry) => entry.turn === 1 && entry.timing === "ONE_OFF"
  );
  assert.ok(completedTurnLedgerEntries.length > 0, "the seed projects/operations should have spent this turn");

  // Real demand pressure — zero would mean the fiscal-attribution bug regressed.
  assert.notEqual(draft.state.economyDynamics.demandPressure, 0);
});

test("deriveOneOffFiscalImpulse is nonzero for a real project-spending no-order turn", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });

  // Using the completed turn (1) — matches how advanceEconomy is now called.
  const impulse = deriveOneOffFiscalImpulse(draft.state.fiscal, 1, 1.0);
  assert.notEqual(impulse, 0);

  // Using the (incorrect, pre-fix) post-increment turn must still yield nothing —
  // proves this isn't accidentally matching on both turn numbers.
  const wrongTurnImpulse = deriveOneOffFiscalImpulse(draft.state.fiscal, 2, 1.0);
  assert.equal(Math.abs(wrongTurnImpulse), 0);
});

test("no double-counting: a second consecutive turn's impulse reflects only that turn's fresh ledger entries", () => {
  let state = createInitialGameState();
  const draftTurn1 = resolveTurn({ state, actions: [], aiResult: noOrdersAiResult });
  state = finalizeTurn(draftTurn1, {
    plan: { deterministicEvents: [], randomSeeds: [], generateNovel: false, cooldownUpdates: {} },
  }).state;

  const draftTurn2 = resolveTurn({ state, actions: [], aiResult: noOrdersAiResult });
  assert.equal(draftTurn2.turnRecord.turn, 2);

  // The ledger now holds both turns' entries (it accumulates), but the derived impulse
  // for turn 2 must come only from turn-2-stamped entries, not turn 1's as well.
  const turn1Entries = draftTurn2.state.fiscal.ledger.filter((e) => e.turn === 1 && e.timing === "ONE_OFF");
  const turn2Entries = draftTurn2.state.fiscal.ledger.filter((e) => e.turn === 2 && e.timing === "ONE_OFF");
  assert.ok(turn1Entries.length > 0 && turn2Entries.length > 0, "both turns should have posted lifecycle spend");

  const turn2Impulse = deriveOneOffFiscalImpulse(draftTurn2.state.fiscal, 2, 1.0);
  const combinedIfDoubleCounted = deriveOneOffFiscalImpulse(
    { ...draftTurn2.state.fiscal, ledger: [...turn1Entries, ...turn2Entries] },
    2,
    1.0
  );
  // Since deriveOneOffFiscalImpulse filters by entry.turn, restricting the ledger to
  // just these two turns' entries and asking for turn 2 must equal asking on the full
  // ledger for turn 2 — proving turn-1 entries were never included in the turn-2 figure.
  assert.equal(turn2Impulse, combinedIfDoubleCounted);
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

// --- Turn metrics history -------------------------------------------------

test("finalizeTurn appends exactly one turn-metrics snapshot per completed turn, labelled with the completed turn", () => {
  const initial = createInitialGameState();
  const startingCount = initial.turnMetricsHistory.length; // 1 (the Turn 0 snapshot)
  const result = finish([action()]);
  assert.equal(result.state.turnMetricsHistory.length, startingCount + 1);
  const latest = result.state.turnMetricsHistory.at(-1)!;
  // The snapshot is labelled with the turn that was just completed (1), not the
  // already-advanced state.turn (2) — this is the exact regression this test guards.
  assert.equal(latest.turn, result.turnRecord.turn);
  assert.equal(latest.turn, 1);
  assert.equal(result.state.turn, 2);
  assert.equal(latest.activity.actionsIssued, 1);
});

test("a no-order turn also appends exactly one turn-metrics snapshot, correctly numbered", () => {
  const initial = createInitialGameState();
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });
  const result = finalizeTurn(draft, {
    plan: { deterministicEvents: [], randomSeeds: [], generateNovel: false, cooldownUpdates: {} },
  });
  assert.equal(result.state.turnMetricsHistory.length, initial.turnMetricsHistory.length + 1);
  const latest = result.state.turnMetricsHistory.at(-1)!;
  assert.equal(latest.turn, result.turnRecord.turn);
  assert.equal(latest.turn, 1);
  assert.equal(result.state.turn, 2);
  assert.equal(latest.activity.actionsIssued, 0);
});

test("turn-metrics history is numbered 0, 1, 2, 3... with no skipped turn across several completed turns", () => {
  let state = createInitialGameState();
  for (let i = 0; i < 3; i++) {
    const draft = resolveTurn({ state, actions: [action()], aiResult });
    const result = finalizeTurn(draft, {
      plan: { deterministicEvents: [], randomSeeds: [], generateNovel: false, cooldownUpdates: {} },
    });
    state = result.state;
  }
  assert.deepEqual(
    state.turnMetricsHistory.map((snapshot) => snapshot.turn),
    [0, 1, 2, 3]
  );
});

test("the appended snapshot reflects post-turn Economic Simulation V2 and fiscal state, not pre-turn values", () => {
  const result = finish([action()]);
  const latest = result.state.turnMetricsHistory.at(-1)!;
  assert.equal(latest.economyDynamics.demandPressure, result.state.economyDynamics.demandPressure);
  assert.equal(latest.fiscal.publicDebt, result.state.fiscal.publicDebt);
  assert.equal(latest.economy.gdpGrowth, result.state.gdpGrowth);
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

test("a due COPOM meeting runs autonomously inside the turn and reaches metrics/events once", () => {
  const initial = createInitialGameState();
  initial.monetaryPolicy.nextMeetingDate = initial.date;
  const draft = resolveTurn({ state: initial, actions: [], aiResult: noOrdersAiResult });
  assert.equal(draft.state.monetaryPolicy.decisionHistory.length, 1);
  assert.ok(draft.economicAttribution.demand.monetaryPolicy < 0);
  const result = finalizeTurn(draft, {
    plan: { deterministicEvents: [], randomSeeds: [], generateNovel: false, cooldownUpdates: {} },
  });
  const decision = result.state.monetaryPolicy.decisionHistory[0];
  assert.equal(result.state.turnMetricsHistory.at(-1)?.monetary.copomDecision, decision.decision);
  assert.equal(result.eventFacts.filter((event) => event.type === "COPOM_DECISION").length, 1);
  assert.equal(result.state.newsArticles.filter((article) => article.eventFactIds?.some((id) => id.includes("fact-"))).some((article) => /COPOM|Selic/.test(article.headline)), true);
});
