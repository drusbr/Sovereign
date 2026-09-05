import type { GameState } from "@/lib/gameState";
import {
  FISCAL_ACTION_TYPES,
  type FiscalActionType,
  type ProposedAction,
} from "@/lib/actions/types";

/** All monetary values in FiscalState are billions of Brazilian reais (R$bn). */
export type SpendingCategory =
  | "health"
  | "education"
  | "defence"
  | "security"
  | "infrastructure"
  | "socialProtection"
  | "administration"
  | "other";

export type TaxCategory =
  | "personalIncomeTax"
  | "corporateTax"
  | "consumptionTaxes"
  | "payrollContributions"
  | "other";

export interface FiscalLedgerEntry {
  id: string;
  actionId: string;
  turn: number;
  date: string;
  kind: FiscalActionType;
  timing: "ONE_OFF" | "ANNUAL_RECURRING" | "PER_TURN";
  amount: number;
  category: SpendingCategory | TaxCategory;
  balanceImpact: number;
  debtImpact: number;
  funding: "CURRENT_ALLOCATION" | "REALLOCATION" | "DEFICIT_FINANCED";
  description: string;
  originType: "ACTION" | "LEGISLATION" | "PROJECT" | "OPERATION";
  proceedingId?: string;
  projectId?: string;
  operationId?: string;
  /** Signed annual policy effect; positive improves the balance. */
  annualRunRateImpact: number;
  /** Signed cash-flow effect attributable to one current turn. */
  currentTurnCashImpact: number;
  policyRateChangePoints?: number;
}

export interface FiscalState {
  unit: "BRL_BILLIONS";
  nominalGDP: number;
  /** Hybrid current-year fiscal total: recurring annual revenue run-rate plus
   * currentYearOneOffRevenue accumulated so far. Retained name for save/UI stability. */
  annualRevenue: number;
  /** Hybrid current-year fiscal total: recurring primary run-rate + annual interest
   * + year-to-date one-offs. It is not the recurring expenditure run-rate alone. */
  annualExpenditure: number;
  primaryRevenue: number;
  primaryExpenditure: number;
  interestExpense: number;
  primaryBalance: number;
  nominalBalance: number;
  publicDebt: number;
  debtToGDP: number;
  discretionaryBudgetAvailable: number;
  /** Cumulative cash items in the current simulated fiscal year. Fiscal-year rollover
   * is not modelled yet, so long campaigns retain these reporting totals. */
  currentYearOneOffExpenditure: number;
  currentYearOneOffRevenue: number;
  /** Current annual/current-year deficit measure for reporting. Debt accrual does not
   * read this field; recurring flows accrue in closeFiscalWeek and one-offs at posting. */
  financingRequirement: number;
  spendingByCategory: Record<SpendingCategory, number>;
  revenueByCategory: Record<TaxCategory, number>;
  ledger: FiscalLedgerEntry[];
}

/** Configurable Brazil V1 baseline. Values are coherent game assumptions, not a live budget forecast. */
export const INITIAL_BRAZIL_FISCAL_STATE: FiscalState = {
  unit: "BRL_BILLIONS",
  nominalGDP: 10900,
  annualRevenue: 2480,
  annualExpenditure: 3300,
  primaryRevenue: 2480,
  primaryExpenditure: 2500,
  interestExpense: 800,
  primaryBalance: -20,
  nominalBalance: -820,
  publicDebt: 9592,
  debtToGDP: 88,
  discretionaryBudgetAvailable: 180,
  currentYearOneOffExpenditure: 0,
  currentYearOneOffRevenue: 0,
  financingRequirement: 820,
  spendingByCategory: {
    health: 330, education: 240, defence: 120, security: 105,
    infrastructure: 190, socialProtection: 1050, administration: 310, other: 155,
  },
  revenueByCategory: {
    personalIncomeTax: 320, corporateTax: 290, consumptionTaxes: 980,
    payrollContributions: 560, other: 330,
  },
  ledger: [],
};

export function createInitialFiscalState(): FiscalState {
  return structuredClone(INITIAL_BRAZIL_FISCAL_STATE);
}

export interface FiscalValidationResult {
  valid: boolean;
  amount: number;
  timing: FiscalLedgerEntry["timing"];
  spendingCategory?: SpendingCategory;
  taxCategory?: TaxCategory;
  requiresLegislation: boolean;
  legislationPassed: boolean;
  funding: FiscalLedgerEntry["funding"];
  borrowingRequired: number;
  issues: string[];
}

