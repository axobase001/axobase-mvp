/**
 * Genome Type System
 * Foundation of Axobase digital life
 */

export type GeneId = string;
export type ChromosomeId = string;
export type GenomeHash = string;
export type AgentId = string;

export enum GeneDomain {
  METABOLISM = 'METABOLISM',
  COGNITION = 'COGNITION',
  RESOURCE_MGMT = 'RESOURCE_MGMT',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  TRADING = 'TRADING',
  ONCHAIN_OP = 'ONCHAIN_OP',
  WEB_NAVIGATION = 'WEB_NAVIGATION',
  CONTENT_CREATION = 'CONTENT_CREATION',
  DATA_ANALYSIS = 'DATA_ANALYSIS',
  API_UTILIZATION = 'API_UTILIZATION',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  COOPERATION = 'COOPERATION',
  COMPETITION = 'COMPETITION',
  COMMUNICATION = 'COMMUNICATION',
  TRUST_MODEL = 'TRUST_MODEL',
  MATE_SELECTION = 'MATE_SELECTION',
  PARENTAL_INVEST = 'PARENTAL_INVEST',
  HUMAN_HIRING = 'HUMAN_HIRING',
  HUMAN_COMM = 'HUMAN_COMM',
  HUMAN_EVAL = 'HUMAN_EVAL',
  STRESS_RESPONSE = 'STRESS_RESPONSE',
  ADAPTATION = 'ADAPTATION',
  DORMANCY = 'DORMANCY',
  MIGRATION = 'MIGRATION',
  SELF_MODEL = 'SELF_MODEL',
  STRATEGY_EVAL = 'STRATEGY_EVAL',
  LEARNING = 'LEARNING',
  PLANNING = 'PLANNING',
  REGULATORY = 'REGULATORY',
}

export enum GeneOrigin {
  PRIMORDIAL = 'PRIMORDIAL',
  INHERITED = 'INHERITED',
  DUPLICATED = 'DUPLICATED',
  MUTATED = 'MUTATED',
  HORIZONTAL_TRANSFER = 'HORIZONTAL_TRANSFER',
  DE_NOVO = 'DE_NOVO',
}

export enum ExpressionState {
  ACTIVE = 'active',
  SILENCED = 'silenced',
  CONDITIONAL = 'conditional',
}

export interface Gene {
  id: GeneId;
  name: string;
  domain: GeneDomain;
  value: number;
  weight: number;
  dominance: number;
  plasticity: number;
  essentiality: number;
  metabolicCost: number;
  origin: GeneOrigin;
  age: number;
  duplicateOf?: GeneId;
  acquiredFrom?: AgentId;
  expressionState: ExpressionState;
  activationCondition?: string;
}

export interface Chromosome {
  id: ChromosomeId;
  name: string;
  genes: Gene[];
  isEssential: boolean;
}

export interface RegulatoryEdge {
  sourceGeneId: GeneId;
  targetGeneId: GeneId;
  relationship: 'activation' | 'inhibition';
  strength: number;
}

export interface EpigeneticMark {
  targetGeneId: GeneId;
  modification: 'upregulate' | 'downregulate' | 'silence' | 'activate';
  strength: number;
  cause: string;
  heritability: number;
  decay: number;
  generationCreated: number;
}

export interface DynamicGenome {
  meta: {
    generation: number;
    lineageId: string;
    genomeHash: GenomeHash;
    totalGenes: number;
    birthTimestamp: number;
  };
  chromosomes: Chromosome[];
  regulatoryNetwork: RegulatoryEdge[];
  epigenome: EpigeneticMark[];
}

export interface ExpressedGene extends Gene {
  expressedValue: number;
  regulatoryEffect: number;
  epigeneticEffect: number;
}

export interface ExpressionResult {
  riskAppetite: number;
  onChainAffinity: number;
  cooperationTendency: number;
  savingsRate: number;
  inferenceQuality: number;
  creativeAbility: number;
  analyticalAbility: number;
  humanDependence: number;
  adaptationSpeed: number;
  stressResponse: number;
  learningRate: number;
  planningHorizon: number;
  metabolicCost: number;
  maxLifespan: number;
  cycleSpeed: number;
  globalMutationRate: number;
  crossoverRate: number;
}

export interface MutationEvent {
  geneId: GeneId;
  type: 'point' | 'duplication' | 'deletion' | 'hgt' | 'de_novo' | 'crossover';
  before: unknown;
  after: unknown;
  generation: number;
}

export interface BreedingContext {
  parentA: DynamicGenome;
  parentB: DynamicGenome;
  parentAId: AgentId;
  parentBId: AgentId;
  environmentalStress: number;
}
