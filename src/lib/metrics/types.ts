/**
 * A compact per-turn snapshot for playtest analysis — deliberately small. It records
 * only scalar metrics (or counts, for collections) directly off final GameState; it
 * never embeds full projects/operations/proceedings/articles/encounters/recommendations.
 */
export interface TurnMetricsSnapshot {
  turn: number;
  date: string;

  economy: {
    gdpGrowth: number;
    inflation: number;
    unemployment: number;
    fdiFlow: number;
    tradeBalance: number;
  };

  fiscal: {
    nominalGDP: number;
    annualRevenue: number;
    annualExpenditure: number;
    primaryBalance: number;
    nominalBalance: number;
    publicDebt: number;
    debtToGDP: number;
    discretionaryBudgetAvailable: number;
  };

  economyDynamics: {
    demandPressure: number;
    outputGap: number;
    inflationPressure: number;
    labourSlack: number;
  };

  politics: {
    approval: number;
    congressionalSupport: number;
  };

  security: {
    securityIndex: number;
  };

  activity: {
    actionsIssued: number;
    activeProjects: number;
    activeOperations: number;
    activeLegislativeProceedings: number;
  };
}

/** Generous cap — a full campaign is a few hundred turns at most; this never impairs
 *  normal analysis, it only guards against unbounded growth on an extreme-length run. */
export const MAX_TURN_METRICS_HISTORY = 500;
