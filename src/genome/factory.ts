/**
 * Genome Factory
 * Creates founder genomes with randomized initial values
 */

import { DynamicGenome, Gene, Chromosome, GeneOrigin, ExpressionState } from './types.js';
import { FOUNDER_CHROMOSOMES } from './defaults.js';
import { createHash } from 'crypto';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const perturbValue = (base: number, magnitude: number = 0.1): number => {
  const perturbation = (Math.random() * 2 - 1) * magnitude;
  return Math.max(0, Math.min(1, base + perturbation));
};

const perturbWeight = (base: number, magnitude: number = 0.2): number => {
  const perturbation = (Math.random() * 2 - 1) * magnitude;
  return Math.max(0.1, Math.min(3.0, base + perturbation));
};

const randomDominance = (): number => Math.random();

const randomPlasticity = (): number => Math.random() * 0.5;

const cloneGeneWithPerturbation = (template: Gene, lineageId: string): Gene => ({
  id: `${template.id}-${generateId()}`,
  name: template.name,
  domain: template.domain,
  value: perturbValue(template.value, 0.1),
  weight: perturbWeight(template.weight, 0.2),
  dominance: randomDominance(),
  plasticity: randomPlasticity(),
  essentiality: template.essentiality,
  metabolicCost: template.metabolicCost,
  origin: GeneOrigin.PRIMORDIAL,
  age: 0,
  expressionState: ExpressionState.ACTIVE,
});

const cloneChromosome = (template: Chromosome, lineageId: string): Chromosome => ({
  id: `${template.id}-${generateId()}`,
  name: template.name,
  genes: template.genes.map(g => cloneGeneWithPerturbation(g, lineageId)),
  isEssential: template.isEssential,
});

const calculateGenomeHash = (genome: DynamicGenome): string => {
  const data = JSON.stringify({
    lineageId: genome.meta.lineageId,
    generation: genome.meta.generation,
    genes: genome.chromosomes.flatMap(c => c.genes.map(g => ({
      name: g.name,
      value: g.value,
      weight: g.weight,
    }))),
  });
  return createHash('sha256').update(data).digest('hex').substring(0, 64);
};

export const createFounderGenome = (): DynamicGenome => {
  const lineageId = generateId();
  const chromosomes = FOUNDER_CHROMOSOMES.map(c => cloneChromosome(c, lineageId));
  
  const genome: DynamicGenome = {
    meta: {
      generation: 0,
      lineageId,
      genomeHash: '',
      totalGenes: chromosomes.reduce((sum, c) => sum + c.genes.length, 0),
      birthTimestamp: Date.now(),
    },
    chromosomes,
    regulatoryNetwork: [],
    epigenome: [],
  };
  
  genome.meta.genomeHash = calculateGenomeHash(genome);
  
  return genome;
};

export const createLineageId = generateId;
