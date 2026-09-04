import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialGameState } from "../gameState.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { validateFiscalAction } from "../fiscal.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { developPolicyOptions } from "./generate.ts";
import type { GameState } from "../gameState.ts";

function stateWith(overrides: Partial<GameState["fiscal"]> = {}): GameState {
  const state = createInitialGameState();
  return { ...state, fiscal: { ...state.fiscal, ...overrides } };
}

test("returns exactly three approaches for REDUCE_INFLATION with the preserve-infrastructure constraint", () => {
  const options = developPolicyOptions(stateWith(), "REDUCE_INFLATION", ["PRESERVE_INFRASTRUCTURE_INVESTMENT"], "req-1");
  assert.equal(options.length, 3);
  assert.deepEqual(
    options.map((o) => o.approach).sort(),
    ["EXPENDITURE_LED", "MIXED", "REVENUE_LED"]
  );
});

test("returns [] for an unrelated objective id", () => {
  assert.deepEqual(developPolicyOptions(stateWith(), "REDUCE_ORGANISED_CRIME_FINANCIAL_CAPACITY", [], "req-x"), []);
});

test("is deterministic for identical state", () => {
  const state = stateWith();
  const first = developPolicyOptions(state, "REDUCE_INFLATION", [], "req-2");
  const second = developPolicyOptions(state, "REDUCE_INFLATION", [], "req-2");
  assert.deepEqual(first, second);
});

test("magnitudes respond to FiscalState scale", () => {
  const small = developPolicyOptions(
    stateWith({ discretionaryBudgetAvailable: 5 }),
    "REDUCE_INFLATION",
    [],
    "req-small"
  );
  const large = developPolicyOptions(
    stateWith({ discretionaryBudgetAvailable: 500 }),
    "REDUCE_INFLATION",
    [],
    "req-large"
  );
  const smallExpenditure = small.find((o) => o.approach === "EXPENDITURE_LED");
  const largeExpenditure = large.find((o) => o.approach === "EXPENDITURE_LED");
  assert.ok(smallExpenditure);
  assert.ok(largeExpenditure);
  const smallTotal = smallExpenditure!.actionDrafts.reduce((s, d) => s + Number(d.parameters.amountBRLBillions), 0);
  const largeTotal = largeExpenditure!.actionDrafts.reduce((s, d) => s + Number(d.parameters.amountBRLBillions), 0);
  assert.ok(largeTotal > smallTotal);
});

test("preserve-infrastructure constraint prevents infrastructure cuts", () => {
  // Zero out the other eligible categories so infrastructure would dominate the split
  // if it weren't excluded — proving the filter does real work, not just coincidence.
  const state = stateWith({
    spendingByCategory: {
      ...createInitialGameState().fiscal.spendingByCategory,
      administration: 0,
      other: 0,
      infrastructure: 500,
    },
  });
  const withConstraint = developPolicyOptions(state, "REDUCE_INFLATION", ["PRESERVE_INFRASTRUCTURE_INVESTMENT"], "req-c1");
  const withoutConstraint = developPolicyOptions(state, "REDUCE_INFLATION", [], "req-c2");

  const expenditureWith = withConstraint.find((o) => o.approach === "EXPENDITURE_LED");
  const expenditureWithout = withoutConstraint.find((o) => o.approach === "EXPENDITURE_LED");

  assert.ok(!expenditureWith, "no non-infrastructure headroom exists once infrastructure is excluded");
  assert.ok(expenditureWithout);
  assert.ok(expenditureWithout!.actionDrafts.some((d) => d.parameters.spendingCategory === "infrastructure"));
});

test("generated actions remain within existing fiscal validation bounds", () => {
  const state = stateWith();
  const options = developPolicyOptions(state, "REDUCE_INFLATION", ["PRESERVE_INFRASTRUCTURE_INVESTMENT"], "req-3");
  for (const option of options) {
    for (const draft of option.actionDrafts) {
      const action = {
        id: "test-action",
        actorId: "BRA",
        rawOrder: "test",
        actionType: draft.actionType,
        authority: { type: draft.actionType === "INCREASE_TAX" ? "LEGISLATIVE" : "EXECUTIVE" } as const,
        targets: [],
        parameters: draft.parameters,
        estimatedCosts: [],
        prerequisites: [],
        status: "PROPOSED" as const,
        validationIssues: [],
      };
      const validation = validateFiscalAction(state, action, { legislationPassed: true });
      assert.equal(validation.valid, true, JSON.stringify(validation.issues));
    }
  }
});

test("never produces an amount that exceeds discretionary headroom for the expenditure option", () => {
  const state = stateWith({ discretionaryBudgetAvailable: 3 });
  const options = developPolicyOptions(state, "REDUCE_INFLATION", [], "req-4");
  const expenditure = options.find((o) => o.approach === "EXPENDITURE_LED");
  if (expenditure) {
    const total = expenditure.actionDrafts.reduce((s, d) => s + Number(d.parameters.amountBRLBillions), 0);
    assert.ok(total <= state.fiscal.discretionaryBudgetAvailable * 0.5 + 0.5);
  }
});
