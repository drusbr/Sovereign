import type { FiscalState } from "@/lib/fiscal";
import type { EconomyBaseline, FiscalStanceSnapshot } from "./types";

function share(value: number, gdp: number): number {
  return gdp > 0 ? value / gdp : 0;
}

/**
 * Reads the CURRENT recurring levels already persisted on FiscalState —
 * applyFiscalAction mutates `primaryExpenditure`/`primaryRevenue` directly and
 * permanently for ANNUAL_RECURRING/PER_TURN spending changes and for any tax change
 * (tax changes are always treated as recurring by the fiscal engine — there is no
 * one-off tax concept). A recurring measure enacted turns ago is still reflected here
 * without ever being "re-applied": this is what makes fiscal stance a persistent level,
 * not a fresh impulse recomputed from a transaction log every turn.
 */
export function deriveFiscalStance(
  fiscal: FiscalState,
  baseline: EconomyBaseline,
  turn: number,
  taxDemandPassthrough: number
): FiscalStanceSnapshot {
  const gdp = fiscal.nominalGDP;
  const recurringExpenditureShare = share(fiscal.primaryExpenditure - baseline.primaryExpenditure, gdp);
  // A tax increase (primaryRevenue above baseline) is contractionary for private
  // demand, hence the sign flip; only a fraction passes through — see
  // EconomyCalibration.taxDemandPassthrough.
  const recurringRevenueDemandShare =
    -share(fiscal.primaryRevenue - baseline.primaryRevenue, gdp) * taxDemandPassthrough;
  return { turn, recurringExpenditureShare, recurringRevenueDemandShare };
}

/**
 * Temporary demand impulse from THIS TURN's one-off ledger activity only — scanning
 * `fiscal.ledger` for entries recorded this turn, rather than any persistent counter,
 * so it naturally disappears from the calculation the turn after it's recorded. (Project
 * and operation spending posts here too via postLifecycleExpenditure's ONE_OFF entries —
 * that's intentional: ongoing programme/operation spend is real government demand for as
 * long as it's actively being spent, and stops contributing the turn spending stops.)
 */
export function deriveOneOffFiscalImpulse(
  fiscal: FiscalState,
  turn: number,
  governmentDemandPassthrough: number
): number {
  const gdp = fiscal.nominalGDP;
  if (gdp <= 0) return 0;
  const totalCashImpact = fiscal.ledger
    .filter((entry) => entry.turn === turn && entry.timing === "ONE_OFF")
    .reduce((sum, entry) => sum + entry.currentTurnCashImpact, 0);
  // currentTurnCashImpact is negative for a spending outlay (it worsens the balance),
  // which is exactly what makes it demand-positive — flip the sign to get a demand flow.
  return (-totalCashImpact / gdp) * governmentDemandPassthrough;
}
