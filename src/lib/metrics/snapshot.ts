import type { GameState } from "@/lib/gameState";
import { MAX_TURN_METRICS_HISTORY, type TurnMetricsSnapshot } from "./types";

const CLOSED_PROCEEDING_STATUSES = new Set(["PASSED", "FAILED", "WITHDRAWN"]);

/**
 * Reads a compact snapshot directly off final GameState — no recomputation of
 * economic/fiscal truth, only the values the simulation already recorded. The two
 * "active X" counts are plain array lengths (activeOperations/legislativeProceedings
 * have no separate scalar counter the way activeProjects does) — counting elements
 * isn't recomputing simulation truth, it's reading the authoritative collection.
 *
 * `turn` is taken explicitly rather than read off `state.turn`: by the time a real
 * turn's snapshot is built (in finalizeTurn), `state.turn` has already advanced to the
 * *next* turn, so the caller must pass the turn that was actually just completed.
 */
export function buildTurnMetricsSnapshot(state: GameState, turn: number, actionsIssued: number): TurnMetricsSnapshot {
  return {
    turn,
    date: state.date,
    economy: {
      gdpGrowth: state.gdpGrowth,
      inflation: state.inflation,
      unemployment: state.unemployment,
      fdiFlow: state.fdiFlow,
      tradeBalance: state.tradeBalance,
    },
    fiscal: {
      nominalGDP: state.fiscal.nominalGDP,
      annualRevenue: state.fiscal.annualRevenue,
      annualExpenditure: state.fiscal.annualExpenditure,
      primaryBalance: state.fiscal.primaryBalance,
      nominalBalance: state.fiscal.nominalBalance,
      publicDebt: state.fiscal.publicDebt,
      debtToGDP: state.fiscal.debtToGDP,
      discretionaryBudgetAvailable: state.fiscal.discretionaryBudgetAvailable,
    },
    economyDynamics: {
      demandPressure: state.economyDynamics.demandPressure,
      outputGap: state.economyDynamics.outputGap,
      inflationPressure: state.economyDynamics.inflationPressure,
      labourSlack: state.economyDynamics.labourSlack,
      productiveCapacityIndex: state.economyDynamics.productiveCapacityIndex,
      availableCapacityHeadroom: state.economyDynamics.availableCapacityHeadroom,
      capacityUtilisationFlow: state.economyDynamics.capacityUtilisationFlow,
      supplyHeadroomApplied: state.economyDynamics.supplyHeadroomApplied,
      transmittedMonetaryPressure: state.economyDynamics.transmittedMonetaryPressure,
    },
    monetary: {
      currentSelic: state.monetaryPolicy.currentSelic,
      monetaryStance: state.monetaryPolicy.monetaryStance,
      inflationTarget: state.monetaryPolicy.inflationTarget,
      copomDecision:
        [...state.monetaryPolicy.decisionHistory].reverse().find((decision) => decision.turn === turn)
          ?.decision ?? "NONE",
    },
    externalEconomy: {
      exchangeRateBrlPerUsd: state.externalEconomy.exchangeRateBrlPerUsd,
      exchangeRatePressure: state.externalEconomy.exchangeRatePressure,
      foreignDemandIndex: state.externalEconomy.foreignDemandIndex,
      commodityConditionsIndex: state.externalEconomy.commodityConditionsIndex,
      exportIndex: state.externalEconomy.exportIndex,
      importIndex: state.externalEconomy.importIndex,
      externalDemandContribution: state.externalEconomy.externalDemandContribution,
      importedInflationPressure: state.externalEconomy.importedInflationPressure,
    },
    privateEconomy: {
      consumptionIndex: state.privateEconomy.consumptionIndex,
      investmentIndex: state.privateEconomy.investmentIndex,
      consumptionDemandContribution: state.privateEconomy.consumptionDemandContribution,
      investmentDemandContribution: state.privateEconomy.investmentDemandContribution,
      capitalFormationFlow: state.privateEconomy.capitalFormationFlow,
    },
    politics: {
      approval: state.approval,
      congressionalSupport: state.congressionalSupport,
    },
    security: {
      securityIndex: state.securityIndex,
    },
    activity: {
      actionsIssued,
      activeProjects: state.activeProjects,
      activeOperations: state.activeOperations.length,
      activeLegislativeProceedings: state.legislativeProceedings.filter(
        (proceeding) => !CLOSED_PROCEEDING_STATUSES.has(proceeding.status)
      ).length,
    },
  };
}

/** Appends exactly one snapshot, capped so an extreme-length campaign can't grow the
 *  history unboundedly. */
export function appendTurnMetricsSnapshot(
  history: TurnMetricsSnapshot[],
  snapshot: TurnMetricsSnapshot
): TurnMetricsSnapshot[] {
  return [...history, snapshot].slice(-MAX_TURN_METRICS_HISTORY);
}
