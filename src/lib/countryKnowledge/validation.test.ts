import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { validateAgainstCountryKnowledge } from "./validation.ts";
// @ts-expect-error Native type stripping requires explicit TypeScript extensions.
import { validateAction } from "../actions/validation.ts";
import type { ProposedAction } from "../actions/types.ts";

const state = { countryName: "Brazil" };

function action(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: "action-1",
    actorId: "BRA",
    rawOrder: "Direct the Health Ministry to publish hospital waiting-time data.",
    actionType: "POLICY_DIRECTIVE",
    authority: { type: "EXECUTIVE" },
    targets: [],
    parameters: {},
    estimatedCosts: [],
    prerequisites: [],
    status: "PROPOSED",
    validationIssues: [],
    ...overrides,
  };
}

test("direct Selic-setting is structurally blocked via the independent-institution constraint", () => {
  const issues = validateAgainstCountryKnowledge(
    action({ actionDefinitionId: "direct_policy_rate_directive", instrumentId: "MONETARY_POLICY_DIRECTIVE" }),
    "BRA"
  );
  assert.ok(issues.some((item) => item.code === "INDEPENDENT_INSTITUTION" && item.severity === "BLOCKER"));
});

test("federal enforcement priority against PCC financial networks is structurally valid", () => {
  const issues = validateAgainstCountryKnowledge(
    action({
      actionDefinitionId: "federal_enforcement_priority_pcc_financial_networks",
      instrumentId: "FEDERAL_ENFORCEMENT_PRIORITY",
    }),
    "BRA"
  );
  assert.deepEqual(issues, []);
});

test("frozen criminal assets cannot be treated as spendable revenue", () => {
  const issues = validateAgainstCountryKnowledge(
    action({ actionDefinitionId: "frozen_asset_reallocation", instrumentId: "ASSET_REALLOCATION_DIRECTIVE" }),
    "BRA"
  );
  assert.ok(issues.some((item) => item.code === "FROZEN_ASSETS_UNAVAILABLE" && item.severity === "BLOCKER"));
});

test("bilateral trade negotiation stays Brazilian EXECUTIVE authority with a foreign-consent dependency, not FOREIGN authority", () => {
  const negotiation = action({
    authority: { type: "EXECUTIVE", institution: "Federal Executive / Presidency" },
    actionDefinitionId: "bilateral_trade_negotiation_usa",
    instrumentId: "BILATERAL_NEGOTIATION",
  });
  assert.equal(negotiation.authority.type, "EXECUTIVE");
  const issues = validateAgainstCountryKnowledge(negotiation, "BRA");
  const foreignConsent = issues.find((item) => item.code === "REQUIRES_FOREIGN_CONSENT");
  assert.ok(foreignConsent);
  assert.equal(foreignConsent?.severity, "WARNING");
  // A WARNING must not itself block validation — the wrapping validateAction() call should
  // still classify this as VALID given EXECUTIVE authority (a BLOCKER would wrongly reject it).
  const result = validateAction(state, negotiation);
  assert.equal(result.valid, true);
  assert.equal(result.status, "VALID");
});

test("instrument-only foreign consent still surfaces without a full action definition", () => {
  const issues = validateAgainstCountryKnowledge(action({ instrumentId: "BILATERAL_NEGOTIATION" }), "BRA");
  assert.ok(issues.some((item) => item.code === "REQUIRES_FOREIGN_CONSENT" && item.severity === "WARNING"));
});

test("healthcare spending increase carries no blocking structural constraint", () => {
  const issues = validateAgainstCountryKnowledge(
    action({ actionDefinitionId: "federal_healthcare_spending_increase", instrumentId: "SPENDING_ADJUSTMENT" }),
    "BRA"
  );
  assert.deepEqual(issues, []);
});

test("unknown country id fails gracefully with no issues", () => {
  assert.deepEqual(
    validateAgainstCountryKnowledge(action({ actionDefinitionId: "federal_healthcare_spending_increase" }), "ZZZ"),
    []
  );
});

test("unknown actionDefinitionId fails gracefully with no issues", () => {
  assert.deepEqual(validateAgainstCountryKnowledge(action({ actionDefinitionId: "not-a-real-action" }), "BRA"), []);
});

test("legacy ProposedAction without any Country Knowledge fields validates identically to before", () => {
  const legacy = action();
  assert.deepEqual(validateAgainstCountryKnowledge(legacy, "BRA"), []);
  const result = validateAction(state, legacy);
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("Country Knowledge validation needs nothing beyond the action and a country id — no GameState", () => {
  // Type-level proof: the signature accepts only (ProposedAction, string). If this compiles
  // and runs without any GameState import in this file, the separation holds.
  assert.equal(validateAgainstCountryKnowledge.length, 2);
});
