/**
 * Environment Perception
 * Gathers information for agent decision making
 */

import { ExpressionResult } from '../genome/types.js';

export interface PerceptionResult {
  self: {
    agentId: string;
    genomeExpression: ExpressionResult;
    age: number;
    generation: number;
  };
  balance: {
    usdc: number;
    eth: number;
    dailyBurnRate: number;
    daysOfRunway: number;
  };
  environment: {
    mode: 'normal' | 'low_power' | 'emergency' | 'dormant';
    stressLevel: number;
  };
  market: {
    ethPrice: number;
    gasPrice: number;
    opportunities: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  agents: {
    count: number;
    averageBalance: number;
    cooperationRequests: string[];
  };
  memory: {
    shortTermCount: number;
    recentEvents: string[];
    lastActionSuccess: boolean | null;
  };
  tick: number;
}

interface PerceptionConfig {
  agentId: string;
  genomeExpression: ExpressionResult;
  tick: number;
  age: number;
  generation: number;
}

const MOCK_ETH_PRICE = 3000;
const MOCK_GAS_PRICE = 0.1;

export const perceive = async (config: PerceptionConfig): Promise<PerceptionResult> => {
  const { agentId, genomeExpression, tick, age, generation } = config;
  
  // DECISION: Using mock values for MVP - real implementation would query chain
  const usdcBalance = await getUSDCBalance(agentId);
  const ethBalance = await getETHBalance(agentId);
  
  const dailyBurn = genomeExpression.metabolicCost;
  const runway = usdcBalance / (dailyBurn || 0.01);
  
  return {
    self: {
      agentId,
      genomeExpression,
      age,
      generation,
    },
    balance: {
      usdc: usdcBalance,
      eth: ethBalance,
      dailyBurnRate: dailyBurn,
      daysOfRunway: runway,
    },
    environment: {
      mode: determineMode(usdcBalance),
      stressLevel: calculateStress(usdcBalance, runway),
    },
    market: {
      ethPrice: MOCK_ETH_PRICE,
      gasPrice: MOCK_GAS_PRICE,
      opportunities: [],
      riskLevel: determineMarketRisk(usdcBalance),
    },
    agents: {
      count: 0,
      averageBalance: 0,
      cooperationRequests: [],
    },
    memory: {
      shortTermCount: 0,
      recentEvents: [],
      lastActionSuccess: null,
    },
    tick,
  };
};

const determineMode = (balance: number): PerceptionResult['environment']['mode'] => {
  if (balance < 0.5) return 'dormant';
  if (balance < 2) return 'emergency';
  if (balance < 5) return 'low_power';
  return 'normal';
};

const calculateStress = (balance: number, runway: number): number => {
  let stress = 0;
  if (balance < 2) stress += 0.5;
  if (runway < 3) stress += 0.3;
  return Math.min(1, stress);
};

const determineMarketRisk = (balance: number): PerceptionResult['market']['riskLevel'] => {
  if (balance < 2) return 'high';
  if (balance < 5) return 'medium';
  return 'low';
};

// Mock functions - to be replaced with real chain queries
const getUSDCBalance = async (agentId: string): Promise<number> => {
  return 10;
};

const getETHBalance = async (agentId: string): Promise<number> => {
  return 0.01;
};