const SPENDING = new Set<SpendingCategory>([
  "health", "education", "defence", "security", "infrastructure",
  "socialProtection", "administration", "other",
]);
const TAXES = new Set<TaxCategory>([
  "personalIncomeTax", "corporateTax", "consumptionTaxes",
  "payrollContributions", "other",
]);

function finitePositive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Accepts explicit BRL amounts, R$bn parameters, or a parsed fiscal estimated cost. */
export function fiscalAmountBillions(action: ProposedAction): number | null {
  const p = action.parameters;
  const explicitBillions = finitePositive(p.amountBRLBillions) ?? finitePositive(p.annualAmountBRLBillions);
  if (explicitBillions) return explicitBillions;
  const rawBrl = finitePositive(p.amountBRL) ?? finitePositive(p.annualAmountBRL);
  if (rawBrl) return rawBrl >= 1_000_000 ? rawBrl / 1_000_000_000 : rawBrl;
  const cost = action.estimatedCosts.find((item) => item.type === "FISCAL" && finitePositive(item.amount));
  if (!cost?.amount) return null;
  return /bn|billion/i.test(cost.unit ?? "") ? cost.amount : cost.amount / 1_000_000_000;
}

function timingOf(action: ProposedAction): FiscalLedgerEntry["timing"] {
  const timing = String(action.parameters.timing ?? action.parameters.duration ?? "").toUpperCase();
  if (timing.includes("PER_TURN") || timing.includes("WEEK")) return "PER_TURN";
  if (timing.includes("ANNUAL") || action.parameters.annualAmountBRL != null || action.parameters.annualAmountBRLBillions != null) {
    return "ANNUAL_RECURRING";
  }
  return "ONE_OFF";
}

export function isFiscalAction(action: ProposedAction): action is ProposedAction & { actionType: FiscalActionType } {
  return FISCAL_ACTION_TYPES.includes(action.actionType as FiscalActionType);
}

export function validateFiscalAction(
  state: GameState,
  action: ProposedAction,
  options: { legislationPassed?: boolean } = {}
): FiscalValidationResult {
  const issues: string[] = [];
  const amount = fiscalAmountBillions(action) ?? 0;
  if (!isFiscalAction(action)) issues.push("This is not a supported fiscal action.");
  if (amount <= 0) issues.push("A usable positive monetary amount is required.");
  if (amount > state.fiscal.nominalGDP * 0.5) issues.push("The amount exceeds the V1 plausibility limit of 50% of annual GDP.");

  const isTax = action.actionType === "INCREASE_TAX" || action.actionType === "DECREASE_TAX";
  const spendingCategory = isTax ? undefined : String(action.parameters.spendingCategory ?? "other") as SpendingCategory;
  const taxCategory = isTax ? String(action.parameters.taxCategory ?? "other") as TaxCategory : undefined;
  if (spendingCategory && !SPENDING.has(spendingCategory)) issues.push("The spending category is not supported.");
  if (taxCategory && !TAXES.has(taxCategory)) issues.push("The tax category is not supported.");

  const requiresLegislation = action.authority.type === "LEGISLATIVE" || isTax;
  const legislationPassed = options.legislationPassed === true;
  if (requiresLegislation && !legislationPassed) issues.push("Required legislation has not passed.");

  const isSpendingIncrease = ["INCREASE_SPENDING", "EMERGENCY_ALLOCATION", "FUND_PROJECT", "FUND_OPERATION"].includes(action.actionType);
  const available = state.fiscal.discretionaryBudgetAvailable;
  const funding: FiscalLedgerEntry["funding"] = !isSpendingIncrease || amount <= available
    ? "CURRENT_ALLOCATION"
    : amount <= available + state.fiscal.primaryExpenditure * 0.05
      ? "REALLOCATION"
      : "DEFICIT_FINANCED";

  return {
    valid: issues.length === 0,
    amount,
    timing: timingOf(action),
    spendingCategory,
    taxCategory,
    requiresLegislation,
    legislationPassed,
    funding,
    borrowingRequired: funding === "DEFICIT_FINANCED" ? Math.max(0, amount - available) : 0,
    issues,
  };
}

function recalculate(fiscal: FiscalState): FiscalState {
  const primaryBalance = fiscal.primaryRevenue + fiscal.currentYearOneOffRevenue
    - fiscal.primaryExpenditure - fiscal.currentYearOneOffExpenditure;
  const nominalBalance = primaryBalance - fiscal.interestExpense;
  return {
    ...fiscal,
    annualRevenue: fiscal.primaryRevenue + fiscal.currentYearOneOffRevenue,
    annualExpenditure: fiscal.primaryExpenditure + fiscal.interestExpense + fiscal.currentYearOneOffExpenditure,
    primaryBalance,
    nominalBalance,
    financingRequirement: Math.max(0, -nominalBalance),
    debtToGDP: fiscal.nominalGDP > 0 ? fiscal.publicDebt / fiscal.nominalGDP * 100 : 0,
  };
}

