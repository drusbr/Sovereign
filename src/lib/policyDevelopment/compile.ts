import type { GameState } from "@/lib/gameState";
import { canonicalActorIdForCountry, type ProposedAction } from "@/lib/actions/types";
import { getCountryKnowledge } from "@/lib/countryKnowledge/registry";
import { getActionDefinition, getInstitution, getInstrument } from "@/lib/countryKnowledge/lookup";
import type { DevelopedPolicyOption, PolicyDevelopmentRequest } from "./types";

function fmt(amount: number): string {
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
}

/** Humanizes a camelCase fiscal category id (e.g. "corporateTax") for order text only —
 *  the underlying parameter value stays the exact string the fiscal engine already reads. */
function categoryLabel(category: string): string {
  return category
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

/**
 * Compiles a selected DevelopedPolicyOption into ordinary ProposedAction(s) — the
 * only execution mechanism these actions ever use. Once compiled, each action is
 * mechanically indistinguishable from a hand-typed order: it still passes through
 * validateAction (including Country Knowledge validation), institutionalProcessing,
 * Congress or the fiscal engine exactly as written, with no bypass.
 */
export function compileDevelopedOption(
  option: DevelopedPolicyOption,
  request: Pick<PolicyDevelopmentRequest, "objectiveId">,
  state: GameState
): ProposedAction[] {
  const actorId = canonicalActorIdForCountry(state.countryName);
  const knowledge = getCountryKnowledge(actorId);

  return option.actionDrafts.map((draft, index) => {
    const definition = knowledge ? getActionDefinition(knowledge, draft.actionDefinitionId) : undefined;
    const instrument = definition && knowledge ? getInstrument(knowledge, definition.instrumentId) : undefined;
    const institution = instrument?.requiresInstitutionId && knowledge
      ? getInstitution(knowledge, instrument.requiresInstitutionId)
      : undefined;

    const isTax = draft.actionType === "INCREASE_TAX" || draft.actionType === "DECREASE_TAX";
    const amount = Number(draft.parameters.amountBRLBillions ?? 0);
    const category = isTax
      ? String(draft.parameters.taxCategory ?? "other")
      : String(draft.parameters.spendingCategory ?? "other");
    const authorityType = instrument?.authorityType ?? (isTax ? "LEGISLATIVE" : "EXECUTIVE");

    const rawOrder = isTax
      ? `Increase federal ${categoryLabel(category)} revenue by approximately R$${fmt(amount)}bn annually as part of a fiscal consolidation package.`
      : `Reduce discretionary ${categoryLabel(category)} expenditure by approximately R$${fmt(amount)}bn annually as part of a fiscal consolidation package.`;

    const action: ProposedAction = {
      id: `${option.id}-action-${index}`,
      actorId,
      rawOrder,
      actionType: draft.actionType,
      authority: {
        type: authorityType,
        institution: institution?.name ?? (isTax ? "National Congress" : "Federal Executive / Presidency"),
        confidence: 1,
        explanation:
          instrument?.description ?? "Resolved from a government-developed policy option.",
      },
      targets: [{ id: `BRA-${isTax ? "TAX" : "SPEND"}-${category}`, type: "SECTOR", name: category }],
      parameters: draft.parameters,
      estimatedCosts: [
        { type: "FISCAL", amount, unit: "BRL bn", description: "Estimated from the selected policy option." },
      ],
      prerequisites: authorityType === "LEGISLATIVE"
        ? [{
            type: "LEGISLATION",
            institution: "National Congress",
            description: "Passage by the Chamber of Deputies and Federal Senate is required.",
          }]
        : [],
      status: "PROPOSED",
      validationIssues: [],
      ...(definition ? { actionDefinitionId: definition.id } : {}),
      ...(definition ? { instrumentId: definition.instrumentId } : {}),
      objectiveId: request.objectiveId,
    };
    return action;
  });
}
