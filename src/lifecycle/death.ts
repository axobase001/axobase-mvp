/**
 * Death Module
 * Agent death conditions and cleanup
 */

import { DynamicGenome } from '../genome/index.js';
import { AgentConfig } from './birth.js';
import { CONSTANTS } from '../config/constants.js';
import { clearAgentQueue } from '../tools/network.js';
import { SurvivalState } from './survival.js';
import { createDeathRecord, recordToGraveyard, APIRequestRecord } from '../monitoring/graveyard.js';

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
  // RELAXED: Only check if critically low, not strict 20-gene minimum
  const essentialGenes = agent.genome.chromosomes
    .flatMap(c => c.genes)
    .filter(g => g.essentiality >= 0.5);
  if (essentialGenes.length < 3) {
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

// API 历史记录存储 (每个agent的API调用历史)
const apiHistoryStore = new Map<string, APIRequestRecord[]>();

export function recordAPIRequest(agentId: string, request: APIRequestRecord): void {
  const history = apiHistoryStore.get(agentId) || [];
  history.push(request);
  // 只保留最近50条
  if (history.length > 50) {
    history.shift();
  }
  apiHistoryStore.set(agentId, history);
}

export function getAPIHistory(agentId: string): APIRequestRecord[] {
  return apiHistoryStore.get(agentId) || [];
}

export function clearAPIHistory(agentId: string): void {
  apiHistoryStore.delete(agentId);
}

export const executeDeath = (
  agent: AgentConfig,
  cause: DeathCause,
  tick: number,
  balanceUSDC: number,
  state?: SurvivalState,
  verdict?: DeathVerdict
): Tombstone => {
  clearAgentQueue(agent.id);
  
  // 🪦 自动记录到数字墓地
  if (state && verdict) {
    try {
      const apiHistory = getAPIHistory(agent.id);
      const record = createDeathRecord(agent, state, verdict, apiHistory);
      recordToGraveyard(record);
      clearAPIHistory(agent.id); // 清理历史记录
    } catch (error) {
      console.error('❌ 记录死亡档案失败:', error);
    }
  }
  
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
