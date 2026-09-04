import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { getCountryKnowledge } from "./registry.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { getActionDefinition, getCandidateActionsForObjective, getInstitution, getInstrument, getStructuralConstraints, resolveBillTypeHint } from "./lookup.ts";

const brazil = getCountryKnowledge("BRA");

test("registry returns Brazil knowledge by canonical country id", () => {
  assert.ok(brazil);
  assert.equal(brazil?.countryId, "BRA");
});

test("registry returns undefined for an unknown country id", () => {
  assert.equal(getCountryKnowledge("ZZZ"), undefined);
});

test("institution lookup resolves known ids and fails gracefully for unknown ids", () => {
  assert.ok(brazil);
  assert.equal(getInstitution(brazil!, "banco_central")?.independent, true);
  assert.equal(getInstitution(brazil!, "banco_central")?.authorityType, "INDEPENDENT");
  assert.equal(getInstitution(brazil!, "not-a-real-institution"), undefined);
});

test("instrument lookup resolves known ids and fails gracefully for unknown ids", () => {
  assert.ok(brazil);
  const instrument = getInstrument(brazil!, "CONSTITUTIONAL_AMENDMENT");
  assert.equal(instrument?.billTypeHint, "CONSTITUTIONAL_AMENDMENT");
  assert.equal(getInstrument(brazil!, "NOT_A_REAL_INSTRUMENT"), undefined);
});

test("action definition lookup resolves known ids and fails gracefully for unknown ids", () => {
  assert.ok(brazil);
  const definition = getActionDefinition(brazil!, "federal_healthcare_spending_increase");
  assert.equal(definition?.instrumentId, "SPENDING_ADJUSTMENT");
  assert.equal(getActionDefinition(brazil!, "not-a-real-action"), undefined);
});

test("bill type hint resolves only for legislative-track instruments", () => {
  assert.ok(brazil);
  assert.equal(resolveBillTypeHint(brazil!, "CONSTITUTIONAL_AMENDMENT"), "CONSTITUTIONAL_AMENDMENT");
  assert.equal(resolveBillTypeHint(brazil!, "SPENDING_ADJUSTMENT"), undefined);
  assert.equal(resolveBillTypeHint(brazil!, "not-a-real-instrument"), undefined);
});

test("candidate action lookup returns only lawful, non-blocked actions for an objective", () => {
  assert.ok(brazil);
  const candidates = getCandidateActionsForObjective(brazil!, "REDUCE_INFLATION");
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every((item: { structurallyBlocked?: boolean }) => !item.structurallyBlocked));
  assert.ok(candidates.some((item: { id: string }) => item.id === "fiscal_consolidation_for_disinflation"));
  assert.ok(!candidates.some((item: { id: string }) => item.id === "direct_policy_rate_directive"));
});

test("candidate action lookup returns an empty array for an unknown objective id", () => {
  assert.ok(brazil);
  assert.deepEqual(getCandidateActionsForObjective(brazil!, "not-a-real-objective"), []);
});

test("structural constraints lookup fails gracefully for unknown action ids", () => {
  assert.ok(brazil);
  assert.deepEqual(getStructuralConstraints(brazil!, "not-a-real-action"), []);
});

test("Country Knowledge contains no mechanical simulation effect fields", () => {
  assert.ok(brazil);
  const serialized = JSON.stringify(brazil);
  for (const forbidden of [
    "approvalEffect",
    "gdpEffect",
    "successChance",
    "approvalChange",
    "securityIndexChange",
    "\"effects\":",
  ]) {
    assert.ok(!serialized.includes(forbidden), `Country Knowledge must not contain "${forbidden}"`);
  }
});
