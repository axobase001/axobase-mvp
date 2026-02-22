/**
 * Birth Module
 * Agent creation and initialization
 */

import { DynamicGenome, AgentId, createFounderGenome, crossover } from '../genome/index.js';
import { createHDWallet, transferUSDC } from '../tools/wallet.js';
import { initializeAgentQueue } from '../tools/network.js';
import { env } from '../config/env.js';

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
  
  // Transfer initial balance from parents
  const balancePerParent = env.INITIAL_USDC_PER_AGENT / 2;
  
  try {
    await transferUSDC(
      createHDWallet(parent1.walletIndex),
      wallet.address,
      balancePerParent
    );
    await transferUSDC(
      createHDWallet(parent2.walletIndex),
      wallet.address,
      balancePerParent
    );
  } catch {
    // DECISION: Mock transfers allowed in MVP for testing
  }
  
  return {
    id: wallet.address,
    walletIndex: index,
    genome: childGenome,
    parentIds: [parent1.id, parent2.id],
    initialBalance: env.INITIAL_USDC_PER_AGENT,
  };
};
