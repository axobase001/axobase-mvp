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
import { appendFileSync, existsSync, mkdirSync } from 'fs';

const TOMBSTONE_FILE = './logs/tombstones.jsonl';
const ensureLogsDir = () => {
  if (!existsSync('./logs')) mkdirSync('./logs', { recursive: true });
};

export type DeathCause =
  | 'starvation'    // 余额耗尽（濒死超时）
  | 'competition'   // 种群过载竞争淘汰
  | 'plague'        // 环境灾难
  | 'senescence'    // 衰老自然死亡
  | 'economic'      // 旧兼容
  | 'genetic'       // 基因缺陷
  | 'natural'       // 旧兼容
  | 'suicide'       // 自我终止
  | 'unknown';

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
      clearAPIHistory(agent.id);
    } catch (error) {
      console.error('❌ 记录死亡档案失败:', error);
    }
  }

  // 写纯文本墓碑到 logs/tombstones.txt
  try {
    ensureLogsDir();
    const ts = new Date().toISOString();
    const sep = '─'.repeat(60);
    const earned = state?.totalEarned ?? { defi: 0, tasks: 0, events: 0, tokens: 0 };
    const spent = state?.totalSpent ?? { operational: 0, losses: 0, inference: 0 };
    const lastActions = (state?.actionHistory ?? []).slice(-5)
      .map(a => `    tick${a.tick} ${a.action} ${a.success ? '✓' : '✗'} +$${a.revenue.toFixed(3)} -$${a.cost.toFixed(3)}`)
      .join('\n') || '    (none)';
    const text = [
      '',
      '═'.repeat(60),
      `TOMBSTONE  Agent: ${agent.id.slice(0, 12)}  Died: ${ts}`,
      `Cause: ${cause.toUpperCase()}  Age: ${tick} ticks  Final Balance: $${balanceUSDC.toFixed(4)}`,
      `Generation: ${agent.genome.meta.generation}  Parents: ${agent.parentIds ? agent.parentIds.map(p => p.slice(0, 8)).join(' × ') : 'founder'}`,
      `Genome Hash: ${agent.genome.meta.genomeHash.slice(0, 24)}  Total Genes: ${agent.genome.meta.totalGenes}`,
      sep,
      `LLM Calls: ${state?.totalLLMCalls ?? 0}`,
      `Earned — DeFi: $${earned.defi?.toFixed(3) ?? 0}  Tasks: $${earned.tasks?.toFixed(3) ?? 0}  Tokens: $${(earned.tokens ?? 0).toFixed(3)}`,
      `Spent  — Ops: $${spent.operational?.toFixed(3) ?? 0}  Losses: $${spent.losses?.toFixed(3) ?? 0}  Inference: $${(spent.inference ?? 0).toFixed(3)}`,
      sep,
      'LAST 5 ACTIONS:',
      lastActions,
      sep,
      'LAST REASONING:',
      (state?.lastReasoning ?? '(no reasoning recorded)').trim(),
      '',
    ].join('\n');
    appendFileSync('./logs/tombstones.txt', text);
  } catch { /* best effort */ }

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
