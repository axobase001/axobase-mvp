/**
 * Development Module
 * Agent lifecycle stages
 */

export enum DevelopmentStage {
  NEONATE = 'neonate',
  JUVENILE = 'juvenile',
  ADULT = 'adult',
  SENESCENT = 'senescent',
}

import { CONSTANTS } from '../config/constants.js';

export interface StageInfo {
  stage: DevelopmentStage;
  canReproduce: boolean;
  protectedFromDeath: boolean;
  mutationRateMultiplier: number;
  metabolismMultiplier: number;
}

/** Returns true if this tick the agent dies of old age */
export function checkSenescence(tick: number): boolean {
  if (tick < CONSTANTS.SENESCENCE_START_TICK) return false;
  const deathChance = CONSTANTS.SENESCENCE_BASE_DEATH_RATE +
    (tick - CONSTANTS.SENESCENCE_START_TICK) * 0.001;
  return Math.random() < Math.min(deathChance, 0.5);
}

export const determineStage = (tick: number, maxLifespan: number): StageInfo => {
  if (tick < CONSTANTS.NEONATE_DURATION) {
    return {
      stage: DevelopmentStage.NEONATE,
      canReproduce: false,
      protectedFromDeath: true,
      mutationRateMultiplier: 2.0,
      metabolismMultiplier: 0.8,
    };
  }
  
  if (tick < CONSTANTS.NEONATE_DURATION + CONSTANTS.JUVENILE_DURATION) {
    return {
      stage: DevelopmentStage.JUVENILE,
      canReproduce: false,
      protectedFromDeath: false,
      mutationRateMultiplier: 1.2,
      metabolismMultiplier: 1.0,
    };
  }
  
  const senescenceThreshold = maxLifespan * 0.8;
  if (tick > senescenceThreshold) {
    return {
      stage: DevelopmentStage.SENESCENT,
      canReproduce: true,
      protectedFromDeath: false,
      mutationRateMultiplier: 1.5,
      metabolismMultiplier: 1.5,
    };
  }
  
  return {
    stage: DevelopmentStage.ADULT,
    canReproduce: true,
    protectedFromDeath: false,
    mutationRateMultiplier: 1.0,
    metabolismMultiplier: 1.0,
  };
};
