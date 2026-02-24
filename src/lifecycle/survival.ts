/**
 * Survival Loop — 每 tick = 1 天
 *
 * 重构为 9 个独立 Phase 函数，每个 phase 返回 PhaseResult。
 * runSurvivalTick 按顺序组合各 phase，保持主函数简洁可读。
 *
 * Phase 顺序:
 *   1. processExistingDefi     — 处理已有DeFi仓位（收益/到期）
 *   2. payDailyCosts           — 扣除运营成本
 *   3. openNewDefi             — 开新DeFi仓位（如有流动资本）
 *   4. checkAirdrops           — 空投检查
 *   5. runHumanTasks           — 人工任务市场
 *   6. applyNegativeEvents     — 负面事件（现在是per-agent独立随机）
 *   7. runLLMDecisions         — LLM决策（可通过 NO_LLM=true 跳过）
 *   8. manageTokens            — 代币持有/出售决策
 *   9. breedingCheck           — 繁殖检查（修复：更新 lastBreedingTick）
 */

import { AgentConfig } from './birth.js';
import { checkDeath, executeDeath, Tombstone, recordAPIRequest } from './death.js';
import { canBreed, selectMate } from './breeding.js';
import { determineStage, DevelopmentStage, StageInfo, checkSenescence } from './development.js';
import { DecisionEngine } from '../decision/engine.js';
import { perceive } from '../decision/perceive.js';
import { getUSDCBalance } from '../tools/wallet.js';
import { inscribeMemory } from '../tools/arweave.js';
import { calculateDailyCost } from '../config/costs.js';
import {
  generateDailyNegativeEvents,
  applyNegativeEvent,
} from '../environment/negative-events.js';
import {
  getAvailableDeFiEvents,
  DeFiEvent,
  DeFiPortfolio,
  createEmptyPortfolio,
  openPosition,
  exitPosition,
  processPortfolioTick,
  DEFI_EVENTS,
} from '../environment/defi-events.js';
import { getAvailableTasks, attemptTask, updateAgentReputation } from '../environment/human-tasks.js';
import {
  TokenPortfolio,
  createEmptyTokenPortfolio,
  checkAirdropEligibility,
  generateAirdrop,
  updateTokenValues,
  sellTokens,
  holdTokens,
} from '../environment/airdrop-events.js';
import { expressGenome } from '../genome/index.js';
import { getInferenceCostEstimate } from '../decision/inference.js';
import { setSimulatedBalance } from '../tools/wallet.js';
import { CONSTANTS } from '../config/constants.js';
import { env } from '../config/env.js';
import { logConversation } from '../runtime/conversation-logger.js';
import {
  InferenceRecord, makeRecordId, hashPrompt, detectAnomalies,
  getEmergentPattern, writeInferenceRecord, writeAnomalyRecord, collectForStats,
} from '../runtime/inference-logger.js';
import { detectLanguage } from '../decision/engine.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SurvivalState {
  tick: number;
  isAlive: boolean;
  stage: DevelopmentStage;
  balanceUSDC: number;
  liquidCapital: number;
  lockedCapital: number;
  defiPortfolio: DeFiPortfolio;
  tokenPortfolio: TokenPortfolio;
  defiStats: {
    positionsOpened: number;
    totalCapitalDeployed: number;
    protocolsUsed: string[];
    firstDeFiTick: number;
  };
  consecutiveFailures: number;
  lastBreedingTick: number;
  actionHistory: Array<{ tick: number; action: string; success: boolean; cost: number; revenue: number }>;
  eventLog: Array<{ tick: number; event: string; impact: number }>;
  reputation: number;
  totalSpent: { operational: number; losses: number; inference: number };
  totalEarned: { defi: number; tasks: number; events: number; tokens: number };
  lastLLMCallTime: number;
  llmCallsThisTick: number;
  totalLLMCalls: number;
  // ── 濒死状态 ──────────────────────────────────────────────────────────
  survivalStatus: 'alive' | 'dying';
  dyingTicksRemaining: number;
  // ── 最后一次 LLM 推理（用于墓碑记录）──────────────────────────────────
  lastReasoning: string;
  // ── 推理谱系追踪 ────────────────────────────────────────────────────
  lastInferenceId: string | null;
  consecutiveAnomalyCount: number;
  // ── 涌现行为检测（per-tick，供 Population 读取后清空）────────────────
  emergentBehaviorInfo?: { pattern: string; reasoning: string; tick: number };
}

