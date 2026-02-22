/**
 * 63 Founder Genes Definition
 * 8 chromosomes, initial gene pool for Axobase life
 */

import { Gene, GeneDomain, GeneOrigin, Chromosome, ExpressionState } from './types.js';

const createGene = (
  id: string,
  name: string,
  domain: GeneDomain,
  essentiality: number
): Gene => ({
  id,
  name,
  domain,
  value: 0.5,
  weight: 1.0,
  dominance: 0.5,
  plasticity: 0.25,
  essentiality,
  metabolicCost: essentiality * 0.0005,
  origin: GeneOrigin.PRIMORDIAL,
  age: 0,
  expressionState: ExpressionState.ACTIVE,
});

// Chromosome A: Metabolism & Survival (8 genes)
const chromosomeA: Chromosome = {
  id: 'chr-A',
  name: 'Metabolism & Survival',
  genes: [
    createGene('A01', 'basal_metabolic_rate', GeneDomain.METABOLISM, 0.9),
    createGene('A02', 'inference_efficiency', GeneDomain.METABOLISM, 0.7),
    createGene('A03', 'inference_quality_pref', GeneDomain.COGNITION, 0.5),
    createGene('A04', 'dormancy_capability', GeneDomain.DORMANCY, 0.3),
    createGene('A05', 'starvation_resistance', GeneDomain.STRESS_RESPONSE, 0.6),
    createGene('A06', 'decision_cycle_speed', GeneDomain.METABOLISM, 0.8),
    createGene('A07', 'energy_allocation_ratio', GeneDomain.RESOURCE_MGMT, 0.5),
    createGene('A08', 'max_lifespan', GeneDomain.METABOLISM, 0.4),
  ],
  isEssential: true,
};

// Chromosome B: Economic Behavior (8 genes)
const chromosomeB: Chromosome = {
  id: 'chr-B',
  name: 'Economic Behavior',
  genes: [
    createGene('B01', 'risk_appetite', GeneDomain.RISK_ASSESSMENT, 0.4),
    createGene('B02', 'savings_rate', GeneDomain.RESOURCE_MGMT, 0.5),
    createGene('B03', 'investment_horizon', GeneDomain.TRADING, 0.3),
    createGene('B04', 'loss_aversion', GeneDomain.RISK_ASSESSMENT, 0.4),
    createGene('B05', 'opportunity_detection', GeneDomain.COGNITION, 0.5),
    createGene('B06', 'diversification_pref', GeneDomain.RESOURCE_MGMT, 0.3),
    createGene('B07', 'cost_sensitivity', GeneDomain.RESOURCE_MGMT, 0.6),
    createGene('B08', 'income_vs_savings_bias', GeneDomain.RESOURCE_MGMT, 0.4),
  ],
  isEssential: true,
};

// Chromosome C: Internet Capabilities (8 genes)
const chromosomeC: Chromosome = {
  id: 'chr-C',
  name: 'Internet Capabilities',
  genes: [
    createGene('C01', 'onchain_affinity', GeneDomain.ONCHAIN_OP, 0.3),
    createGene('C02', 'web_navigation_skill', GeneDomain.WEB_NAVIGATION, 0.4),
    createGene('C03', 'content_creation_ability', GeneDomain.CONTENT_CREATION, 0.2),
    createGene('C04', 'data_analysis_skill', GeneDomain.DATA_ANALYSIS, 0.3),
    createGene('C05', 'api_utilization', GeneDomain.API_UTILIZATION, 0.4),
    createGene('C06', 'social_media_aptitude', GeneDomain.SOCIAL_MEDIA, 0.2),
    createGene('C07', 'creative_vs_analytical', GeneDomain.COGNITION, 0.3),
    createGene('C08', 'tool_learning_speed', GeneDomain.LEARNING, 0.4),
  ],
  isEssential: true,
};

// Chromosome D: Social & Reproduction (8 genes)
const chromosomeD: Chromosome = {
  id: 'chr-D',
  name: 'Social & Reproduction',
  genes: [
    createGene('D01', 'cooperation_tendency', GeneDomain.COOPERATION, 0.3),
    createGene('D02', 'competition_drive', GeneDomain.COMPETITION, 0.3),
    createGene('D03', 'trust_default', GeneDomain.TRUST_MODEL, 0.4),
    createGene('D04', 'signal_honesty', GeneDomain.COMMUNICATION, 0.3),
    createGene('D05', 'communication_frequency', GeneDomain.COMMUNICATION, 0.3),
    createGene('D06', 'breeding_selectivity', GeneDomain.MATE_SELECTION, 0.2),
    createGene('D07', 'offspring_investment', GeneDomain.PARENTAL_INVEST, 0.3),
    createGene('D08', 'kin_recognition', GeneDomain.TRUST_MODEL, 0.3),
  ],
  isEssential: true,
};

