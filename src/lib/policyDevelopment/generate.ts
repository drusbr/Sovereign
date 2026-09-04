import type { GameState } from "@/lib/gameState";
import type { SpendingCategory } from "@/lib/fiscal";
import { canonicalActorIdForCountry } from "@/lib/actions/types";
import { getCountryKnowledge } from "@/lib/countryKnowledge/registry";
import { getCandidateActionsForObjective, getInstrument } from "@/lib/countryKnowledge/lookup";
import { KNOWN_POLICY_CONSTRAINTS, type DevelopedPolicyOption } from "./types";

/**
 * Candidate categories for the expenditure-led package. Infrastructure is included
 * here (not hardcoded out) so the PRESERVE_INFRASTRUCTURE_INVESTMENT constraint does
 * real filtering work rather than being redundant with a permanently-fixed list —
 * see eligibleExpenditureCategories(). "administration" is never the sole target:
 * whichever eligible categories currently carry spend are split proportionally.
 */
const CANDIDATE_EXPENDITURE_CATEGORIES: SpendingCategory[] = ["administration", "other", "infrastructure"];

function roundToHalfBillion(value: number): number {
  return Math.round(value * 2) / 2;
}

function eligibleExpenditureCategories(state: GameState, constraintIds: string[]): SpendingCategory[] {
  const preserveInfrastructure = constraintIds.includes(
    KNOWN_POLICY_CONSTRAINTS.PRESERVE_INFRASTRUCTURE_INVESTMENT.id
  );
  return CANDIDATE_EXPENDITURE_CATEGORIES.filter(
    (category) => !(preserveInfrastructure && category === "infrastructure")
  ).filter((category) => state.fiscal.spendingByCategory[category] > 0);
}

/** Overall expenditure-reduction target, bounded by real fiscal headroom — never a
 *  fixed amount, never exceeding what validateFiscalAction would already accept. */
function expenditureTarget(state: GameState, categories: SpendingCategory[]): number {
  const eligibleTotal = categories.reduce((sum, category) => sum + state.fiscal.spendingByCategory[category], 0);
  if (eligibleTotal <= 0) return 0;
  return Math.max(
    0,
    roundToHalfBillion(
      Math.min(
        state.fiscal.discretionaryBudgetAvailable * 0.5,
        eligibleTotal * 0.12,
        state.fiscal.primaryExpenditure * 0.01
      )
    )
  );
}

function revenueTarget(state: GameState): number {
  return Math.max(
    0,
    roundToHalfBillion(
      Math.min(state.fiscal.primaryExpenditure * 0.01, state.fiscal.revenueByCategory.corporateTax * 0.08)
    )
  );
}

interface ExpenditureDraft {
  category: SpendingCategory;
  amountBRLBillions: number;
}

/** Splits a target amount across eligible categories proportional to their current
 *  spend — state-dependent, never a single always-picked category. */
function buildExpenditureDrafts(
  state: GameState,
  targetAmount: number,
  categories: SpendingCategory[]
): ExpenditureDraft[] {
  if (targetAmount <= 0 || categories.length === 0) return [];
  const total = categories.reduce((sum, category) => sum + state.fiscal.spendingByCategory[category], 0);
  if (total <= 0) return [];
  return categories
    .map((category) => ({
      category,
      amountBRLBillions: roundToHalfBillion(targetAmount * (state.fiscal.spendingByCategory[category] / total)),
    }))
    .filter((draft) => draft.amountBRLBillions >= 0.5);
}

function categoryLabel(category: SpendingCategory): string {
  return category === "other" ? "general discretionary" : category;
}

function fmt(amount: number): string {
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1);
}

function expenditureSummary(drafts: ExpenditureDraft[], preserveInfrastructure: boolean): string {
  const total = drafts.reduce((sum, d) => sum + d.amountBRLBillions, 0);
  const categories = drafts.map((d) => categoryLabel(d.category)).join(" and ");
  const protection = preserveInfrastructure ? ", preserving current infrastructure investment commitments" : "";
  return `Reduce approximately R$${fmt(total)}bn of eligible discretionary expenditure annually (${categories})${protection}. Intended to ease fiscal demand pressure in support of disinflation.`;
}

function revenueSummary(amount: number): string {
  return `Seek approximately R$${fmt(amount)}bn of recurring additional federal corporate tax revenue through legislation, limiting the need for immediate spending reductions. Intended to improve fiscal credibility in support of disinflation.`;
}

function mixedSummary(expenditureAmount: number, revenueAmount: number, preserveInfrastructure: boolean): string {
  const protection = preserveInfrastructure ? ", preserving current infrastructure investment commitments" : "";
  return `Combine approximately R$${fmt(expenditureAmount)}bn of eligible discretionary expenditure restraint${protection} with approximately R$${fmt(revenueAmount)}bn of recurring federal revenue through legislation. Intended to spread fiscal consolidation across both levers in support of disinflation.`;
}