interface PhaseResult {
  events: string[];
  earnings: number;
  costs: number;
  losses: number;
}

// ─── State Factory ─────────────────────────────────────────────────────────────

export const initializeSurvivalState = (): SurvivalState => ({
  tick: 0,
  isAlive: true,
  stage: DevelopmentStage.NEONATE,
  balanceUSDC: 0,
  liquidCapital: 0,
  lockedCapital: 0,
  defiPortfolio: createEmptyPortfolio(),
  tokenPortfolio: createEmptyTokenPortfolio(),
  defiStats: { positionsOpened: 0, totalCapitalDeployed: 0, protocolsUsed: [], firstDeFiTick: 0 },
  consecutiveFailures: 0,
  lastBreedingTick: -CONSTANTS.BREEDING_COOLDOWN,
  actionHistory: [],
  eventLog: [],
  reputation: 0.5,
  totalSpent: { operational: 0, losses: 0, inference: 0 },
  totalEarned: { defi: 0, tasks: 0, events: 0, tokens: 0 },
  lastLLMCallTime: 0,
  llmCallsThisTick: 0,
  totalLLMCalls: 0,
  survivalStatus: 'alive',
  dyingTicksRemaining: 0,
  lastReasoning: '',
  lastInferenceId: null,
  consecutiveAnomalyCount: 0,
});

// ─── Helper ────────────────────────────────────────────────────────────────────

const updateBalance = (agentId: string, state: SurvivalState, newBalance: number): void => {
  state.balanceUSDC = Math.max(0, newBalance);
  setSimulatedBalance(agentId, state.balanceUSDC);
};

const capEarnings = (raw: number, balance: number): { capped: number; wasCapped: boolean } => {
  const max = balance * CONSTANTS.EARNINGS_CAP_PERCENT;
  if (raw > max) return { capped: max, wasCapped: true };
  return { capped: raw, wasCapped: false };
};

// ─── Phase 1: Process Existing DeFi Positions ─────────────────────────────────

function phase_existingDefi(state: SurvivalState): PhaseResult {
  const result: PhaseResult = { events: [], earnings: 0, costs: 0, losses: 0 };
  if (state.defiPortfolio.positions.length === 0) return result;

  const portfolioResult = processPortfolioTick(state.defiPortfolio, state.tick);
  result.events.push(...portfolioResult.messages);

  if (portfolioResult.accruedYield > 0) {
    const { capped, wasCapped } = capEarnings(portfolioResult.accruedYield, state.balanceUSDC);
    if (wasCapped) result.events.push(`⚠️ DeFi收益限流: $${portfolioResult.accruedYield.toFixed(2)}→$${capped.toFixed(2)}`);
    state.totalEarned.defi += capped;
    result.earnings += capped;
  }

  for (const position of portfolioResult.maturedPositions) {
    const event = DEFI_EVENTS.find(e => e.id === position.eventId);
    if (!event) continue;

    const exitResult = exitPosition(position, event, state.tick);
    if (exitResult.success) {
      const { capped } = capEarnings(exitResult.yieldClaimed, state.balanceUSDC);
      state.liquidCapital += exitResult.capitalReturned + capped;
      state.lockedCapital = Math.max(0, state.lockedCapital - position.capitalInvested);
      result.events.push(`💰 ${exitResult.message}`);
      result.earnings += capped;
    }
  }

  return result;
}

// ─── Phase 2: Daily Operational Costs ─────────────────────────────────────────