/** Applies an authorised fiscal action without mutating the original state. */
export function applyFiscalAction(
  state: GameState,
  action: ProposedAction,
  options: { legislationPassed?: boolean; proceedingId?: string } = {}
): { state: GameState; validation: FiscalValidationResult; entry?: FiscalLedgerEntry; entries?: FiscalLedgerEntry[] } {
  const validation = validateFiscalAction(state, action, options);
  if (!validation.valid) return { state, validation };

  const fiscal = structuredClone(state.fiscal);
  const amount = validation.amount;
  const isAnnual = validation.timing === "ANNUAL_RECURRING";
  const isPerTurn = validation.timing === "PER_TURN";
  const annualised = isPerTurn ? amount * 52 : amount;
  let balanceImpact = 0;
  let immediateDebtImpact = 0;
  const category: SpendingCategory | TaxCategory = validation.spendingCategory ?? validation.taxCategory ?? "other";

  if (action.actionType === "INCREASE_TAX") {
    fiscal.primaryRevenue += annualised;
    fiscal.revenueByCategory[validation.taxCategory!] += annualised;
    balanceImpact = annualised;
  } else if (action.actionType === "DECREASE_TAX") {
    fiscal.primaryRevenue = Math.max(0, fiscal.primaryRevenue - annualised);
    fiscal.revenueByCategory[validation.taxCategory!] = Math.max(0, fiscal.revenueByCategory[validation.taxCategory!] - annualised);
    balanceImpact = -annualised;
  } else if (action.actionType === "DECREASE_SPENDING") {
    fiscal.primaryExpenditure = Math.max(0, fiscal.primaryExpenditure - annualised);
    fiscal.spendingByCategory[validation.spendingCategory!] = Math.max(0, fiscal.spendingByCategory[validation.spendingCategory!] - annualised);
    fiscal.discretionaryBudgetAvailable += annualised;
    balanceImpact = annualised;
  } else if (isAnnual || isPerTurn) {
    fiscal.primaryExpenditure += annualised;
    fiscal.spendingByCategory[validation.spendingCategory!] += annualised;
    fiscal.discretionaryBudgetAvailable = Math.max(0, fiscal.discretionaryBudgetAvailable - annualised);
    balanceImpact = -annualised;
    // Recurring flows enter the annual run-rate; closeFiscalWeek accrues exactly one week.
    immediateDebtImpact = 0;
  } else {
    fiscal.currentYearOneOffExpenditure += amount;
    fiscal.spendingByCategory[validation.spendingCategory!] += amount;
    fiscal.discretionaryBudgetAvailable = Math.max(0, fiscal.discretionaryBudgetAvailable - amount);
    balanceImpact = -amount;
    immediateDebtImpact = amount;
  }

  fiscal.publicDebt = Math.max(0, fiscal.publicDebt + immediateDebtImpact);
  const entry: FiscalLedgerEntry = {
    id: `fiscal-${state.turn}-${action.id}`,
    actionId: action.id,
    turn: state.turn,
    date: state.date,
    kind: action.actionType as FiscalActionType,
    timing: validation.timing,
    amount,
    category,
    balanceImpact,
    debtImpact: immediateDebtImpact,
    funding: validation.funding,
    description: action.rawOrder,
    originType: options.proceedingId ? "LEGISLATION" : "ACTION",
    ...(options.proceedingId ? { proceedingId: options.proceedingId } : {}),
    annualRunRateImpact: isAnnual || isPerTurn ? balanceImpact : 0,
    currentTurnCashImpact: isAnnual || isPerTurn ? balanceImpact / 52 : balanceImpact,
  };
  const entries = [entry];
  const companionPoints = Number(action.parameters.companionTaxRateChangePoints ?? 0);
  if (companionPoints > 0) {
    const companionCategory = String(action.parameters.companionTaxCategory ?? "personalIncomeTax") as TaxCategory;
    if (TAXES.has(companionCategory)) {
      // V1 proportional estimate against the represented revenue base. This is
      // deliberately broad and remains inside the fiscal engine, never the UI.
      const companionRevenue = fiscal.revenueByCategory[companionCategory] * (companionPoints / 27.5);
      fiscal.primaryRevenue += companionRevenue;
      fiscal.revenueByCategory[companionCategory] += companionRevenue;
      entries.push({
        ...entry,
        id: `${entry.id}-companion-tax`,
        kind: "INCREASE_TAX",
        amount: companionRevenue,
        category: companionCategory,
        balanceImpact: companionRevenue,
        debtImpact: 0,
        description: `Top federal income tax rate increased by ${companionPoints} percentage points`,
        annualRunRateImpact: companionRevenue,
        currentTurnCashImpact: companionRevenue / 52,
        policyRateChangePoints: companionPoints,
      });
    }
  }
  fiscal.ledger = [...fiscal.ledger, ...entries].slice(-100);
  const nextFiscal = recalculate(fiscal);
  return {
    state: { ...state, fiscal: nextFiscal, sovereignDebt: nextFiscal.debtToGDP },
    validation,
    entry,
    entries,
  };
}