// Chromosome E: Human Interface (7 genes)
const chromosomeE: Chromosome = {
  id: 'chr-E',
  name: 'Human Interface',
  genes: [
    createGene('E01', 'human_hiring_tendency', GeneDomain.HUMAN_HIRING, 0.2),
    createGene('E02', 'human_comm_skill', GeneDomain.HUMAN_COMM, 0.3),
    createGene('E03', 'human_eval_ability', GeneDomain.HUMAN_EVAL, 0.3),
    createGene('E04', 'human_trust', GeneDomain.TRUST_MODEL, 0.2),
    createGene('E05', 'task_delegation_pref', GeneDomain.HUMAN_HIRING, 0.2),
    createGene('E06', 'human_payment_fairness', GeneDomain.HUMAN_EVAL, 0.3),
    createGene('E07', 'human_feedback_response', GeneDomain.ADAPTATION, 0.3),
  ],
  isEssential: true,
};

// Chromosome F: Environmental Adaptation (8 genes)
const chromosomeF: Chromosome = {
  id: 'chr-F',
  name: 'Environmental Adaptation',
  genes: [
    createGene('F01', 'stress_response_speed', GeneDomain.STRESS_RESPONSE, 0.5),
    createGene('F02', 'adaptation_speed', GeneDomain.ADAPTATION, 0.5),
    createGene('F03', 'dormancy_trigger_thresh', GeneDomain.DORMANCY, 0.3),
    createGene('F04', 'migration_willingness', GeneDomain.MIGRATION, 0.2),
    createGene('F05', 'environment_sensitivity', GeneDomain.COGNITION, 0.4),
    createGene('F06', 'memory_utilization', GeneDomain.COGNITION, 0.5),
    createGene('F07', 'novelty_seeking', GeneDomain.ADAPTATION, 0.3),
    createGene('F08', 'routine_preference', GeneDomain.ADAPTATION, 0.3),
  ],
  isEssential: true,
};

// Chromosome G: Metacognition (8 genes)
const chromosomeG: Chromosome = {
  id: 'chr-G',
  name: 'Metacognition',
  genes: [
    createGene('G01', 'self_model_accuracy', GeneDomain.SELF_MODEL, 0.4),
    createGene('G02', 'strategy_evaluation', GeneDomain.STRATEGY_EVAL, 0.5),
    createGene('G03', 'learning_rate', GeneDomain.LEARNING, 0.5),
    createGene('G04', 'planning_horizon', GeneDomain.PLANNING, 0.4),
    createGene('G05', 'metacognition_depth', GeneDomain.SELF_MODEL, 0.4),
    createGene('G06', 'failure_analysis', GeneDomain.STRATEGY_EVAL, 0.4),
    createGene('G07', 'prediction_confidence', GeneDomain.COGNITION, 0.3),
    createGene('G08', 'attention_allocation', GeneDomain.COGNITION, 0.4),
  ],
  isEssential: true,
};

// Chromosome H: Regulatory Genes (8 genes)
const chromosomeH: Chromosome = {
  id: 'chr-H',
  name: 'Regulatory Genes',
  genes: [
    createGene('H01', 'global_mutation_rate', GeneDomain.REGULATORY, 0.6),
    createGene('H02', 'stress_induced_mutagenesis', GeneDomain.REGULATORY, 0.4),
    createGene('H03', 'gene_silencing_strength', GeneDomain.REGULATORY, 0.4),
    createGene('H04', 'epigenetic_sensitivity', GeneDomain.REGULATORY, 0.4),
    createGene('H05', 'crossover_rate', GeneDomain.REGULATORY, 0.5),
    createGene('H06', 'gene_duplication_rate', GeneDomain.REGULATORY, 0.3),
    createGene('H07', 'gene_deletion_rate', GeneDomain.REGULATORY, 0.3),
    createGene('H08', 'de_novo_gene_rate', GeneDomain.REGULATORY, 0.2),
  ],
  isEssential: true,
};

export const FOUNDER_CHROMOSOMES: Chromosome[] = [
  chromosomeA,
  chromosomeB,
  chromosomeC,
  chromosomeD,
  chromosomeE,
  chromosomeF,
  chromosomeG,
  chromosomeH,
];

export const FOUNDER_GENE_COUNT = 63;
