/**
 * Decision Framework
 * Filters strategies based on genome expression
 */

import { ExpressionResult } from '../genome/types.js';
import { Strategy, STRATEGIES } from './strategies.js';

const hasRequiredTraits = (
  expression: ExpressionResult,
  required: Partial<Record<keyof ExpressionResult, number>>
): boolean => {
  for (const [trait, threshold] of Object.entries(required)) {
    const value = expression[trait as keyof ExpressionResult];
    if (typeof value === 'number' && value < threshold) {
      return false;
    }
  }
  return true;
};

const calculateStrategyScore = (
  strategy: Strategy,
  expression: ExpressionResult
): number => {
  let score = 0;
  
  if (strategy.riskLevel <= expression.riskAppetite) {
    score += 1;
  }
  
  if (strategy.isOnChain && expression.onChainAffinity > 0.5) {
    score += 0.5;
  }
  if (!strategy.isOnChain && expression.onChainAffinity < 0.5) {
    score += 0.5;
  }
  
  if (strategy.requiresHuman && expression.humanDependence > 0.3) {
    score += 0.3;
  }
  if (!strategy.requiresHuman) {
    score += 0.3;
  }
  
  if (strategy.type === 'creative' && expression.creativeAbility > 0.5) {
    score += 0.4;
  }
  if (strategy.type === 'analytical' && expression.analyticalAbility > 0.5) {
    score += 0.4;
  }
  if (strategy.type === 'social' && expression.cooperationTendency > 0.5) {
    score += 0.4;
  }
  
  return score;
};

export const filterStrategies = (
  expression: ExpressionResult,
  balance: number
): Strategy[] => {
  const available = STRATEGIES.filter(s => {
    if (balance < s.minimumBalance) return false;
    if (!hasRequiredTraits(expression, s.requiredTraits)) return false;
    return true;
  });
  
  return available.sort((a, b) => {
    const scoreA = calculateStrategyScore(a, expression);
    const scoreB = calculateStrategyScore(b, expression);
    return scoreB - scoreA;
  });
};

export const getEmergencyStrategies = (balance: number): Strategy[] => {
  return STRATEGIES.filter(s => 
    s.id === 'idle_conservation' || s.id === 'distress_signal'
  );
};

export const isEmergencyMode = (balance: number): boolean => balance < 2;
