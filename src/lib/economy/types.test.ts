import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { stripExternallyForbiddenEconomicEffects, ECONOMY_OWNED_MACRO_KEYS } from "./types.ts";

test("strips gdpGrowth, inflation, unemployment and sovereignDebt", () => {
  const stripped = stripExternallyForbiddenEconomicEffects({
    approval: 5,
    gdpGrowth: -3,
    inflation: 2,
    unemployment: 1,
    sovereignDebt: 10,
    fdiFlow: 0.4,
  });
  assert.deepEqual(stripped, { approval: 5, fdiFlow: 0.4 });
});

test("is a no-op when no forbidden keys are present", () => {
  const effects = { approval: 5, congressionalSupport: -2 };
  assert.deepEqual(stripExternallyForbiddenEconomicEffects(effects), effects);
});

test("does not mutate the input object", () => {
  const effects = { gdpGrowth: 5 };
  stripExternallyForbiddenEconomicEffects(effects);
  assert.deepEqual(effects, { gdpGrowth: 5 });
});

test("ECONOMY_OWNED_MACRO_KEYS is exactly the three migrated fields", () => {
  assert.deepEqual([...ECONOMY_OWNED_MACRO_KEYS].sort(), ["gdpGrowth", "inflation", "unemployment"]);
});

test("world events cannot create a sovereignDebt value diverging from FiscalState — the field is unwritable via this path", () => {
  // Mirrors the exact application pattern in GameContext.tsx's respondToWorldEvent:
  // a world-event option that tries to set sovereignDebt directly has it stripped
  // before applyNumericEffects ever sees it, so it can never diverge from
  // fiscal.debtToGDP in the first place.
  const optionEffects = { approval: 2, sovereignDebt: 999 };
  const applied = stripExternallyForbiddenEconomicEffects(optionEffects);
  assert.equal("sovereignDebt" in applied, false);
});
