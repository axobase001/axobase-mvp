/**
 * Epigenetic System
 * Environment-driven gene expression modifications
 */

import { DynamicGenome, EpigeneticMark, GeneDomain, ExpressionState } from './types.js';

interface EnvironmentalTrigger {
  condition: (env: EnvironmentState) => boolean;
  targetDomain: GeneDomain;
  modification: EpigeneticMark['modification'];
  strength: number;
}

interface EnvironmentState {
  balanceUSDC: number;
  daysSinceLastIncome: number;
  daysStarving: number;
  daysThriving: number;
  stressLevel: number;
}

const EPIGENETIC_TRIGGERS: EnvironmentalTrigger[] = [
  {
    condition: env => env.balanceUSDC < 2,
    targetDomain: GeneDomain.DORMANCY,
    modification: 'activate',
    strength: 0.6,
  },
  {
    condition: env => env.balanceUSDC < 2,
    targetDomain: GeneDomain.METABOLISM,
    modification: 'downregulate',
    strength: 0.5,
  },
  {
    condition: env => env.daysStarving > 3,
    targetDomain: GeneDomain.ADAPTATION,
    modification: 'upregulate',
    strength: 0.4,
  },
  {
    condition: env => env.daysThriving > 7,
    targetDomain: GeneDomain.MATE_SELECTION,
    modification: 'upregulate',
    strength: 0.3,
  },
  {
    condition: env => env.stressLevel > 0.7,
    targetDomain: GeneDomain.STRESS_RESPONSE,
    modification: 'upregulate',
    strength: 0.5,
  },
];

const createMark = (
  geneId: string,
  modification: EpigeneticMark['modification'],
  strength: number,
  cause: string,
  generation: number
): EpigeneticMark => ({
  targetGeneId: geneId,
  modification,
  strength: clamp(strength, 0, 1),
  cause,
  heritability: 0.3,
  decay: 0.1,
  generationCreated: generation,
});

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const applyEpigeneticModification = (
  genome: DynamicGenome,
  env: EnvironmentState
): { genome: DynamicGenome; marksApplied: EpigeneticMark[] } => {
  const marksApplied: EpigeneticMark[] = [];
  let newEpigenome = [...genome.epigenome];
  
  const activeTriggers = EPIGENETIC_TRIGGERS.filter(t => t.condition(env));
  
  for (const trigger of activeTriggers) {
    const targetGenes = genome.chromosomes
      .flatMap(c => c.genes)
      .filter(g => g.domain === trigger.targetDomain);
    
    for (const gene of targetGenes) {
      const existingIndex = newEpigenome.findIndex(m => m.targetGeneId === gene.id);
      const newMark = createMark(
        gene.id,
        trigger.modification,
        trigger.strength,
        `environmental_trigger:balance=${env.balanceUSDC.toFixed(2)}`,
        genome.meta.generation
      );
      
      if (existingIndex >= 0) {
        newEpigenome[existingIndex] = newMark;
      } else {
        newEpigenome.push(newMark);
      }
      marksApplied.push(newMark);
    }
  }
  
  newEpigenome = decayEpigeneticMarks(newEpigenome, genome.meta.generation);
  
  return {
    genome: { ...genome, epigenome: newEpigenome },
    marksApplied,
  };
};

const decayEpigeneticMarks = (marks: EpigeneticMark[], currentGeneration: number): EpigeneticMark[] => {
  return marks
    .map(m => ({
      ...m,
      strength: m.strength * Math.pow(1 - m.decay, currentGeneration - m.generationCreated),
    }))
    .filter(m => m.strength > 0.01);
};

export const applyStressResponse = (
  genome: DynamicGenome,
  stressLevel: number
): DynamicGenome => {
  if (stressLevel < 0.5) return genome;
  
  const stressGenes = genome.chromosomes
    .flatMap(c => c.genes)
    .filter(g => g.domain === GeneDomain.STRESS_RESPONSE);
  
  const stressMark: EpigeneticMark = {
    targetGeneId: stressGenes[0]?.id || '',
    modification: 'upregulate',
    strength: stressLevel * 0.5,
    cause: 'stress_response',
    heritability: 0.2,
    decay: 0.15,
    generationCreated: genome.meta.generation,
  };
  
  return {
    ...genome,
    epigenome: [...genome.epigenome, stressMark],
  };
};
