import assert from "node:assert/strict";
import test from "node:test";
// Node's native type-stripping runner requires the extension; the app itself
// uses bundler-style extensionless imports.
// @ts-expect-error TypeScript's app config intentionally disallows .ts extensions.
import { validateAction } from "./validation.ts";
import type { ProposedAction } from "./types.ts";

const state = { countryName: "Brazil" };

function action(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: "action-1",
    actorId: "BRA",
    rawOrder: "Direct the Health Ministry to publish hospital waiting-time data.",
    actionType: "POLICY_DIRECTIVE",
    authority: { type: "EXECUTIVE", institution: "Ministry of Health" },
    targets: [{ id: "BRA-MOH", type: "INSTITUTION", name: "Ministry of Health" }],
    parameters: {},
    estimatedCosts: [],
    prerequisites: [],
    status: "PROPOSED",
    validationIssues: [],
    ...overrides,
  };
}

test("executive action validates without an institutional blocker", () => {
  const result = validateAction(state, action());
  assert.equal(result.valid, true);
  assert.equal(result.status, "VALID");
  assert.deepEqual(result.issues, []);
});

test("legislative action is blocked pending Congress", () => {
  const result = validateAction(
    state,
    action({ actionType: "LEGISLATIVE_PROPOSAL", authority: { type: "LEGISLATIVE", institution: "National Congress" } })
  );
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "REQUIRES_LEGISLATION"));
});

test("independent institution action is blocked", () => {
  const result = validateAction(
    state,
    action({ authority: { type: "INDEPENDENT", institution: "Banco Central do Brasil" } })
  );
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "INDEPENDENT_INSTITUTION"));
});

test("malformed and unknown action reports structural issues", () => {
  const result = validateAction(
    state,
    action({
      actionType: "UNKNOWN",
      parameters: [] as unknown as Record<string, unknown>,
      authority: { type: "UNKNOWN" },
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "UNKNOWN_ACTION_TYPE"));
  assert.ok(result.issues.some((item) => item.code === "MALFORMED_PARAMETERS"));
});

test("ordinary public communication is valid without a target", () => {
  const result = validateAction(
    state,
    action({ actionType: "PUBLIC_COMMUNICATION", targets: [] })
  );
  assert.equal(result.valid, true);
});
