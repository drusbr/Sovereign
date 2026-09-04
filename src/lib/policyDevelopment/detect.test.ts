import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { detectPolicyObjective } from "./detect.ts";

test("recognises the canonical inflation + infrastructure instruction", () => {
  const result = detectPolicyObjective("Reduce inflation without sacrificing infrastructure investment.");
  assert.deepEqual(result, {
    objectiveId: "REDUCE_INFLATION",
    constraintIds: ["PRESERVE_INFRASTRUCTURE_INVESTMENT"],
  });
});

test("recognises 'reduce inflation without cutting infrastructure'", () => {
  const result = detectPolicyObjective("Reduce inflation without cutting infrastructure.");
  assert.equal(result?.objectiveId, "REDUCE_INFLATION");
  assert.deepEqual(result?.constraintIds, ["PRESERVE_INFRASTRUCTURE_INVESTMENT"]);
});

test("recognises 'bring inflation down but protect infrastructure investment'", () => {
  const result = detectPolicyObjective("Bring inflation down but protect infrastructure investment.");
  assert.equal(result?.objectiveId, "REDUCE_INFLATION");
  assert.deepEqual(result?.constraintIds, ["PRESERVE_INFRASTRUCTURE_INVESTMENT"]);
});

test("recognises 'lower inflation while keeping infrastructure spending'", () => {
  const result = detectPolicyObjective("Lower inflation while keeping infrastructure spending.");
  assert.equal(result?.objectiveId, "REDUCE_INFLATION");
  assert.deepEqual(result?.constraintIds, ["PRESERVE_INFRASTRUCTURE_INVESTMENT"]);
});

test("recognises the inflation objective without an infrastructure clause, with no constraint", () => {
  const result = detectPolicyObjective("We need to bring down inflation this year.");
  assert.equal(result?.objectiveId, "REDUCE_INFLATION");
  assert.deepEqual(result?.constraintIds, []);
});

test("ordinary fiscal orders remain unmatched", () => {
  assert.equal(detectPolicyObjective("Increase healthcare spending by R$20bn annually."), null);
});

test("ordinary security orders remain unmatched", () => {
  assert.equal(detectPolicyObjective("Intensify federal investigations into PCC financial networks."), null);
});

test("empty text is unmatched", () => {
  assert.equal(detectPolicyObjective(""), null);
  assert.equal(detectPolicyObjective("   "), null);
});

test("infrastructure mentioned without any protective language does not add the constraint", () => {
  const result = detectPolicyObjective("Reduce inflation and infrastructure spending together.");
  assert.equal(result?.objectiveId, "REDUCE_INFLATION");
  assert.deepEqual(result?.constraintIds, []);
});