/**
 * Pure, deterministic. Produces exactly the three REDUCE_INFLATION option families —
 * expenditure-led, revenue-led, mixed — sourced from live FiscalState and the actions
 * already present in Country Knowledge's REDUCE_INFLATION catalogue. Returns [] for
 * any other objective id (this slice implements one objective) or if Country
 * Knowledge / its candidate actions can't be resolved. No LLM call; no claim about
 * inflation, approval, or any other simulated outcome — only which actions to take.
 */
export function developPolicyOptions(
  state: GameState,
  objectiveId: string,
  constraintIds: string[],
  requestId: string
): DevelopedPolicyOption[] {
  if (objectiveId !== "REDUCE_INFLATION") return [];

  const knowledge = getCountryKnowledge(canonicalActorIdForCountry(state.countryName));
  if (!knowledge) return [];

  const candidates = getCandidateActionsForObjective(knowledge, objectiveId);
  const expenditureDefinition = candidates.find(
    (definition) => getInstrument(knowledge, definition.instrumentId)?.authorityType === "EXECUTIVE"
  );
  const revenueDefinition = candidates.find(
    (definition) => getInstrument(knowledge, definition.instrumentId)?.authorityType === "LEGISLATIVE"
  );
  if (!expenditureDefinition || !revenueDefinition) return [];

  const preserveInfrastructure = constraintIds.includes(
    KNOWN_POLICY_CONSTRAINTS.PRESERVE_INFRASTRUCTURE_INVESTMENT.id
  );
  const eligibleCategories = eligibleExpenditureCategories(state, constraintIds);
  const fullExpenditureTarget = expenditureTarget(state, eligibleCategories);
  const fullRevenueTarget = revenueTarget(state);

  const fullExpenditureDrafts = buildExpenditureDrafts(state, fullExpenditureTarget, eligibleCategories);
  const halfExpenditureDrafts = buildExpenditureDrafts(state, fullExpenditureTarget / 2, eligibleCategories);
  const halfRevenueAmount = roundToHalfBillion(fullRevenueTarget / 2);

  const options: DevelopedPolicyOption[] = [];

  if (fullExpenditureDrafts.length > 0) {
    options.push({
      id: `${requestId}-expenditure`,
      requestId,
      approach: "EXPENDITURE_LED",
      title: "Moderate Expenditure Consolidation",
      summary: expenditureSummary(fullExpenditureDrafts, preserveInfrastructure),
      actionDrafts: fullExpenditureDrafts.map((draft) => ({
        actionDefinitionId: expenditureDefinition.id,
        actionType: "DECREASE_SPENDING",
        parameters: {
          amountBRLBillions: draft.amountBRLBillions,
          spendingCategory: draft.category,
          timing: "ANNUAL_RECURRING",
        },
      })),
    });
  }

  if (fullRevenueTarget > 0) {
    options.push({
      id: `${requestId}-revenue`,
      requestId,
      approach: "REVENUE_LED",
      title: "Revenue-Led Consolidation",
      summary: revenueSummary(fullRevenueTarget),
      actionDrafts: [
        {
          actionDefinitionId: revenueDefinition.id,
          actionType: "INCREASE_TAX",
          parameters: {
            amountBRLBillions: fullRevenueTarget,
            taxCategory: "corporateTax",
            timing: "ANNUAL_RECURRING",
          },
        },
      ],
    });
  }

  if (halfExpenditureDrafts.length > 0 && halfRevenueAmount > 0) {
    options.push({
      id: `${requestId}-mixed`,
      requestId,
      approach: "MIXED",
      title: "Mixed Fiscal Adjustment",
      summary: mixedSummary(
        halfExpenditureDrafts.reduce((sum, d) => sum + d.amountBRLBillions, 0),
        halfRevenueAmount,
        preserveInfrastructure
      ),
      actionDrafts: [
        ...halfExpenditureDrafts.map((draft) => ({
          actionDefinitionId: expenditureDefinition.id,
          actionType: "DECREASE_SPENDING" as const,
          parameters: {
            amountBRLBillions: draft.amountBRLBillions,
            spendingCategory: draft.category,
            timing: "ANNUAL_RECURRING",
          },
        })),
        {
          actionDefinitionId: revenueDefinition.id,
          actionType: "INCREASE_TAX" as const,
          parameters: {
            amountBRLBillions: halfRevenueAmount,
            taxCategory: "corporateTax",
            timing: "ANNUAL_RECURRING",
          },
        },
      ],
    });
  }

  return options;
}