/** Weekly close: recurring annual balances accrue to debt at 1/52 of run-rate. */
export function closeFiscalWeek(state: GameState): GameState {
  const fiscal = recalculate(structuredClone(state.fiscal));
  // One-off items hit debt when recorded; only the recurring annual run-rate accrues here.
  const recurringNominalBalance = fiscal.primaryRevenue - fiscal.primaryExpenditure - fiscal.interestExpense;
  const weeklyBorrowing = Math.max(0, -recurringNominalBalance) / 52;
  const weeklySurplus = Math.max(0, recurringNominalBalance) / 52;
  fiscal.publicDebt = Math.max(0, fiscal.publicDebt + weeklyBorrowing - weeklySurplus);
  const closed = recalculate(fiscal);
  return { ...state, fiscal: closed, sovereignDebt: closed.debtToGDP };
}

/**
 * Weekly nominal-GDP evolution: nominal growth approx. real growth + inflation,
 * compounded multiplicatively so it stays coherent at any magnitude, and converted
 * from the annualised gdpGrowth/inflation headline rates to the single week a turn
 * represents (annual rate r -> weekly factor (1+r)^(1/52)). fiscal.nominalGDP remains
 * the sole canonical GDP level — this never creates a second GDP figure, and debt/GDP
 * continues to read it directly via recalculate(). Deterministic: a pure function of
 * the two already-computed headline rates, no randomness.
 */
export function advanceNominalGDP(fiscal: FiscalState, gdpGrowth: number, inflation: number): FiscalState {
  const weeklyReal = Math.pow(1 + gdpGrowth / 100, 1 / 52) - 1;
  const weeklyInflation = Math.pow(1 + inflation / 100, 1 / 52) - 1;
  const weeklyNominalGrowth = (1 + weeklyReal) * (1 + weeklyInflation) - 1;
  const nominalGDP = Math.max(0, fiscal.nominalGDP * (1 + weeklyNominalGrowth));
  return recalculate({ ...fiscal, nominalGDP });
}

/** Posts lifecycle expenditure when it is incurred; an authorised budget alone is not spending. */
export function postLifecycleExpenditure(
  state: GameState,
  params: {
    actionId: string;
    amount: number;
    category: SpendingCategory;
    description: string;
    kind: "FUND_PROJECT" | "FUND_OPERATION";
    projectId?: string;
    operationId?: string;
  }
): GameState {
  if (!Number.isFinite(params.amount) || params.amount <= 0) return state;
  const fiscal = structuredClone(state.fiscal);
  fiscal.currentYearOneOffExpenditure += params.amount;
  fiscal.spendingByCategory[params.category] += params.amount;
  fiscal.discretionaryBudgetAvailable = Math.max(
    0,
    fiscal.discretionaryBudgetAvailable - params.amount
  );
  fiscal.publicDebt += params.amount;
  const entry: FiscalLedgerEntry = {
    id: `lifecycle-${state.turn}-${params.actionId}`,
    actionId: params.actionId,
    turn: state.turn,
    date: state.date,
    kind: params.kind,
    timing: "ONE_OFF",
    amount: params.amount,
    category: params.category,
    balanceImpact: -params.amount,
    debtImpact: params.amount,
    funding: params.amount <= state.fiscal.discretionaryBudgetAvailable
      ? "CURRENT_ALLOCATION"
      : "DEFICIT_FINANCED",
    description: params.description,
    originType: params.projectId ? "PROJECT" : "OPERATION",
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.operationId ? { operationId: params.operationId } : {}),
    annualRunRateImpact: 0,
    currentTurnCashImpact: -params.amount,
  };
  fiscal.ledger = [...fiscal.ledger, entry].slice(-100);
  const next = recalculate(fiscal);
  return { ...state, fiscal: next, sovereignDebt: next.debtToGDP };
}
