/**
 * Death Module
 * Agent death conditions and cleanup
 */

import { DynamicGenome } from '../genome/index.js';
import { AgentConfig } from './birth.js';
import { CONSTANTS } from '../config/constants.js';
import { clearAgentQueue } from '../tools/network.js';

export type DeathCause = 'economic' | 'genetic' | 'natural' | 'suicide';

export interface DeathVerdict {
  isDead: boolean;
  cause?: DeathCause;
  reason: string;
}

export interface Tombstone {
  agentId: string;
  timestamp: number;
  cause: DeathCause;
  age: number;
  finalBalance: number;
  genomeHash: string;
  generation: number;
}

export const checkDeath = (
  agent: AgentConfig,
  balanceUSDC: number,
  tick: number,
  consecutiveFailures: number
): DeathVerdict => {
  // Economic death
  if (balanceUSDC < CONSTANTS.DEATH_BALANCE_THRESHOLD) {
    return { isDead: true, cause: 'economic', reason: 'Balance depleted' };
  }
  
  // Genetic death (essential genes deleted)
  const essentialGenes = agent.genome.chromosomes
    .flatMap(c => c.genes)
    .filter(g => g.essentiality >= 0.5);
  if (essentialGenes.length < 20) {
    return { isDead: true, cause: 'genetic', reason: 'Genome integrity compromised' };
  }
  
  // Natural death (max lifespan)
  const maxAge = agent.genome.chromosomes
    .flatMap(c => c.genes)
    .find(g => g.name === 'max_lifespan')?.value || 1;
  if (tick > maxAge * 1000) {
    return { isDead: true, cause: 'natural', reason: 'Maximum lifespan reached' };
  }
  
  // Gradual decline
  if (consecutiveFailures > 100) {
    return { isDead: true, cause: 'economic', reason: 'Persistent failure to generate income' };
  }
  
  return { isDead: false, reason: 'Alive' };
};

export const executeDeath = (
  agent: AgentConfig,
  cause: DeathCause,
  tick: number,
  balanceUSDC: number
): Tombstone => {
  clearAgentQueue(agent.id);
  
  return {
    agentId: agent.id,
    timestamp: Date.now(),
    cause,
    age: tick,
    finalBalance: balanceUSDC,
    genomeHash: agent.genome.meta.genomeHash,
    generation: agent.genome.meta.generation,
  };
};
