import type { GameState } from "@/lib/gameState";

export type CreditRating = GameState["creditRating"];

// Worst to best.
const CREDIT_RATING_ORDER: CreditRating[] = [
  "Junk",
  "CCC",
  "B",
  "BB",
  "BBB",
  "A",
  "AA",
  "AAA",
];

/**
 * Applies this turn's growth/inflation reading to the credit rating:
 * strong growth (>4.0%) improves it a notch, a contraction (<0%) or
 * inflation above 8% each worsen it a notch. All three can apply in
 * the same turn, sequentially.
 */
export function adjustCreditRating(
  rating: CreditRating,
  gdpGrowth: number,
  inflation: number,
  debtToGDP?: number
): CreditRating {
  let idx = CREDIT_RATING_ORDER.indexOf(rating);

  if (gdpGrowth > 4.0) idx = Math.min(idx + 1, CREDIT_RATING_ORDER.length - 1);
  if (gdpGrowth < 0) idx = Math.max(idx - 1, 0);
  if (inflation > 8) idx = Math.max(idx - 1, 0);
  if (debtToGDP !== undefined && debtToGDP > 105) idx = Math.max(idx - 1, 0);

  return CREDIT_RATING_ORDER[idx];
}

export interface BadgeStyle {
  text: string;
  bg: string;
  border: string;
}

/** Green for BBB and above, amber for BB/B, red for CCC/Junk. */
export function creditRatingStyle(rating: CreditRating): BadgeStyle {
  if (rating === "AAA" || rating === "AA" || rating === "A" || rating === "BBB") {
    return {
      text: "text-positive",
      bg: "bg-positive/10",
      border: "border-positive/30",
    };
  }
  if (rating === "BB" || rating === "B") {
    return {
      text: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/30",
    };
  }
  return { text: "text-danger", bg: "bg-danger/10", border: "border-danger/30" };
}

const STATUS_COLORS = {
  positive: "#10b981",
  amber: "#f59e0b",
  danger: "#ef4444",
};

export function gdpGrowthColor(value: number): string {
  if (value > 2.5) return STATUS_COLORS.positive;
  if (value >= 0) return STATUS_COLORS.amber;
  return STATUS_COLORS.danger;
}

export function inflationColor(value: number): string {
  if (value > 5) return STATUS_COLORS.danger;
  if (value >= 3) return STATUS_COLORS.amber;
  return STATUS_COLORS.positive;
}

export function unemploymentColor(value: number): string {
  if (value > 12) return STATUS_COLORS.danger;
  if (value >= 8) return STATUS_COLORS.amber;
  return STATUS_COLORS.positive;
}

export function informalEconomyColor(value: number): string {
  if (value > 50) return STATUS_COLORS.danger;
  if (value > 35) return STATUS_COLORS.amber;
  return STATUS_COLORS.positive;
}

export function sovereignDebtColor(value: number): string {
  if (value > 100) return STATUS_COLORS.danger;
  if (value >= 80) return STATUS_COLORS.amber;
  return STATUS_COLORS.positive;
}

export function publicInvestmentColor(value: number): string {
  if (value > 4) return STATUS_COLORS.positive;
  if (value >= 2) return STATUS_COLORS.amber;
  return STATUS_COLORS.danger;
}