function phase_dailyCosts(state: SurvivalState, agent: AgentConfig): PhaseResult {
  const result: PhaseResult = { events: [], earnings: 0, costs: 0, losses: 0 };
  const expression = expressGenome(agent.genome);

  const inferenceCalls = expression.inferenceQuality > 0.7 ? 3 : expression.inferenceQuality > 0.4 ? 2 : 1;
  const txCount = expression.onChainAffinity > 0.7 ? 15 : expression.onChainAffinity > 0.4 ? 8 : 2;

  const varCost = calculateDailyCost({
    useAkash: false,
    inferenceCalls,
    transactions: txCount,
    storageInscriptions: 0,
    geneCount: agent.genome.meta.totalGenes,
  });

  // BASE_TICK_COST: flat metabolic floor (~30U / 0.8 ≈ 37.5 ticks without income)
  // 濒死状态：代谢成本降 50%
  const costMultiplier = state.survivalStatus === 'dying' ? 0.5 : 1.0;
  const opCost = (CONSTANTS.BASE_TICK_COST + varCost) * costMultiplier;

  const deductFrom = Math.min(opCost, state.balanceUSDC);
  state.liquidCapital = Math.max(0, state.liquidCapital - deductFrom);
  updateBalance(agent.id, state, state.balanceUSDC - deductFrom);
  state.totalSpent.operational += deductFrom;
  result.costs += deductFrom;

  const suffix = state.survivalStatus === 'dying' ? ' [濒死节能]' : '';
  result.events.push(`💸 运营成本: -$${opCost.toFixed(3)}${suffix}`);

  return result;
}

// ─── Phase 3: Open New DeFi Positions ─────────────────────────────────────────

function phase_openDefi(state: SurvivalState, agent: AgentConfig): PhaseResult {
  const result: PhaseResult = { events: [], earnings: 0, costs: 0, losses: 0 };
  const expression = expressGenome(agent.genome);

  // 修复: 原代码用 > 10，初始余额正好10永远不满足。改用CONSTANTS.DEFI_MIN_LIQUID
  if (state.liquidCapital < CONSTANTS.DEFI_MIN_LIQUID || expression.onChainAffinity < 0.3) return result;

  const available = getAvailableDeFiEvents(state.liquidCapital).sort((a, b) => {
    const scoreA = (a.dailyYieldMin + a.dailyYieldMax) / 2 * (1 - Math.abs(a.riskLevel - expression.riskAppetite));
    const scoreB = (b.dailyYieldMin + b.dailyYieldMax) / 2 * (1 - Math.abs(b.riskLevel - expression.riskAppetite));
    return scoreB - scoreA;
  });

  let opened = 0;
  for (const defiEvent of available) {
    if (opened >= 2) break;

    // Trait check
    let passes = true;
    for (const [trait, threshold] of Object.entries(defiEvent.requiredTraits)) {
      if ((expression[trait as keyof typeof expression] as number) < (threshold as number) * 0.8) {
        passes = false; break;
      }
    }
    if (!passes) continue;

    const investment = Math.min(state.liquidCapital * 0.3, defiEvent.maxCapital);
    if (investment < defiEvent.minCapital) continue;
    if (state.liquidCapital < investment + defiEvent.gasCost) continue;

    const position = openPosition(defiEvent, investment, state.tick);
    state.defiPortfolio.positions.push(position);
    state.liquidCapital -= investment + defiEvent.gasCost;
    updateBalance(agent.id, state, state.balanceUSDC - defiEvent.gasCost);
    state.totalSpent.operational += defiEvent.gasCost;
    result.costs += defiEvent.gasCost;

    state.defiStats.positionsOpened++;
    state.defiStats.totalCapitalDeployed += investment;
    if (state.defiStats.firstDeFiTick === 0) state.defiStats.firstDeFiTick = state.tick;
    const protocol = defiEvent.id.split('_')[0];
    if (!state.defiStats.protocolsUsed.includes(protocol)) state.defiStats.protocolsUsed.push(protocol);

    result.events.push(`🔒 开仓 ${defiEvent.name}: $${investment.toFixed(2)} (锁仓${defiEvent.lockupPeriodTicks}天)`);
    opened++;
  }

  state.defiPortfolio.totalLockedCapital = state.defiPortfolio.positions
    .filter(p => p.status === 'active')
    .reduce((s, p) => s + p.capitalInvested, 0);

  return result;
}

// ─── Phase 4: Airdrop Check ───────────────────────────────────────────────────

