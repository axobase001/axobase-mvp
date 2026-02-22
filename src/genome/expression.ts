/**
 * Genome Expression Engine
 * Maps genotype to phenotype
 */

import { DynamicGenome, ExpressionResult, ExpressedGene, ExpressionState, GeneDomain } from './types.js';

const clamp = (v: number): number => Math.max(0, Math.min(1, v));

const getGeneValue = (genome: DynamicGenome, geneName: string): number => {
  const gene = genome.chromosomes
    .flatMap(c => c.genes)
    .find(g => g.name === geneName);
  
  if (!gene) return 0.5;
  if (gene.expressionState === ExpressionState.SILENCED) return 0;
  
  const baseValue = gene.value * gene.weight;
  
  const regulatoryEffect = genome.regulatoryNetwork
    .filter(edge => edge.targetGeneId === gene.id)
    .reduce((sum, edge) => {
      const source = genome.chromosomes.flatMap(c => c.genes).find(g => g.id === edge.sourceGeneId);
      if (!source) return sum;
      const effect = edge.relationship === 'activation' ? edge.strength : -edge.strength;
      return sum + effect * source.value;
    }, 0);
  
  const epigeneticEffect = genome.epigenome
    .filter(mark => mark.targetGeneId === gene.id)
    .reduce((sum, mark) => {
      const effect = mark.modification === 'upregulate' || mark.modification === 'activate'
        ? mark.strength
        : -mark.strength;
      return sum + effect;
    }, 0);
  
  return clamp(baseValue + regulatoryEffect + epigeneticEffect);
};

const averageDomainExpression = (genome: DynamicGenome, domain: GeneDomain): number => {
  const genes = genome.chromosomes.flatMap(c => c.genes).filter(g => g.domain === domain);
  if (genes.length === 0) return 0.5;
  
  const values = genes.map(g => getGeneValue(genome, g.name));
  return values.reduce((a, b) => a + b, 0) / values.length;
};

export const expressGenome = (genome: DynamicGenome): ExpressionResult => ({
  riskAppetite: getGeneValue(genome, 'risk_appetite'),
  onChainAffinity: getGeneValue(genome, 'onchain_affinity'),
  cooperationTendency: getGeneValue(genome, 'cooperation_tendency'),
  savingsRate: getGeneValue(genome, 'savings_rate'),
  inferenceQuality: getGeneValue(genome, 'inference_quality_pref'),
  creativeAbility: getGeneValue(genome, 'content_creation_ability'),
  analyticalAbility: getGeneValue(genome, 'data_analysis_skill'),
  humanDependence: getGeneValue(genome, 'human_hiring_tendency'),
  adaptationSpeed: getGeneValue(genome, 'adaptation_speed'),
  stressResponse: getGeneValue(genome, 'stress_response_speed'),
  learningRate: getGeneValue(genome, 'learning_rate'),
  planningHorizon: getGeneValue(genome, 'planning_horizon'),
  metabolicCost: calculateMetabolicCost(genome),
  maxLifespan: Math.floor(getGeneValue(genome, 'max_lifespan') * 1000),
  cycleSpeed: getGeneValue(genome, 'decision_cycle_speed'),
  globalMutationRate: getGeneValue(genome, 'global_mutation_rate'),
  crossoverRate: getGeneValue(genome, 'crossover_rate'),
});

const calculateMetabolicCost = (genome: DynamicGenome): number => {
  return genome.chromosomes
    .flatMap(c => c.genes)
    .reduce((sum, g) => sum + g.metabolicCost, 0);
};

export const getExpressedGenes = (genome: DynamicGenome): ExpressedGene[] => {
  return genome.chromosomes.flatMap(c =>
    c.genes.map(g => ({
      ...g,
      expressedValue: getGeneValue(genome, g.name),
      regulatoryEffect: genome.regulatoryNetwork
        .filter(e => e.targetGeneId === g.id)
        .reduce((sum, e) => sum + (e.relationship === 'activation' ? e.strength : -e.strength), 0),
      epigeneticEffect: genome.epigenome
        .filter(m => m.targetGeneId === g.id)
        .reduce((sum, m) => sum + (m.modification === 'upregulate' ? m.strength : -m.strength), 0),
    }))
  );
};
