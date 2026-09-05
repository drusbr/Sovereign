/** Persistent external-economy stocks and normalized transmission indexes.
 *  BRL/USD uses Brazilian convention: a higher value means a weaker real. */
export interface ExternalEconomyState {
  exchangeRateBrlPerUsd: number;
  equilibriumExchangeRate: number;
  exchangeRatePressure: number;
  foreignDemandIndex: number;
  commodityConditionsIndex: number;
  globalRiskIndex: number;
  exportIndex: number;
  importIndex: number;
  externalDemandContribution: number;
  importedInflationPressure: number;
}

export interface ExternalEconomyCalibration {
  equilibriumExchangeRate: number;
  baselineTradeBalance: number;
  pressureAdjustmentRate: number;
  exchangeRateAdjustmentSpeed: number;
  exchangeRateMeanReversion: number;
  interestDifferentialSensitivity: number;
  commodityCurrencySensitivity: number;
  foreignDemandCurrencySensitivity: number;
  globalRiskSensitivity: number;
  foreignDemandExportElasticity: number;
  commodityExportElasticity: number;
  exchangeRateExportElasticity: number;
  domesticDemandImportElasticity: number;
  exchangeRateImportElasticity: number;
  tradeFlowAdjustmentRate: number;
  externalDemandScale: number;
  tradeBalanceScale: number;
  importedInflationPassThrough: number;
  importedInflationAdjustmentRate: number;
  bounds: {
    exchangeRateMin: number;
    exchangeRateMax: number;
    exchangeRatePressure: number;
    conditionIndexMin: number;
    conditionIndexMax: number;
    tradeIndexMin: number;
    tradeIndexMax: number;
    externalDemandContribution: number;
    importedInflationPressure: number;
    tradeBalance: number;
  };
}

export const DEFAULT_EXTERNAL_ECONOMY_CALIBRATION: ExternalEconomyCalibration = {
  // Gameplay anchors, not econometric estimates of fair value or elasticities.
  equilibriumExchangeRate: 5.4,
  baselineTradeBalance: 12.3,
  pressureAdjustmentRate: 0.18,
  exchangeRateAdjustmentSpeed: 0.035,
  exchangeRateMeanReversion: 0.025,
  interestDifferentialSensitivity: 0.005,
  commodityCurrencySensitivity: 0.003,
  foreignDemandCurrencySensitivity: 0.0015,
  globalRiskSensitivity: 0.004,
  foreignDemandExportElasticity: 0.45,
  commodityExportElasticity: 0.35,
  exchangeRateExportElasticity: 30,
  domesticDemandImportElasticity: 180,
  exchangeRateImportElasticity: 25,
  tradeFlowAdjustmentRate: 0.16,
  externalDemandScale: 0.0006,
  tradeBalanceScale: 1.2,
  importedInflationPassThrough: 0.08,
  importedInflationAdjustmentRate: 0.15,
  bounds: {
    exchangeRateMin: 2,
    exchangeRateMax: 12,
    exchangeRatePressure: 0.25,
    conditionIndexMin: 50,
    conditionIndexMax: 150,
    tradeIndexMin: 50,
    tradeIndexMax: 160,
    externalDemandContribution: 0.015,
    importedInflationPressure: 0.025,
    tradeBalance: 80,
  },
};

export function createInitialExternalEconomyState(): ExternalEconomyState {
  return {
    exchangeRateBrlPerUsd: DEFAULT_EXTERNAL_ECONOMY_CALIBRATION.equilibriumExchangeRate,
    equilibriumExchangeRate: DEFAULT_EXTERNAL_ECONOMY_CALIBRATION.equilibriumExchangeRate,
    exchangeRatePressure: 0,
    foreignDemandIndex: 100,
    commodityConditionsIndex: 100,
    globalRiskIndex: 100,
    exportIndex: 100,
    importIndex: 100,
    externalDemandContribution: 0,
    importedInflationPressure: 0,
  };
}

export interface ExternalEconomyInputs {
  externalEconomy: ExternalEconomyState;
  /** Selic minus the calibrated neutral nominal rate, in percentage points. */
  monetaryStance: number;
  /** Domestic fiscal/monetary demand target before external leakage. */
  domesticDemandPressure: number;
}

