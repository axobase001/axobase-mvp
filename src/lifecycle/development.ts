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
