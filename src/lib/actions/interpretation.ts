import {
  ACTION_TYPES,
  AUTHORITY_TYPES,
  type ActionAuthority,
  type ActionCost,
  type ActionPrerequisite,
  type ActionTarget,
  type ActionType,
  type AuthorityType,
  type ProposedAction,
} from "@/lib/actions/types";

export const ACTION_INTERPRETATION_SYSTEM_INSTRUCTION = `You interpret natural-language presidential orders for Sovereign, a political simulation. Convert intent into a proposed action record. Do not decide whether the action succeeds and do not generate mechanical stat effects. Identify what the player wants, who or what is targeted, and which institution has legal or practical authority. Respond with strict JSON only.`;

const EXPLICIT_LEGISLATIVE_LANGUAGE =
  /\b(introduce|propose|submit|table|pass|enact|amend|repeal)\b[^.]{0,80}\b(legislation|bill|law|act|tax|appropriation|budget)\b|\b(raise|increase|reduce|cut)\b[^.]{0,60}\b(federal income tax|tax rate)\b/i;

const FISCAL_INTENT = /\b(spend\w*|fund\w*|allocat\w*|appropriat\w*|increase\w*|raise\w*|cut\w*|reduce\w*|decrease\w*|tax\w*|revenue)\b/i;

