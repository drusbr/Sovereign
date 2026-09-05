import type { GameState } from "@/lib/gameState";
import {
  DEFAULT_ECONOMY_CALIBRATION,
  type EconomyCalibration,
  type EconomyDynamics,
} from "./types";

export interface ProductiveCapacityAddition {
  /** Normalised index-point addition to the economy's potential output capacity. */
  indexPoints: number;
  /** Same addition expressed as a share of nominal GDP for transmission. */
  headroomShare: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts the successfully delivered cost of an infrastructure asset into a
 * deterministic productive-capacity addition. Project cost and GDP are both BRLbn.
 * The coefficient is intentionally calibrated rather than presented as an empirical
 * estimate: relative project scale matters, while the index avoids false precision.
 */
export function calculateInfrastructureCapacityAddition(
  completedProjectCost: number,
  nominalGDP: number,
  calibration: EconomyCalibration = DEFAULT_ECONOMY_CALIBRATION
): ProductiveCapacityAddition {
  if (!Number.isFinite(completedProjectCost) || completedProjectCost <= 0
    || !Number.isFinite(nominalGDP) || nominalGDP <= 0) {
    return { indexPoints: 0, headroomShare: 0 };
  }

  const projectSharePercent = completedProjectCost / nominalGDP * 100;
  const rawIndexPoints = projectSharePercent
    * calibration.scales.infrastructureCapacityEfficiency
    * calibration.scales.infrastructureCapacityIndexPerGDPPercent;
  const indexPoints = clamp(rawIndexPoints, 0, calibration.bounds.infrastructureCapacityAddition);

  return {
    indexPoints,
    headroomShare: indexPoints / 100,
  };
}

/** Adds completed infrastructure to supply capacity without touching fiscal demand
 * or headline macro variables. The project lifecycle's completionEffectApplied flag
 * is the exactly-once guard; this helper only performs the state transition. */
export function addProductiveCapacity(
  state: GameState,
  addition: ProductiveCapacityAddition,
  calibration: EconomyCalibration = DEFAULT_ECONOMY_CALIBRATION
): GameState {
  if (addition.indexPoints <= 0) return state;

  const dynamics: EconomyDynamics = {
    ...state.economyDynamics,
    productiveCapacityIndex: clamp(
      state.economyDynamics.productiveCapacityIndex + addition.indexPoints,
      calibration.bounds.productiveCapacityIndexMin,
      calibration.bounds.productiveCapacityIndexMax
    ),
    availableCapacityHeadroom: clamp(
      state.economyDynamics.availableCapacityHeadroom + addition.headroomShare,
      0,
      calibration.bounds.availableCapacityHeadroom
    ),
  };

  return { ...state, economyDynamics: dynamics };
}
