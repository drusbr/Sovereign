import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { parseTurnResponse } from "./aiPrompts.ts";

function raw(effects: Record<string, number>): string {
  return JSON.stringify({
    narrative: "Something happened.",
    effects,
    organisationEffects: [],
    stateSecurityChanges: [],
    newOperation: null,
    newProject: null,
    situationSummary: "s",
    eventSummary: "e",
  });
}

test("turn parser drops a forbidden gdpGrowth effect", () => {
  const result = parseTurnResponse(raw({ approval: 3, gdpGrowth: 5 }));
  assert.equal(result.effects.approval, 3);
  assert.equal("gdpGrowth" in result.effects, false);
});

test("turn parser drops a forbidden inflation effect", () => {
  const result = parseTurnResponse(raw({ inflation: -2 }));
  assert.equal("inflation" in result.effects, false);
});

test("turn parser drops a forbidden unemployment effect", () => {
  const result = parseTurnResponse(raw({ unemployment: -3 }));
  assert.equal("unemployment" in result.effects, false);
});

test("turn parser still applies ordinary allowed non-economic effects", () => {
  const result = parseTurnResponse(
    raw({
      approval: 4,
      securityIndex: -2,
      congressionalSupport: 1,
      militaryMorale: 3,
      civilLiberties: -1,
      internationalPressure: 2,
      fdiFlow: 0.5,
      businessRegistrations: 20,
      gdpGrowth: 99,
      inflation: 99,
      unemployment: 99,
    })
  );
  assert.equal(result.effects.approval, 4);
  assert.equal(result.effects.securityIndex, -2);
  assert.equal(result.effects.congressionalSupport, 1);
  assert.equal(result.effects.militaryMorale, 3);
  assert.equal(result.effects.civilLiberties, -1);
  assert.equal(result.effects.internationalPressure, 2);
  assert.equal(result.effects.fdiFlow, 0.5);
  assert.equal(result.effects.businessRegistrations, 20);
  assert.equal("gdpGrowth" in result.effects, false);
  assert.equal("inflation" in result.effects, false);
  assert.equal("unemployment" in result.effects, false);
  // Only the 8 allowed keys, never more.
  assert.equal(Object.keys(result.effects).length, 8);
});

test("turn parser handles effects containing only forbidden keys as an empty effects map", () => {
  const result = parseTurnResponse(raw({ gdpGrowth: 5, inflation: 5, unemployment: 5 }));
  assert.deepEqual(result.effects, {});
});