function extractAmountBRL(text: string): number | null {
  const match = text.match(/(?:R\$|BRL)\s*([\d.,]+)\s*(bn|billion|bilh(?:ão|oes|ões)?|million|m(?:n)?|milh(?:ão|oes|ões)?)?/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const suffix = (match[2] ?? "").toLowerCase();
  if (/million|^m|milh/.test(suffix)) return value * 1_000_000;
  return value * 1_000_000_000;
}

function extractTaxRatePoints(text: string): number | null {
  const numeric = text.match(/(\d+(?:\.\d+)?)\s*(?:percentage|percent)\s*-?\s*point/i);
  if (numeric) return Number(numeric[1]);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  const word = text.match(/\b(one|two|three|four|five)\s*-?\s*percentage\s*-?\s*point/i);
  return word ? words[word[1].toLowerCase()] : null;
}

/** Deterministic interpretation for explicit fiscal orders, including offline fallback. */
export function inferExplicitFiscalAction(draft: ProposedAction): ProposedAction | null {
  const text = draft.rawOrder;
  const amountBRL = extractAmountBRL(text);
  if (!amountBRL || (!FISCAL_INTENT.test(text) && !/\b(project|programme|program|operation)\b/i.test(text))) return null;
  const lower = text.toLowerCase();
  const compoundTaxFundedSpending = /\b(funded|financed)\s+(?:through|by|with)\b/.test(lower)
    && /\btax|revenue\b/.test(lower)
    && /\bspend|health|hospital|education|programme|program\b/.test(lower);
  const tax = !compoundTaxFundedSpending && /\btax|revenue\b/.test(lower);
  const decrease = /\b(cut|reduce|decrease|lower)\b/.test(lower);
  const actionType: ActionType = tax
    ? decrease ? "DECREASE_TAX" : "INCREASE_TAX"
    : /\bemergency\b/.test(lower)
      ? "EMERGENCY_ALLOCATION"
      : /\bproject|programme|program\b/.test(lower)
        ? "FUND_PROJECT"
        : /\boperation\b/.test(lower)
          ? "FUND_OPERATION"
          : decrease ? "DECREASE_SPENDING" : "INCREASE_SPENDING";
  const requiresLegislation = tax || EXPLICIT_LEGISLATIVE_LANGUAGE.test(text);
  const spendingCategory = /health|hospital|sus/.test(lower) ? "health"
    : /educat|school|universit/.test(lower) ? "education"
      : /defen[cs]e|military|armed forces/.test(lower) ? "defence"
        : /police|security|crime/.test(lower) ? "security"
          : /infrastructure|road|rail|port/.test(lower) ? "infrastructure"
            : /welfare|pension|benefit|social/.test(lower) ? "socialProtection" : "other";
  const taxCategory = /corporate|company|business/.test(lower) ? "corporateTax"
    : /income|personal/.test(lower) ? "personalIncomeTax"
      : /payroll/.test(lower) ? "payrollContributions"
        : /consumption|vat|iva|sales/.test(lower) ? "consumptionTaxes" : "other";
  return {
    ...draft,
    actionType,
    authority: {
      type: requiresLegislation ? "LEGISLATIVE" : "EXECUTIVE",
      institution: requiresLegislation ? "National Congress" : "Federal Executive",
      confidence: 0.95,
      explanation: requiresLegislation
        ? "The fiscal measure changes taxation or expressly requests new legislation."
        : "The order is treated as an executive allocation within existing V1 authority.",
    },
    targets: tax
      ? [{ id: "BRA-TAX", type: "SECTOR", name: "Federal revenue system" }]
      : [{ id: `BRA-SPEND-${spendingCategory}`, type: "SECTOR", name: spendingCategory }],
    parameters: {
      amountBRL,
      ...(tax ? { taxCategory } : { spendingCategory }),
      timing: /annual|per year|each year|recurring/.test(lower) ? "ANNUAL_RECURRING" : "ONE_OFF",
      ...(compoundTaxFundedSpending && extractTaxRatePoints(text) ? {
        companionTaxRateChangePoints: extractTaxRatePoints(text),
        companionTaxCategory: taxCategory,
      } : {}),
    },
    estimatedCosts: tax && !decrease ? [] : [{
      type: "FISCAL",
      amount: amountBRL / 1_000_000_000,
      unit: "BRL bn",
      description: "Explicit monetary amount stated in the order.",
    }],
    prerequisites: requiresLegislation ? [{
      type: "LEGISLATION",
      institution: "National Congress",
      description: "Passage by the Chamber of Deputies and Federal Senate is required.",
    }] : [],
    status: "PROPOSED",
  };
}

/** Safe deterministic fallback for orders that explicitly ask to legislate. */
export function inferExplicitLegislativeAction(draft: ProposedAction): ProposedAction | null {
  if (!EXPLICIT_LEGISLATIVE_LANGUAGE.test(draft.rawOrder)) return null;
  const interpreted: ProposedAction = {
    ...draft,
    actionType: "LEGISLATIVE_PROPOSAL",
    authority: {
      type: "LEGISLATIVE",
      institution: "National Congress",
      confidence: 1,
      explanation: "The order explicitly introduces or changes federal legislation.",
    },
    targets: [{ id: "BRA-CONGRESS", type: "INSTITUTION", name: "National Congress" }],
    prerequisites: [{
      type: "LEGISLATION",
      institution: "National Congress",
      description: "Passage by the Chamber of Deputies and Federal Senate is required.",
    }],
    parameters: { legislativePackage: true },
    status: "PROPOSED",
  };
  return interpreted;
}

export function buildActionInterpretationPrompt(action: Pick<ProposedAction, "id" | "actorId" | "rawOrder">): string {
  return `Interpret this proposed presidential action.

Action id: ${action.id}
Actor id: ${action.actorId}
Natural-language order: """${action.rawOrder}"""

Allowed actionType values: ${ACTION_TYPES.join(", ")}
Allowed authority.type values: ${AUTHORITY_TYPES.join(", ")}

Authority guidance:
- EXECUTIVE: directly within federal presidential/executive power
- LEGISLATIVE: requires a new law, appropriation, or congressional approval
- JUDICIAL: outcome belongs to courts or prosecutors with protected independence
- INDEPENDENT: belongs to an independent public institution, such as the Central Bank
- STATE_LOCAL: belongs primarily to a state or municipality
- FOREIGN: requires a foreign government or international institution
- PRIVATE: requires voluntary/private-sector conduct or a legal mechanism
- UNKNOWN: authority cannot be determined

Return exactly:
{
  "actionType": "...",
  "authority": { "type": "...", "institution": "...", "confidence": 0.0, "explanation": "one sentence" },
  "targets": [{ "id": "stable identifier where known", "type": "COUNTRY|REGION|INSTITUTION|ORGANISATION|PERSON|SECTOR|OTHER", "name": "display name" }],
  "parameters": {},
  "estimatedCosts": [{ "type": "FISCAL|POLITICAL|ACTION_POINTS|OTHER", "amount": 0, "unit": "BRL bn", "description": "only when explicitly stated or clearly requested" }],
  "prerequisites": [{ "type": "LEGISLATION|CONSENT|JUDICIAL_REVIEW|JURISDICTION|OTHER", "institution": "...", "description": "..." }]
}

For fiscal actions, use the dedicated fiscal actionType whenever applicable and populate:
- amountBRL or annualAmountBRL as a full BRL number
- spendingCategory: health|education|defence|security|infrastructure|socialProtection|administration|other
- taxCategory: personalIncomeTax|corporateTax|consumptionTaxes|payrollContributions|other
- timing: ONE_OFF|ANNUAL_RECURRING|PER_TURN
- percentagePointChange and duration when explicitly stated
Tax changes require LEGISLATIVE authority. A clearly stated executive reallocation from an existing appropriation may be EXECUTIVE. Do not decide whether funds exist.

Interpret intent only. Do not return approval, security, GDP, or any other game-state effects.`;
}

function objectRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseTargets(value: unknown): ActionTarget[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<ActionTarget["type"]>([
    "COUNTRY", "REGION", "INSTITUTION", "ORGANISATION", "PERSON", "SECTOR", "OTHER",
  ]);
  return value.flatMap((item) => {
    const rec = objectRecord(item);
    if (typeof rec.id !== "string" || typeof rec.name !== "string" || !allowed.has(rec.type as ActionTarget["type"])) return [];
    return [{ id: rec.id, name: rec.name, type: rec.type as ActionTarget["type"] }];
  });
}

function parseCosts(value: unknown): ActionCost[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<ActionCost["type"]>(["FISCAL", "POLITICAL", "ACTION_POINTS", "OTHER"]);
  return value.flatMap((item) => {
    const rec = objectRecord(item);
    if (!allowed.has(rec.type as ActionCost["type"]) || typeof rec.description !== "string") return [];
    return [{
      type: rec.type as ActionCost["type"],
      description: rec.description,
      ...(typeof rec.amount === "number" && Number.isFinite(rec.amount) ? { amount: rec.amount } : {}),
      ...(typeof rec.unit === "string" ? { unit: rec.unit } : {}),
    }];
  });
}

function parsePrerequisites(value: unknown): ActionPrerequisite[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<ActionPrerequisite["type"]>(["LEGISLATION", "CONSENT", "JUDICIAL_REVIEW", "JURISDICTION", "OTHER"]);
  return value.flatMap((item) => {
    const rec = objectRecord(item);
    if (!allowed.has(rec.type as ActionPrerequisite["type"]) || typeof rec.description !== "string") return [];
    return [{
      type: rec.type as ActionPrerequisite["type"],
      description: rec.description,
      ...(typeof rec.institution === "string" ? { institution: rec.institution } : {}),
    }];
  });
}

export function parseActionInterpretation(raw: string, draft: ProposedAction): ProposedAction {
  const parsed = objectRecord(JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")));
  const authorityRaw = objectRecord(parsed.authority);
  let actionType: ActionType = ACTION_TYPES.includes(parsed.actionType as ActionType)
    ? (parsed.actionType as ActionType)
    : "UNKNOWN";
  const authorityType: AuthorityType = AUTHORITY_TYPES.includes(authorityRaw.type as AuthorityType)
    ? (authorityRaw.type as AuthorityType)
    : "UNKNOWN";
  // A compound package may be returned as OTHER/UNKNOWN even though the model
  // correctly identified Congress as authoritative. Preserve that authoritative
  // classification and normalize it to the supported legislative action type.
  if (authorityType === "LEGISLATIVE" && (actionType === "UNKNOWN" || actionType === "OTHER")) {
    actionType = "LEGISLATIVE_PROPOSAL";
  }
  const authority: ActionAuthority = {
    type: authorityType,
    ...(typeof authorityRaw.institution === "string" ? { institution: authorityRaw.institution } : {}),
    ...(typeof authorityRaw.confidence === "number" && Number.isFinite(authorityRaw.confidence)
      ? { confidence: Math.max(0, Math.min(1, authorityRaw.confidence)) }
      : {}),
    ...(typeof authorityRaw.explanation === "string" ? { explanation: authorityRaw.explanation } : {}),
  };

  const interpreted: ProposedAction = {
    ...draft,
    actionType,
    authority,
    targets: parseTargets(parsed.targets),
    parameters: objectRecord(parsed.parameters),
    estimatedCosts: parseCosts(parsed.estimatedCosts),
    prerequisites: parsePrerequisites(parsed.prerequisites),
    status: "PROPOSED",
  };
  const explicitFiscal = inferExplicitFiscalAction(draft);
  if (explicitFiscal) {
    return {
      ...interpreted,
      actionType: explicitFiscal.actionType,
      authority: explicitFiscal.authority,
      targets: interpreted.targets.length ? interpreted.targets : explicitFiscal.targets,
      parameters: { ...explicitFiscal.parameters, ...interpreted.parameters },
      estimatedCosts: interpreted.estimatedCosts.length ? interpreted.estimatedCosts : explicitFiscal.estimatedCosts,
      prerequisites: interpreted.prerequisites.length ? interpreted.prerequisites : explicitFiscal.prerequisites,
    };
  }
  const explicitLegislation = inferExplicitLegislativeAction(draft);
  if (!explicitLegislation) return interpreted;
  return {
    ...interpreted,
    actionType: explicitLegislation.actionType,
    authority: explicitLegislation.authority,
    targets: interpreted.targets.length ? interpreted.targets : explicitLegislation.targets,
    prerequisites: interpreted.prerequisites.length
      ? interpreted.prerequisites
      : explicitLegislation.prerequisites,
    parameters: { ...interpreted.parameters, legislativePackage: true },
  };
}
