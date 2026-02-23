/**
 * Birth Module
 * Agent creation and initialization
 */

import { DynamicGenome, AgentId, createFounderGenome, crossover } from '../genome/index.js';
import { createHDWallet } from '../tools/wallet.js';
import { initializeAgentQueue } from '../tools/network.js';
import { env } from '../config/env.js';
import { CONSTANTS } from '../config/constants.js';

export interface AgentConfig {
  id: AgentId;
  walletIndex: number;
  genome: DynamicGenome;
  parentIds: [AgentId, AgentId] | null;
  initialBalance: number;
}

export const createFounderAgent = async (index: number): Promise<AgentConfig> => {
  const genome = createFounderGenome();
  const wallet = createHDWallet(index);
  
  initializeAgentQueue(wallet.address);
  
  const config: AgentConfig = {
    id: wallet.address,
    walletIndex: index,
    genome,
    parentIds: null,
    initialBalance: env.INITIAL_USDC_PER_AGENT,
  };
  
  return config;
};

export const createOffspring = async (
  parent1: AgentConfig,
  parent2: AgentConfig,
  index: number
): Promise<AgentConfig> => {
  const { genome: childGenome } = crossover({
    parentA: parent1.genome,
    parentB: parent2.genome,
    parentAId: parent1.id,
    parentBId: parent2.id,
    environmentalStress: 0,
  });
  
  const wallet = createHDWallet(index);
  initializeAgentQueue(wallet.address);

  // 子代初始资金来自父母各贡献 BREEDING_COST_PER_PARENT（在 survival.ts phase_breedingCheck 和
  // population.ts 中各自从父母余额扣除）。此处直接设置子代余额，不依赖链上转账。
  const offspringBalance = CONSTANTS.OFFSPRING_INITIAL_BALANCE;

  return {
    id: wallet.address,
    walletIndex: index,
    genome: childGenome,
    parentIds: [parent1.id, parent2.id],
    initialBalance: offspringBalance,
  };
};
