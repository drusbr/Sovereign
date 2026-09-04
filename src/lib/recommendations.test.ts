import assert from "node:assert/strict";
import test from "node:test";
import { createInitialGameState, hydrateGameState } from "./gameState";
import { generatePolicyRecommendations } from "./recommendations";

test("recommendations derive from current authoritative state", () => {
  const state = createInitialGameState();
  state.inflation = 9;
  state.fiscal.debtToGDP = 101;
  state.congressionalSupport = 32;
  const result = generatePolicyRecommendations(state);
  assert.ok(result.some((item) => item.id === "inflation-control"));
  assert.ok(result.some((item) => item.id === "fiscal-consolidation"));
  assert.ok(result.some((item) => item.id === "coalition-repair"));
  assert.ok(result.every((item) => item.rationale && item.action && item.institution));
});

test("recommendations are deterministic and old saves hydrate safely", () => {
  const state = createInitialGameState();
  assert.deepEqual(generatePolicyRecommendations(state), generatePolicyRecommendations(structuredClone(state)));
  const legacy = { ...state } as Partial<typeof state>;
  delete legacy.policyRecommendations;
  delete legacy.policyImplementations;
  const hydrated = hydrateGameState(legacy);
  assert.deepEqual(hydrated.policyRecommendations, []);
  assert.deepEqual(hydrated.policyImplementations, []);
});
