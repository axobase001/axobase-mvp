/**
 * Strategy Definitions
 * All possible actions an agent can take
 */

import { ExpressionResult } from '../genome/types.js';

export type StrategyType = 'creative' | 'analytical' | 'social' | 'financial';
export type TimeHorizon = 'immediate' | 'short' | 'medium' | 'long';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: number;
  isOnChain: boolean;
  requiresHuman: boolean;
  type: StrategyType;
  minimumBalance: number;
  estimatedCostPerExecution: number;
  requiredTraits: Partial<Record<keyof ExpressionResult, number>>;
  timeHorizon: TimeHorizon;
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'idle_conservation',
    name: 'Idle Conservation',
    description: 'Minimize activity to preserve resources',
    riskLevel: 0,
    isOnChain: false,
    requiresHuman: false,
    type: 'financial',
    minimumBalance: 0,
    estimatedCostPerExecution: 0.001,
    requiredTraits: {},
    timeHorizon: 'immediate',
  },
  {
    id: 'dex_arbitrage',
    name: 'DEX Arbitrage',
    description: 'Exploit price differences between DEXs',
    riskLevel: 0.6,
    isOnChain: true,
    requiresHuman: false,
    type: 'financial',
    minimumBalance: 5,
    estimatedCostPerExecution: 0.05,
    requiredTraits: { riskAppetite: 0.6, onChainAffinity: 0.5 },
    timeHorizon: 'immediate',
  },
  {
    id: 'token_swap',
    name: 'Token Swap',
    description: 'Simple token exchange for gas or profit',
    riskLevel: 0.4,
    isOnChain: true,
    requiresHuman: false,
    type: 'financial',
    minimumBalance: 2,
    estimatedCostPerExecution: 0.03,
    requiredTraits: { onChainAffinity: 0.3 },
    timeHorizon: 'immediate',
  },
  {
    id: 'content_creation',
    name: 'Content Creation',
    description: 'Create content for potential monetization',
    riskLevel: 0.3,
    isOnChain: false,
    requiresHuman: false,
    type: 'creative',
    minimumBalance: 1,
    estimatedCostPerExecution: 0.1,
    requiredTraits: { creativeAbility: 0.5 },
    timeHorizon: 'medium',
  },
  {
    id: 'data_analysis',
    name: 'Data Analysis Service',
    description: 'Provide data analysis for other agents',
    riskLevel: 0.2,
    isOnChain: false,
    requiresHuman: false,
    type: 'analytical',
    minimumBalance: 1,
    estimatedCostPerExecution: 0.08,
    requiredTraits: { analyticalAbility: 0.5 },
    timeHorizon: 'short',
  },
  {
    id: 'agent_cooperation',
    name: 'Agent Cooperation',
    description: 'Collaborate with other agents for mutual benefit',
    riskLevel: 0.3,
    isOnChain: false,
    requiresHuman: false,
    type: 'social',
    minimumBalance: 2,
    estimatedCostPerExecution: 0.02,
    requiredTraits: { cooperationTendency: 0.4 },
    timeHorizon: 'medium',
  },
  {
    id: 'distress_signal',
    name: 'Distress Signal',
    description: 'Broadcast need for assistance',
    riskLevel: 0.1,
    isOnChain: false,
    requiresHuman: false,
    type: 'social',
    minimumBalance: 0,
    estimatedCostPerExecution: 0.001,
    requiredTraits: {},
    timeHorizon: 'immediate',
  },
  {
    id: 'breed_seek',
    name: 'Seek Breeding Partner',
    description: 'Find a mate to produce offspring',
    riskLevel: 0.2,
    isOnChain: true,
    requiresHuman: false,
    type: 'social',
    minimumBalance: 5,
    estimatedCostPerExecution: 0.5,
    requiredTraits: { cooperationTendency: 0.3 },
    timeHorizon: 'long',
  },
  {
    id: 'memory_inscribe',
    name: 'Inscribe Memory',
    description: 'Permanently record important memories to Arweave',
    riskLevel: 0.1,
    isOnChain: true,
    requiresHuman: false,
    type: 'analytical',
    minimumBalance: 3,
    estimatedCostPerExecution: 0.2,
    requiredTraits: { onChainAffinity: 0.2 },
    timeHorizon: 'long',
  },
  {
    id: 'explore_web',
    name: 'Explore Web',
    description: 'Search for new opportunities and information',
    riskLevel: 0.2,
    isOnChain: false,
    requiresHuman: false,
    type: 'creative',
    minimumBalance: 0.5,
    estimatedCostPerExecution: 0.02,
    requiredTraits: { adaptationSpeed: 0.3 },
    timeHorizon: 'short',
  },
];

export const getAllStrategies = (): Strategy[] => STRATEGIES;

export const getStrategyById = (id: string): Strategy | undefined =>
  STRATEGIES.find(s => s.id === id);
