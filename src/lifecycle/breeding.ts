/**
 * Breeding Module
 * Agent reproduction logic
 */

import { AgentConfig } from './birth.js';
import { CONSTANTS } from '../config/constants.js';

export const canBreed = (
  agent: AgentConfig,
  balanceUSDC: number,
  tick: number,
  lastBreedingTick: number
): boolean => {
  if (balanceUSDC < CONSTANTS.BREEDING_BALANCE_THRESHOLD) return false;
  if (tick < CONSTANTS.MINIMUM_BREEDING_AGE) return false;
  if (tick - lastBreedingTick < CONSTANTS.BREEDING_COOLDOWN) return false;
  
  // Check breeding_selectivity gene
  const selectivity = agent.genome.chromosomes
    .flatMap(c => c.genes)
    .find(g => g.name === 'breeding_selectivity')?.value || 0.5;
  
  // High selectivity = more picky = lower chance to breed at threshold
  if (selectivity > 0.7 && balanceUSDC < CONSTANTS.BREEDING_BALANCE_THRESHOLD * 2) {
    return false;
  }
  
  return true;
};

export const selectMate = (
  agent: AgentConfig,
  candidates: AgentConfig[],
  candidateBalances: Map<string, number>
): AgentConfig | null => {
  if (candidates.length === 0) return null;
  
  const selectivity = agent.genome.chromosomes
    .flatMap(c => c.genes)
    .find(g => g.name === 'breeding_selectivity')?.value || 0.5;
  
  // Fitness score: balance * age * diversity bonus
  const scored = candidates.map(candidate => {
    const balance = candidateBalances.get(candidate.id) || 0;
    const age = candidate.genome.meta.generation;
    const diversity = candidate.genome.meta.genomeHash !== agent.genome.meta.genomeHash ? 1.5 : 1;
    return { candidate, score: balance * (age + 1) * diversity };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  // High selectivity = pick from top 20%
  // Low selectivity = pick from top 50%
  const poolSize = Math.max(1, Math.floor(scored.length * (selectivity > 0.5 ? 0.2 : 0.5)));
  const pool = scored.slice(0, poolSize);
  
  return pool[Math.floor(Math.random() * pool.length)].candidate;
};

export interface BreedingResult {
  success: boolean;
  offspring?: AgentConfig;
  costPerParent: number;
  error?: string;
}
