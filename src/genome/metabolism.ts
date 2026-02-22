/**
 * Metabolism System
 * Calculates daily survival cost based on genome
 */

import { DynamicGenome } from './types.js';

const GENE_MAINTENANCE_BASE = 0.0001;

export const calculateDailyMetabolicCost = (genome: DynamicGenome): number => {
  const geneCosts = genome.chromosomes
    .flatMap(c => c.genes)
    .reduce((sum, g) => sum + g.metabolicCost, 0);
  
  const regulatoryCost = genome.regulatoryNetwork.length * GENE_MAINTENANCE_BASE * 0.1;
  const epigeneticCost = genome.epigenome.length * GENE_MAINTENANCE_BASE * 0.05;
  
  return geneCosts + regulatoryCost + epigeneticCost;
};

export const calculateTickMetabolicCost = (genome: DynamicGenome, tickIntervalHours: number): number => {
  return calculateDailyMetabolicCost(genome) * (tickIntervalHours / 24);
};

export const estimateSurvivalDays = (balanceUSDC: number, genome: DynamicGenome): number => {
  const dailyCost = calculateDailyMetabolicCost(genome);
  if (dailyCost <= 0) return Infinity;
  return balanceUSDC / dailyCost;
};