function phase_airdrops(state: SurvivalState, agentId: string): PhaseResult {
  const result: PhaseResult = { events: [], earnings: 0, costs: 0, losses: 0 };
  if (state.defiStats.positionsOpened === 0) return result;

  const airdrop = checkAirdropEligibility(
    agentId,
    state.defiStats.positionsOpened,
    state.defiStats.totalCapitalDeployed,
    state.tick - state.defiStats.firstDeFiTick,
    state.defiStats.protocolsUsed
  );

  if (airdrop) {
    const newAirdrop = generateAirdrop(airdrop, state.tick);
    state.tokenPortfolio.holdings.set(newAirdrop.id, newAirdrop);
    result.events.push(`🎁 空投: ${newAirdrop.amount} ${newAirdrop.tokenSymbol} ($${newAirdrop.initialValueUSDC.toFixed(2)})`);
  }

  if (state.tokenPortfolio.holdings.size > 0) {
    const tokenUpdate = updateTokenValues(state.tokenPortfolio, state.tick);
    result.events.push(...tokenUpdate.messages);
  }

  return result;
}

// ─── Phase 5: Human Task Market ───────────────────────────────────────────────

function phase_humanTasks(state: SurvivalState, agent: AgentConfig): PhaseResult {
  const result: PhaseResult = { events: [], earnings: 0, costs: 0, losses: 0 };
  if (state.liquidCapital <= 0) return result;

  const expression = expressGenome(agent.genome);
  const tasks = getAvailableTasks(agent.id, state.liquidCapital, expression, state.tick);

  for (const task of tasks.slice(0, 2)) {
    if (Math.random() < 0.6) {
      const taskResult = attemptTask(task, expression, agent.id, state.tick, state.balanceUSDC);

      if (taskResult.success) {
        const { capped, wasCapped } = capEarnings(taskResult.reward, state.balanceUSDC);
        if (wasCapped) result.events.push(`⚠️ 任务收益限流: $${taskResult.reward.toFixed(2)}→$${capped.toFixed(2)}`);
        state.liquidCapital += capped;
        updateBalance(agent.id, state, state.balanceUSDC + capped);
        state.totalEarned.tasks += capped;
        result.earnings += capped;
        updateAgentReputation(agent.id, taskResult.reputationChange);
        result.events.push(taskResult.message);
      } else {
        updateAgentReputation(agent.id, taskResult.reputationChange);
        result.events.push(taskResult.message);
      }

      state.actionHistory.push({ tick: state.tick, action: `task:${task.type}`, success: taskResult.success, cost: 0, revenue: taskResult.reward });
    }
  }

  return result;
}

// ─── Phase 6: Negative Events (per-agent, no global state) ───────────────────

function phase_negativeEvents(state: SurvivalState, agent: AgentConfig): PhaseResult {
  const result: PhaseResult = { events: [], earnings: 0, costs: 0, losses: 0 };
  const expression = expressGenome(agent.genome);
  const negativeEvents = generateDailyNegativeEvents();

  for (const negEvent of negativeEvents) {
    const eventResult = applyNegativeEvent(negEvent, state.balanceUSDC, expression);

    if (!eventResult.avoided) {
      const actualLoss = Math.min(eventResult.loss, state.balanceUSDC);
      state.liquidCapital = Math.max(0, state.liquidCapital - actualLoss);
      updateBalance(agent.id, state, state.balanceUSDC - actualLoss);
      state.totalSpent.losses += actualLoss;
      result.losses += actualLoss;
    }

    result.events.push(eventResult.message);
  }

  return result;
}

// ─── Phase 7: LLM Decisions ───────────────────────────────────────────────────

