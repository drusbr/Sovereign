import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { createInitialFiscalState } from "../fiscal.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { deriveFiscalStance, deriveOneOffFiscalImpulse } from "./fiscalTransmission.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { DEFAULT_ECONOMY_CALIBRATION } from "./types.ts";
import type { FiscalState } from "../fiscal.ts";

const BASELINE = DEFAULT_ECONOMY_CALIBRATION.baseline;
const PASSTHROUGH = DEFAULT_ECONOMY_CALIBRATION.taxDemandPassthrough;

function fiscal(overrides: Partial<FiscalState> = {}): FiscalState {
  return { ...createInitialFiscalState(), ...overrides };
}

test("at baseline recurring levels, stance is exactly zero", () => {
  const stance = deriveFiscalStance(fiscal(), BASELINE, 5, PASSTHROUGH);
  assert.equal(Math.abs(stance.recurringExpenditureShare), 0);
  assert.equal(Math.abs(stance.recurringRevenueDemandShare), 0);
});

test("recurring expenditure above baseline is a positive (expansionary) share", () => {
  const stance = deriveFiscalStance(
    fiscal({ primaryExpenditure: BASELINE.primaryExpenditure + 20 }),
    BASELINE,
    5,
    PASSTHROUGH
  );
  assert.ok(stance.recurringExpenditureShare > 0);
});

test("recurring expenditure below baseline is a negative (contractionary) share", () => {
  const stance = deriveFiscalStance(
    fiscal({ primaryExpenditure: BASELINE.primaryExpenditure - 20 }),
    BASELINE,
    5,
    PASSTHROUGH
  );
  assert.ok(stance.recurringExpenditureShare < 0);
});

test("recurring revenue above baseline (a tax increase) is a negative demand share", () => {
  const stance = deriveFiscalStance(
    fiscal({ primaryRevenue: BASELINE.primaryRevenue + 20 }),
    BASELINE,
    5,
    PASSTHROUGH
  );
  assert.ok(stance.recurringRevenueDemandShare < 0);
});

test("recurring revenue below baseline (a tax cut) is a positive demand share", () => {
  const stance = deriveFiscalStance(
    fiscal({ primaryRevenue: BASELINE.primaryRevenue - 20 }),
    BASELINE,
    5,
    PASSTHROUGH
  );
  assert.ok(stance.recurringRevenueDemandShare > 0);
});

test("equal-magnitude expenditure and revenue moves produce different demand shares", () => {
  const expenditureCut = deriveFiscalStance(
    fiscal({ primaryExpenditure: BASELINE.primaryExpenditure - 20 }),
    BASELINE,
    5,
    PASSTHROUGH
  );
  const taxIncrease = deriveFiscalStance(
    fiscal({ primaryRevenue: BASELINE.primaryRevenue + 20 }),
    BASELINE,
    5,
    PASSTHROUGH
  );
  // Both are contractionary (negative), but not forced to the same magnitude — the
  // tax-side passthrough is intentionally partial.
  assert.ok(expenditureCut.recurringExpenditureShare < 0);
  assert.ok(taxIncrease.recurringRevenueDemandShare < 0);
  assert.notEqual(
    Math.abs(expenditureCut.recurringExpenditureShare),
    Math.abs(taxIncrease.recurringRevenueDemandShare)
  );
  assert.ok(Math.abs(expenditureCut.recurringExpenditureShare) > Math.abs(taxIncrease.recurringRevenueDemandShare));
});

test("one-off spending recorded this turn produces a positive impulse", () => {
  const state = fiscal({
    ledger: [
      {
        id: "l1", actionId: "a1", turn: 7, date: "d", kind: "EMERGENCY_ALLOCATION", timing: "ONE_OFF",
        amount: 10, category: "other", balanceImpact: -10, debtImpact: 10, funding: "DEFICIT_FINANCED",
        description: "test", originType: "ACTION", annualRunRateImpact: 0, currentTurnCashImpact: -10,
      },
    ],
  });
  const impulse = deriveOneOffFiscalImpulse(state, 7, DEFAULT_ECONOMY_CALIBRATION.governmentDemandPassthrough);
  assert.ok(impulse > 0);
});

test("one-off ledger entries from a different turn are ignored", () => {
  const state = fiscal({
    ledger: [
      {
        id: "l1", actionId: "a1", turn: 3, date: "d", kind: "EMERGENCY_ALLOCATION", timing: "ONE_OFF",
        amount: 10, category: "other", balanceImpact: -10, debtImpact: 10, funding: "DEFICIT_FINANCED",
        description: "test", originType: "ACTION", annualRunRateImpact: 0, currentTurnCashImpact: -10,
      },
    ],
  });
  assert.equal(
    Math.abs(deriveOneOffFiscalImpulse(state, 7, DEFAULT_ECONOMY_CALIBRATION.governmentDemandPassthrough)),
    0
  );
});

test("recurring ledger entries (already reflected in primaryExpenditure) are not double-counted as a one-off impulse", () => {
  const state = fiscal({
    ledger: [
      {
        id: "l1", actionId: "a1", turn: 7, date: "d", kind: "INCREASE_SPENDING", timing: "ANNUAL_RECURRING",
        amount: 10, category: "other", balanceImpact: -10, debtImpact: 0, funding: "CURRENT_ALLOCATION",
        description: "test", originType: "ACTION", annualRunRateImpact: -10, currentTurnCashImpact: -10 / 52,
      },
    ],
  });
  assert.equal(
    Math.abs(deriveOneOffFiscalImpulse(state, 7, DEFAULT_ECONOMY_CALIBRATION.governmentDemandPassthrough)),
    0
  );
});