export interface ExternalEconomyAdvanceResult {
  state: ExternalEconomyState;
  tradeBalance: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampSym(value: number, bound: number): number {
  return clamp(value, -bound, bound);
}

function relax(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

/**
 * Advances only external transmission stocks. It cannot write GDP growth,
 * inflation or unemployment; callers feed its two output pressures into the
 * domestic causal engine. Identical inputs always produce identical outputs.
 */
export function advanceExternalEconomy(
  inputs: ExternalEconomyInputs,
  calibration: ExternalEconomyCalibration = DEFAULT_EXTERNAL_ECONOMY_CALIBRATION
): ExternalEconomyAdvanceResult {
  const { bounds } = calibration;
  const current = inputs.externalEconomy;
  const foreignDemandIndex = clamp(current.foreignDemandIndex, bounds.conditionIndexMin, bounds.conditionIndexMax);
  const commodityConditionsIndex = clamp(current.commodityConditionsIndex, bounds.conditionIndexMin, bounds.conditionIndexMax);
  const globalRiskIndex = clamp(current.globalRiskIndex, bounds.conditionIndexMin, bounds.conditionIndexMax);
  const foreignGap = foreignDemandIndex - 100;
  const commodityGap = commodityConditionsIndex - 100;
  const riskGap = globalRiskIndex - 100;

  const targetExchangeRatePressure = clampSym(
    -inputs.monetaryStance * calibration.interestDifferentialSensitivity
      - commodityGap * calibration.commodityCurrencySensitivity
      - foreignGap * calibration.foreignDemandCurrencySensitivity
      + riskGap * calibration.globalRiskSensitivity,
    bounds.exchangeRatePressure
  );
  const exchangeRatePressure = clampSym(
    relax(current.exchangeRatePressure, targetExchangeRatePressure, calibration.pressureAdjustmentRate),
    bounds.exchangeRatePressure
  );

  const anchor = clamp(current.equilibriumExchangeRate, bounds.exchangeRateMin, bounds.exchangeRateMax);
  const anchorGapShare = (anchor - current.exchangeRateBrlPerUsd) / anchor;
  const exchangeRateBrlPerUsd = clamp(
    current.exchangeRateBrlPerUsd * (
      1
      + exchangeRatePressure * calibration.exchangeRateAdjustmentSpeed
      + anchorGapShare * calibration.exchangeRateMeanReversion
    ),
    bounds.exchangeRateMin,
    bounds.exchangeRateMax
  );
  const depreciationFromAnchor = exchangeRateBrlPerUsd / anchor - 1;

  const exportTarget = clamp(
    100
      + foreignGap * calibration.foreignDemandExportElasticity
      + commodityGap * calibration.commodityExportElasticity
      + depreciationFromAnchor * calibration.exchangeRateExportElasticity,
    bounds.tradeIndexMin,
    bounds.tradeIndexMax
  );
  const importTarget = clamp(
    100
      + inputs.domesticDemandPressure * calibration.domesticDemandImportElasticity
      - depreciationFromAnchor * calibration.exchangeRateImportElasticity,
    bounds.tradeIndexMin,
    bounds.tradeIndexMax
  );
  const exportIndex = clamp(
    relax(current.exportIndex, exportTarget, calibration.tradeFlowAdjustmentRate),
    bounds.tradeIndexMin,
    bounds.tradeIndexMax
  );
  const importIndex = clamp(
    relax(current.importIndex, importTarget, calibration.tradeFlowAdjustmentRate),
    bounds.tradeIndexMin,
    bounds.tradeIndexMax
  );
  const netTradeIndex = (exportIndex - 100) - (importIndex - 100);
  const externalDemandContribution = clampSym(
    netTradeIndex * calibration.externalDemandScale,
    bounds.externalDemandContribution
  );

  const importedInflationTarget = clampSym(
    depreciationFromAnchor * calibration.importedInflationPassThrough,
    bounds.importedInflationPressure
  );
  const importedInflationPressure = clampSym(
    relax(
      current.importedInflationPressure,
      importedInflationTarget,
      calibration.importedInflationAdjustmentRate
    ),
    bounds.importedInflationPressure
  );
  const tradeBalance = clamp(
    calibration.baselineTradeBalance + netTradeIndex * calibration.tradeBalanceScale,
    -bounds.tradeBalance,
    bounds.tradeBalance
  );

  return {
    state: {
      exchangeRateBrlPerUsd,
      equilibriumExchangeRate: anchor,
      exchangeRatePressure,
      foreignDemandIndex,
      commodityConditionsIndex,
      globalRiskIndex,
      exportIndex,
      importIndex,
      externalDemandContribution,
      importedInflationPressure,
    },
    tradeBalance,
  };
}