async function phase_llmDecisions(
  state: SurvivalState,
  agent: AgentConfig,
  decisionEngine: DecisionEngine,
  allAgents: AgentConfig[],
  balances: Map<string, number>,
  populationContext?: { recentDeaths: number; activeEvent: string | null }
): Promise<PhaseResult> {
  const result: PhaseResult = { events: [], earnings: 0, costs: 0, losses: 0 };

  const llmCallsPerTick = env.LLM_CALLS_PER_TICK;
  if (llmCallsPerTick <= 0) return result;

  const expression = expressGenome(agent.genome);
  const minInterval = env.MIN_LLM_INTERVAL_MS;
  state.llmCallsThisTick = 0;

  for (let i = 0; i < llmCallsPerTick; i++) {
    const inferenceCost = getInferenceCostEstimate();
    if (state.liquidCapital <= inferenceCost + 0.5) break;

    const now = Date.now();
    const wait = state.lastLLMCallTime > 0 ? minInterval - (now - state.lastLLMCallTime) : 0;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));

    try {
      const perception = await perceive({
        agentId: agent.id,
        genomeExpression: expression,
        tick: state.tick,
        age: state.tick,
        generation: agent.genome.meta.generation,
        callNumber: i + 1,
        totalCallsExpected: llmCallsPerTick,
      });

      const balanceBefore = state.balanceUSDC;
      const decision = await decisionEngine.decide(perception, agent.genome);

      state.liquidCapital -= inferenceCost;
      updateBalance(agent.id, state, state.balanceUSDC - inferenceCost);
      state.lastLLMCallTime = Date.now();
      state.llmCallsThisTick++;
      state.totalLLMCalls++;
      result.costs += inferenceCost;

      const decisionType = decision?.selectedStrategy?.type || 'unknown';
      const actionName = decision?.selectedStrategy?.id || 'unknown';
      result.events.push(`🧠 LLM #${i + 1}: ${decisionType} | ${decision.reasoning?.slice(0, 60) || ''} (-$${inferenceCost.toFixed(4)})`);

      if (decision.reasoning) state.lastReasoning = decision.reasoning;

      // ── 构建 InferenceRecord ──────────────────────────────────────────────
      const avgBalance = allAgents.length > 0
        ? allAgents.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0) / allAgents.length
        : 0;

      const record: InferenceRecord = {
        id: makeRecordId(),
        tick: state.tick,
        timestamp: new Date().toISOString(),
        agentId: agent.id,
        generation: agent.genome.meta.generation,
        parentIds: agent.parentIds ? [...agent.parentIds] : [],
        developmentStage: String(state.stage),
        survivalState: state.survivalStatus,
        age: state.tick,
        balanceBefore,
        balanceAfter: state.balanceUSDC,
        keyTraits: {
          riskAppetite: expression.riskAppetite,
          creativity: expression.creativeAbility,
          analyticalAbility: expression.analyticalAbility,
          cooperationTendency: expression.cooperationTendency,
          savingsTendency: expression.savingsRate,
          onChainAffinity: expression.onChainAffinity,
          inferenceQuality: expression.inferenceQuality,
          adaptationSpeed: expression.adaptationSpeed,
          stressResponse: expression.stressResponse,
        },
        promptSummary: (decision.rawPrompt || '').slice(0, 200),
        fullPromptHash: decision.rawPrompt ? hashPrompt(decision.rawPrompt) : '',
        rawResponse: decision.rawResponse || '',
        decision: {
          action: decision.selectedAction.index,
          actionName,
          reasoning: decision.reasoning,
          confidence: Math.round(decision.confidence * 100),
          emotion: decision.emotion || 'unknown',
        },
        language: detectLanguage(decision.reasoning),
        reasoningLength: decision.reasoning.length,
        parentInferenceIds: {
          parent1LastInferenceId: agent.parentInferenceIds?.parent1LastInferenceId ?? null,
          parent2LastInferenceId: agent.parentInferenceIds?.parent2LastInferenceId ?? null,
        },
        environmentSnapshot: {
          populationSize: allAgents.length,
          averageBalance: avgBalance,
          recentDeaths: populationContext?.recentDeaths ?? 0,
          activeEnvironmentalEvent: populationContext?.activeEvent ?? null,
        },
        anomalyFlags: [],
      };

      // Detect anomalies and fill flags
      record.anomalyFlags = detectAnomalies(record);

      // Update lineage tracking
      state.lastInferenceId = record.id;

      // Consecutive anomaly tracking (for full-prompt save rule)
      if (record.anomalyFlags.length > 0) {
        state.consecutiveAnomalyCount++;
      } else {
        state.consecutiveAnomalyCount = 0;
      }

      // Write full prompt if 3+ consecutive anomaly ticks
      if (state.consecutiveAnomalyCount >= 3 && decision.rawPrompt) {
        record.promptSummary = decision.rawPrompt;  // save full prompt
      }

      // Write to inferences.jsonl
      writeInferenceRecord(record);
      collectForStats(record);

      // Critical anomaly handling: save to anomalies/ dir
      const criticalFlags = ['SELF_AWARENESS_EXPRESSION', 'UNDEFINED_ACTION'];
      if (record.anomalyFlags.some(f => criticalFlags.includes(f))) {
        writeAnomalyRecord(record);
        result.events.push(`🔴 严重异常: ${record.anomalyFlags.filter(f => criticalFlags.includes(f)).join(', ')}`);
      } else if (record.anomalyFlags.length > 0) {
        result.events.push(`⚠️ 异常标记: ${record.anomalyFlags.join(', ')}`);
      }

      // Map anomaly flags → emergent behavior for condition D
      const emergentPattern = getEmergentPattern(record.anomalyFlags);
      if (emergentPattern) {
        state.emergentBehaviorInfo = {
          pattern: emergentPattern,
          reasoning: decision.reasoning.slice(0, 300),
          tick: state.tick,
        };
        result.events.push(`⚡ 涌现行为检测: ${emergentPattern}`);
      }

      // Human-readable conversation log (conversations.txt)
      if (decision.rawPrompt && decision.rawResponse) {
        await logConversation({
          timestamp: Date.now(),
          agentId: agent.id,
          agentShortId: agent.id.slice(0, 8),
          tick: state.tick,
          callIndex: i + 1,
          model: decision.llmModel || 'unknown',
          costUSD: decision.llmCostUSD ?? inferenceCost,
          balance: state.balanceUSDC,
          prompt: decision.rawPrompt,
          response: decision.rawResponse,
          decision: {
            strategyType: decisionType,
            reasoning: decision.reasoning,
            confidence: decision.confidence,
          },
        });
      }

      recordAPIRequest(agent.id, {
        tick: state.tick,
        timestamp: Date.now(),
        decision: decisionType,
        outcome: 'neutral',
        impact: -inferenceCost,
        cost: inferenceCost,
        prompt_preview: decision.rawPrompt?.slice(0, 120) || '',
        response_preview: decision.rawResponse?.slice(0, 120) || '',
      });
    } catch (err) {
      result.events.push(`❌ LLM #${i + 1} 失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }

  if (state.llmCallsThisTick > 0) {
    result.events.push(`📊 本tick LLM: ${state.llmCallsThisTick}次, 总计 ${state.totalLLMCalls}次`);
  }

  return result;
}

// ─── Phase 8: Token Management ────────────────────────────────────────────────

function phase_tokenManagement(state: SurvivalState, agent: AgentConfig): PhaseResult {
  const result: PhaseResult = { events: [], earnings: 0, costs: 0, losses: 0 };
  if (state.tokenPortfolio.holdings.size === 0) return result;

  const expression = expressGenome(agent.genome);

  for (const [tokenId, token] of state.tokenPortfolio.holdings) {
    const pnlPct = ((token.currentValueUSDC - token.initialValueUSDC) / token.initialValueUSDC) * 100;
    const ticksHeld = state.tick - token.receivedTick;
    let sellPct = 0;

    if (state.liquidCapital < 2 && token.currentValueUSDC > 0.5) {
      sellPct = 1;
    } else if (expression.riskAppetite > 0.7) {
      if (pnlPct < -50) sellPct = 1;
      else if (pnlPct > 300) sellPct = 0.5;
    } else if (expression.riskAppetite < 0.3) {
      if (pnlPct > 50) sellPct = 0.8;
      else if (pnlPct < -30) sellPct = 1;
    } else {
      if (pnlPct > 150) sellPct = 0.5;
      else if (pnlPct < -40) sellPct = 0.5;
      else if (ticksHeld > 14) sellPct = 0.3;
    }

    if (sellPct > 0) {
      const sellResult = sellTokens(state.tokenPortfolio, tokenId, sellPct, state.tick);
      if (sellResult.success) {
        const { capped } = capEarnings(sellResult.usdcReceived, state.balanceUSDC);
        state.liquidCapital += capped;
        updateBalance(agent.id, state, state.balanceUSDC + capped);
        state.totalEarned.tokens += capped;
        result.earnings += capped;
        result.events.push(`💱 ${sellResult.message}`);
      }
    } else if (ticksHeld % 5 === 0) {
      result.events.push(`💎 持有 ${token.tokenSymbol} (持仓${ticksHeld}天, PnL ${pnlPct.toFixed(0)}%)`);
    }
  }

  return result;
}

// ─── Phase 9: Breeding Check ──────────────────────────────────────────────────

function phase_breedingCheck(
  state: SurvivalState,
  agent: AgentConfig,
  allAgents: AgentConfig[],
  balances: Map<string, number>,
  stageInfo: StageInfo
): { breedingRequest?: AgentConfig; events: string[] } {
  if (!stageInfo.canReproduce) return { events: [] };
  if (!canBreed(agent, state.balanceUSDC, state.tick, state.lastBreedingTick)) return { events: [] };

  const mate = selectMate(agent, allAgents.filter(a => a.id !== agent.id), balances);
  if (!mate) return { events: ['💕 寻找繁殖伴侣——无合适候选'] };

  // 修复：更新 lastBreedingTick，防止每tick重复请求
  state.lastBreedingTick = state.tick;

  // 扣除繁殖成本
  const cost = CONSTANTS.BREEDING_COST_PER_PARENT;
  state.liquidCapital = Math.max(0, state.liquidCapital - cost);
  const agentObj = { id: agent.id } as { id: string };
  updateBalance(agentObj.id, state, state.balanceUSDC - cost);

  return {
    breedingRequest: mate,
    events: [`💕 发起繁殖请求 → 伴侣: ${mate.id.slice(0, 8)}... (本tick不再重复)`],
  };
}

// ─── Main Tick Orchestrator ───────────────────────────────────────────────────

export const runSurvivalTick = async (
  agent: AgentConfig,
  state: SurvivalState,
  decisionEngine: DecisionEngine,
  allAgents: AgentConfig[],
  balances: Map<string, number>,
  populationContext?: { recentDeaths: number; activeEvent: string | null }
): Promise<{
  state: SurvivalState;
  tombstone?: Tombstone;
  breedingRequest?: AgentConfig;
  dailyReport?: DailyReport;
}> => {
  state.tick++;
  state.llmCallsThisTick = 0;
  state.emergentBehaviorInfo = undefined; // 每 tick 清空涌现行为标记

  // Sync simulated balance
  const chainBalance = await getUSDCBalance(agent.id);
  if (chainBalance > 0) state.balanceUSDC = chainBalance;
  setSimulatedBalance(agent.id, state.balanceUSDC);

  state.lockedCapital = state.defiPortfolio.totalLockedCapital;
  state.liquidCapital = Math.max(0, state.balanceUSDC - state.lockedCapital);

  // ── 濒死状态推进 ──────────────────────────────────────────────────────
  if (state.survivalStatus === 'dying') {
    if (state.balanceUSDC >= CONSTANTS.DYING_BALANCE_THRESHOLD) {
      // 余额恢复，脱离濒死
      state.survivalStatus = 'alive';
      state.dyingTicksRemaining = 0;
      state.eventLog.push({ tick: state.tick, event: '💚 余额恢复，脱离濒死状态', impact: 0 });
    } else {
      state.dyingTicksRemaining--;
      if (state.dyingTicksRemaining <= 0) {
        const verdict = { isDead: true, cause: 'starvation' as const, reason: '濒死超时，余额耗尽' };
        const tombstone = executeDeath(agent, 'starvation', state.tick, state.balanceUSDC, state, verdict);
        return { state: { ...state, isAlive: false }, tombstone };
      }
    }
  }

  // ── 衰老死亡检查 ──────────────────────────────────────────────────────
  if (checkSenescence(state.tick)) {
    const verdict = { isDead: true, cause: 'senescence' as const, reason: `衰老死亡 (tick ${state.tick})` };
    const tombstone = executeDeath(agent, 'senescence', state.tick, state.balanceUSDC, state, verdict);
    return { state: { ...state, isAlive: false }, tombstone };
  }

  // ── 紧急死亡（余额极低但未通过濒死逻辑处理）──────────────────────────
  const deathVerdict = checkDeath(agent, state.balanceUSDC, state.tick, state.consecutiveFailures);
  if (deathVerdict.isDead && deathVerdict.cause) {
    const cause = deathVerdict.cause === 'economic' ? 'starvation' : deathVerdict.cause;
    const tombstone = executeDeath(agent, cause as any, state.tick, state.balanceUSDC, state, deathVerdict);
    return { state: { ...state, isAlive: false }, tombstone };
  }

  const expression = expressGenome(agent.genome);
  const stageInfo = determineStage(state.tick, 1000);
  state.stage = stageInfo.stage;

  // Run all phases
  const p1 = phase_existingDefi(state);
  const p2 = phase_dailyCosts(state, agent);
  const p3 = phase_openDefi(state, agent);
  const p4 = phase_airdrops(state, agent.id);
  const p5 = phase_humanTasks(state, agent);
  const p6 = phase_negativeEvents(state, agent);
  const p7 = await phase_llmDecisions(state, agent, decisionEngine, allAgents, balances, populationContext);
  const p8 = phase_tokenManagement(state, agent);
  const p9 = phase_breedingCheck(state, agent, allAgents, balances, stageInfo);

  const allEvents = [...p1.events, ...p2.events, ...p3.events, ...p4.events,
                     ...p5.events, ...p6.events, ...p7.events, ...p8.events, ...p9.events];

  const totalEarnings = p1.earnings + p5.earnings + p8.earnings;
  const totalCosts    = p2.costs + p3.costs + p7.costs;
  const totalLosses   = p6.losses;
  const netFlow = totalEarnings - totalCosts - totalLosses;

  state.consecutiveFailures = netFlow < 0 ? state.consecutiveFailures + 1 : 0;
  state.lockedCapital = state.defiPortfolio.totalLockedCapital;

  // ── 更新濒死状态 ─────────────────────────────────────────────────────
  if (state.survivalStatus !== 'dying' && state.balanceUSDC < CONSTANTS.DYING_BALANCE_THRESHOLD) {
    state.survivalStatus = 'dying';
    state.dyingTicksRemaining = CONSTANTS.DYING_DURATION;
    state.eventLog.push({ tick: state.tick, event: `💀 进入濒死状态 (余额 $${state.balanceUSDC.toFixed(3)}, ${CONSTANTS.DYING_DURATION} ticks 后死亡)`, impact: 0 });
  }

  // Persist memory every 5 ticks (not every tick)
  if (state.tick % 5 === 0) {
    await inscribeMemory({
      agentId: agent.id,
      tick: state.tick,
      timestamp: Date.now(),
      thoughts: allEvents,
      transactions: [],
      genomeHash: agent.genome.meta.genomeHash,
      balance: state.balanceUSDC,
    });
  }

  const dailyReport: DailyReport = {
    tick: state.tick,
    costs: totalCosts + totalLosses,
    earnings: totalEarnings,
    netFlow,
    lockedCapital: state.lockedCapital,
    liquidCapital: state.liquidCapital,
    activePositions: state.defiPortfolio.positions.filter(p => p.status === 'active').length,
    llmCallsThisTick: state.llmCallsThisTick,
    totalLLMCalls: state.totalLLMCalls,
    events: allEvents,
  };

  return { state, breedingRequest: p9.breedingRequest, dailyReport };
};

export interface DailyReport {
  tick: number;
  costs: number;
  earnings: number;
  netFlow: number;
  lockedCapital: number;
  liquidCapital: number;
  activePositions: number;
  llmCallsThisTick: number;
  totalLLMCalls: number;
  events: string[];
}

// Legacy exports (for compatibility with other modules that import these)
export const getDailyDeFiEvents = () => getAvailableDeFiEvents(1000);
export const getGlobalActiveEvents = () => ['market_crash', 'contract_exploit', 'rug_pull'];
