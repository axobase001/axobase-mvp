/**
 * Environment Perception
 * Gathers real simulation state for agent decision making.
 *
 * 修复：不再使用硬编码余额（原来始终返回10 USDC），
 * 改为从 simulated balance 存储读取，确保 LLM 收到真实数据。
 */

import { ExpressionResult } from '../genome/types.js';
import { getSimulatedBalance } from '../tools/wallet.js';

export interface PerceptionResult {
  self: {
    agentId: string;
    genomeExpression: ExpressionResult;
    age: number;
    generation: number;
    callNumber?: number;
    totalCallsExpected?: number;
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
  callNumber?: number;
  totalCallsExpected?: number;
}

// Simulation-mode constants (no real chain)
const SIM_ETH_BALANCE = 0.01;
const SIM_ETH_PRICE = 3000;
const SIM_GAS_PRICE = 0.1;

export const perceive = async (config: PerceptionConfig): Promise<PerceptionResult> => {
  const { agentId, genomeExpression, tick, age, generation, callNumber, totalCallsExpected } = config;

  // Use real simulated balance — fixes the hardcoded-10 bug
  const usdcBalance = getSimulatedBalance(agentId) ?? 0;
  const ethBalance = SIM_ETH_BALANCE;

  const dailyBurn = genomeExpression.metabolicCost;
  const runway = usdcBalance / (dailyBurn || 0.01);

  return {
    self: {
      agentId,
      genomeExpression,
      age,
      generation,
      callNumber,
      totalCallsExpected,
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
      ethPrice: SIM_ETH_PRICE,
      gasPrice: SIM_GAS_PRICE,
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
