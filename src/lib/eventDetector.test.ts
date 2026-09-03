import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "./gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { detectStateChanges } from "./eventDetector.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createLifecycle } from "./lifecycle.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { postLifecycleExpenditure } from "./fiscal.ts";

test("insignificant numeric change produces no endogenous event", () => {
  const before = createInitialGameState();
  const after = structuredClone(before); after.approval += 1;
  assert.deepEqual(detectStateChanges({ previousState: before, currentState: after }), []);
});

test("meaningful threshold crossing is stable, pure and correctly deduplicated", () => {
  const before = createInitialGameState(); before.approval = 41;
  const after = structuredClone(before); after.approval = 36;
  const snapshot = structuredClone(before);
  const first = detectStateChanges({ previousState: before, currentState: after });
  const second = detectStateChanges({ previousState: before, currentState: after });
  assert.deepEqual(first, second);
  assert.deepEqual(before, snapshot);
  assert.equal(first.filter((event) => event.dedupeKey === "politics:approval:40:down").length, 1);
  const nextBefore = { ...after, eventHistory: first };
  assert.equal(detectStateChanges({ previousState: nextBefore, currentState: structuredClone(nextBefore) }).length, 0);
});

test("Congress passage and failure produce one institutional fact and do not repeat", () => {
  const before = createInitialGameState();
  const base = before.legislativeProceedings[0] ?? {
    id: "bill-test", actionId: "action-test", title: "Federal Test Bill", description: "Test", proposedTurn: 1,
    status: "INTRODUCED" as const, billType: "ORDINARY" as const, requiredInstitution: "National Congress" as const,
    supportModifier: 0, senateModifier: 0, uncertaintyModifier: 0, proposalStrength: 100, concessions: [],
    actionResolution: { actionId: "action-test", status: "PENDING" as const, reason: "Pending" },
    originalAction: { id: "action-test", actorId: "BRA", rawOrder: "Introduce bill", actionType: "LEGISLATIVE_PROPOSAL" as const, authority: { type: "LEGISLATIVE" as const }, targets: [], parameters: {}, estimatedCosts: [], prerequisites: [], status: "PENDING" as const, validationIssues: [] },
  };
  before.legislativeProceedings = [base];
  const passed = structuredClone(before); passed.legislativeProceedings[0].status = "PASSED";
  const passEvents = detectStateChanges({ previousState: before, currentState: passed });
  assert.equal(passEvents.filter((event) => event.type === "LEGISLATION_PASSED").length, 1);
  const repeated = detectStateChanges({ previousState: { ...passed, eventHistory: passEvents }, currentState: structuredClone(passed) });
  assert.equal(repeated.some((event) => event.type === "LEGISLATION_PASSED"), false);
  const failed = structuredClone(before); failed.legislativeProceedings[0].status = "FAILED";
  assert.equal(detectStateChanges({ previousState: before, currentState: failed }).some((event) => event.type === "LEGISLATION_FAILED"), true);
});

test("project transitions surface failure, stall and completion but routine 1% does not", () => {
  const before = createInitialGameState();
  before.projects = [{ ...before.projects[0], lifecycle: { ...createLifecycle(1, 10, 12), status: "ACTIVE", progress: 30, spent: 4.8, remainingBudget: 7.2 } }];
  for (const [status, expected] of [["STALLED", "PROJECT_STALLED"], ["FAILED", "PROJECT_FAILED"], ["COMPLETED", "PROJECT_COMPLETED"]] as const) {
    const after = structuredClone(before); after.projects[0].lifecycle.status = status; after.projects[0].lifecycle.progress = status === "COMPLETED" ? 100 : 31;
    assert.equal(detectStateChanges({ previousState: before, currentState: after }).some((event) => event.type === expected), true);
  }
  const routine = structuredClone(before); routine.projects[0].lifecycle.progress = 31;
  assert.equal(detectStateChanges({ previousState: before, currentState: routine }).some((event) => event.source === "PROJECT"), false);
});

test("operation aggregates material results, high-value arrests and casualties", () => {
  const before = createInitialGameState();
  const after = structuredClone(before);
  const op = after.activeOperations[0];
  op.cumulativeResults.arrests = 37; op.cumulativeResults.highValueArrests = 3; op.cumulativeResults.assetsSeized = 0.42; op.cumulativeResults.facilitiesDisrupted = 2; op.cumulativeResults.criminalCapacityReduction = 12;
  op.cumulativeResults.civilianCasualties = 1;
  const pcc = after.criminalOrganisations.find((org) => org.id === "pcc")!; pcc.capacity = 64;
  const events = detectStateChanges({ previousState: before, currentState: after });
  assert.equal(events.filter((event) => event.type === "OPERATION_BREAKTHROUGH").length, 1);
  assert.equal(events.filter((event) => event.type === "OPERATION_CASUALTIES").length, 1);
  assert.equal(events.filter((event) => event.type === "OPERATION_DEVELOPMENT").length, 0);
});

test("fiscal detector reports major spending and debt crossing, not routine accrual", () => {
  const before = createInitialGameState(); before.fiscal.debtToGDP = 89.9;
  const after = postLifecycleExpenditure(before, { actionId: "major", amount: 6, category: "infrastructure", description: "Major works", kind: "FUND_PROJECT" });
  after.fiscal.debtToGDP = 90.1;
  const events = detectStateChanges({ previousState: before, currentState: after });
  assert.equal(events.some((event) => event.type === "MAJOR_EXPENDITURE"), true);
  assert.equal(events.some((event) => event.type === "DEBT_THRESHOLD"), true);
  const routine = structuredClone(before); routine.fiscal.publicDebt += 0.2; routine.fiscal.debtToGDP += 0.002;
  assert.equal(detectStateChanges({ previousState: before, currentState: routine }).some((event) => event.source === "FISCAL"), false);
});

test("significant economy changes surface while small fluctuations remain quiet", () => {
  const before = createInitialGameState();
  const after = structuredClone(before); after.inflation += 1.2; after.unemployment += 1;
  const events = detectStateChanges({ previousState: before, currentState: after });
  assert.equal(events.some((event) => event.type === "INFLATION_SHIFT"), true);
  assert.equal(events.some((event) => event.type === "UNEMPLOYMENT_SHIFT"), true);
});
