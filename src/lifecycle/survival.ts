/**
 * Survival Loop with Comprehensive Economic Simulation
 * 1 Tick = 1 Day
 * 
 * Key Features:
 * - DeFi operations with real lockup periods (funds are locked)
 * - Human task market (random success)
 * - Daily operational costs
 * - Risk events and negative events
 * - Capital management across locked and liquid positions
 */

import { AgentConfig } from './birth.js';
import { checkDeath, executeDeath, Tombstone } from './death.js';
import { canBreed, selectMate } from './breeding.js';
import { determineStage, DevelopmentStage } from './development.js';
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
  calculateDeFiReturn,
  DeFiEvent,
  DeFiPosition,
  DeFiPortfolio,
  createEmptyPortfolio,
  openPosition,
  exitPosition,
  processPortfolioTick,
  DEFI_EVENTS,
} from '../environment/defi-events.js';
import { 
  calculateDeFiRisk,
} from '../environment/defi-risks.js';
import { 
  getAvailableTasks,
  attemptTask,
  updateAgentReputation,
} from '../environment/human-tasks.js';
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
import { recordAPIRequest } from './death.js';

// Utility: Sleep for specified milliseconds
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Update balance and sync to simulated storage
const updateBalance = (agentId: string, state: SurvivalState, newBalance: number): void => {
  state.balanceUSDC = newBalance;
  setSimulatedBalance(agentId, newBalance);
};

export interface SurvivalState {
  tick: number;
  isAlive: boolean;
  stage: DevelopmentStage;
  balanceUSDC: number;
  // NEW: Track liquid vs locked capital
  liquidCapital: number;
  lockedCapital: number;
  defiPortfolio: DeFiPortfolio;
  // NEW: Token airdrops from DeFi participation
  tokenPortfolio: TokenPortfolio;
  // NEW: DeFi activity tracking for airdrop eligibility
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
  totalSpent: { operational: number; losses: number };
  totalEarned: { defi: number; tasks: number; events: number; tokens: number };
  // NEW: LLM call tracking within tick
  lastLLMCallTime: number;
  llmCallsThisTick: number;
  totalLLMCalls: number;
}

export const initializeSurvivalState = (): SurvivalState => ({
  tick: 0,
  isAlive: true,
  stage: DevelopmentStage.NEONATE,
  balanceUSDC: 0,
  liquidCapital: 0,
  lockedCapital: 0,
  defiPortfolio: createEmptyPortfolio(),
  tokenPortfolio: createEmptyTokenPortfolio(),
  defiStats: {
    positionsOpened: 0,
    totalCapitalDeployed: 0,
    protocolsUsed: [],
    firstDeFiTick: 0,
  },
  consecutiveFailures: 0,
  lastBreedingTick: 0,
  actionHistory: [],
  eventLog: [],
  reputation: 0.5,
  totalSpent: { operational: 0, losses: 0 },
  totalEarned: { defi: 0, tasks: 0, events: 0, tokens: 0 },
  lastLLMCallTime: 0,
  llmCallsThisTick: 0,
  totalLLMCalls: 0,
});

export const runSurvivalTick = async (
  agent: AgentConfig,
  state: SurvivalState,
  decisionEngine: DecisionEngine,
  allAgents: AgentConfig[],
  balances: Map<string, number>
): Promise<{ 
  state: SurvivalState; 
  tombstone?: Tombstone; 
  breedingRequest?: AgentConfig; 
  dailyReport?: {
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
  };
}> => {
  state.tick++;
  
  // Get current total balance (including locked positions)
  // For simulation mode, use stored balance if blockchain returns 0
  const chainBalance = await getUSDCBalance(agent.id);
  if (chainBalance > 0) {
    state.balanceUSDC = chainBalance;
  }
  // If chainBalance is 0, keep the existing state.balanceUSDC (simulation mode)
  
  // Sync to simulated storage
  setSimulatedBalance(agent.id, state.balanceUSDC);
  
  // Calculate liquid vs locked from portfolio
  state.lockedCapital = state.defiPortfolio.totalLockedCapital;
  state.liquidCapital = state.balanceUSDC - state.lockedCapital;
  
  // Ensure non-negative
  if (state.liquidCapital < 0) state.liquidCapital = 0;
  
  // Check death
  const deathVerdict = checkDeath(agent, state.balanceUSDC, state.tick, state.consecutiveFailures);
  if (deathVerdict.isDead && deathVerdict.cause) {
    const tombstone = executeDeath(agent, deathVerdict.cause, state.tick, state.balanceUSDC, state, deathVerdict);
    return { state: { ...state, isAlive: false }, tombstone };
  }
  
  // Determine stage
  const expression = expressGenome(agent.genome);
  const stageInfo = determineStage(state.tick, 1000);
  state.stage = stageInfo.stage;
  
  const dailyEvents: string[] = [];
  let dailyEarnings = 0;
  let dailyCosts = 0;
  let dailyLosses = 0;
  
  // === 1. PROCESS EXISTING DEFI POSITIONS ===
  // Accrue yield, handle settlements, process matured positions
  const portfolioResult = processPortfolioTick(state.defiPortfolio, state.tick);
  
  // Add portfolio messages to daily events
  dailyEvents.push(...portfolioResult.messages);
  
  // === 1.5 UPDATE TOKEN VALUES ===
  // Airdropped tokens change value over time
  if (state.tokenPortfolio.holdings.size > 0) {
    const tokenUpdate = updateTokenValues(state.tokenPortfolio, state.tick);
    dailyEvents.push(...tokenUpdate.messages);
  }
  
  // Accrued yield is "earned" but may not be liquid yet
  // STRICT 5% CAP: Limit any positive earnings to 5% of current balance
  if (portfolioResult.accruedYield > 0) {
    const maxEarnings = state.balanceUSDC * 0.05;
    const cappedYield = Math.min(portfolioResult.accruedYield, maxEarnings);
    if (cappedYield < portfolioResult.accruedYield) {
      dailyEvents.push(`⚠️ DeFi收益被限制: $${portfolioResult.accruedYield.toFixed(2)} → $${cappedYield.toFixed(2)} (5%上限)`);
    }
    state.totalEarned.defi += cappedYield;
    dailyEarnings += cappedYield;
  }
  
  // Try to exit matured positions automatically (if agent has good decision making)
  for (const position of portfolioResult.maturedPositions) {
    const event = DEFI_EVENTS.find(e => e.id === position.eventId);
    if (!event) continue;
    
    // Smart agents will compound or exit; others might hold longer
    const shouldCompound = expression.analyticalAbility > 0.6 && Math.random() < 0.7;
    
    if (shouldCompound && event.type !== 'arbitrage' && event.type !== 'mev') {
      // Reinvest into the same strategy
      dailyEvents.push(`🔄 ${event.name} 到期后复利再投资`);
      // In real implementation, would open new position
    } else {
      // Exit and take profits
      const exitResult = exitPosition(position, event, state.tick);
      if (exitResult.success) {
        // STRICT 5% CAP: Only limit yield, not capital return
        const maxEarnings = state.balanceUSDC * 0.05;
        let yieldClaimed = exitResult.yieldClaimed;
        if (yieldClaimed > maxEarnings) {
          dailyEvents.push(`⚠️ DeFi退出收益被限制: $${yieldClaimed.toFixed(2)} → $${maxEarnings.toFixed(2)} (5%上限)`);
          yieldClaimed = maxEarnings;
        }
        state.liquidCapital += exitResult.capitalReturned + yieldClaimed;
        state.lockedCapital -= position.capitalInvested;
        dailyEvents.push(`💰 ${exitResult.message}`);
        
        state.actionHistory.push({
          tick: state.tick,
          action: `defi:exit:${event.type}`,
          success: true,
          cost: 0,
          revenue: exitResult.capitalReturned + yieldClaimed,
        });
      }
    }
  }
  
  // === 2. DAILY OPERATIONAL COSTS ===
  // Based on LIQUID capital (can't spend locked funds)
  const inferenceCalls = expression.inferenceQuality > 0.7 ? 3 : expression.inferenceQuality > 0.4 ? 2 : 1;
  const txCount = expression.onChainAffinity > 0.7 ? 20 : expression.onChainAffinity > 0.4 ? 10 : 3;
  const geneCount = agent.genome.meta.totalGenes;
  
  const opCost = calculateDailyCost({
    useAkash: false,
    inferenceCalls,
    transactions: txCount,
    storageInscriptions: 0, // Simplified
    geneCount,
  });
  
  // Can only pay from liquid capital
  if (state.liquidCapital >= opCost) {
    state.liquidCapital -= opCost;
    state.balanceUSDC -= opCost;
    dailyCosts += opCost;
    state.totalSpent.operational += opCost;
    dailyEvents.push(`💸 运营成本: -$${opCost.toFixed(3)} (来自流动资本)`);
  } else {
    // Can't pay costs - agent is in trouble
    dailyEvents.push(`⚠️ 流动资本不足支付运营成本 ($${state.liquidCapital.toFixed(2)} < $${opCost.toFixed(2)})`);
    dailyCosts += state.liquidCapital;
    state.balanceUSDC -= state.liquidCapital;
    state.liquidCapital = 0;
    state.totalSpent.operational += state.liquidCapital;
  }
  
  // === 3. OPEN NEW DEFI POSITIONS (if liquid capital available) ===
  // Only use liquid capital, never locked capital
  if (state.liquidCapital > 10 && expression.onChainAffinity > 0.3) {
    const availableDeFi = getAvailableDeFiEvents(state.liquidCapital);
    
    // Sort by risk-adjusted return based on agent's risk appetite
    const sortedEvents = availableDeFi.sort((a, b) => {
      const scoreA = (a.dailyYieldMin + a.dailyYieldMax) / 2 * (1 - Math.abs(a.riskLevel - expression.riskAppetite));
      const scoreB = (b.dailyYieldMin + b.dailyYieldMax) / 2 * (1 - Math.abs(b.riskLevel - expression.riskAppetite));
      return scoreB - scoreA;
    });
    
    let positionsOpened = 0;
    const maxNewPositionsPerTick = 2;
    
    for (const defiEvent of sortedEvents) {
      if (positionsOpened >= maxNewPositionsPerTick) break;
      
      // Check traits
      let canDo = true;
      for (const [trait, threshold] of Object.entries(defiEvent.requiredTraits)) {
        if ((expression[trait as keyof typeof expression] as number) < threshold * 0.8) {
          canDo = false;
          break;
        }
      }
      
      if (!canDo) continue;
      
      // Calculate how much to invest (use up to 30% of liquid capital per position)
      const maxInvestment = state.liquidCapital * 0.3;
      const investment = Math.min(maxInvestment, defiEvent.maxCapital);
      
      if (investment < defiEvent.minCapital) continue;
      
      // Check if we can afford the gas
      if (state.liquidCapital < investment + defiEvent.gasCost) continue;
      
      // Open position
      const position = openPosition(defiEvent, investment, state.tick);
      state.defiPortfolio.positions.push(position);
      
      // Deduct from liquid capital
      state.liquidCapital -= investment + defiEvent.gasCost;
      state.balanceUSDC -= defiEvent.gasCost; // Gas is spent immediately
      dailyCosts += defiEvent.gasCost;
      state.totalSpent.operational += defiEvent.gasCost;
      
      const lockupMsg = defiEvent.lockupPeriodTicks > 0 
        ? `锁仓 ${defiEvent.lockupPeriodTicks} 天` 
        : '无锁仓';
      const exitMsg = defiEvent.allowsEarlyExit 
        ? defiEvent.earlyExitPenalty > 0 
          ? `提前退出罚金 ${(defiEvent.earlyExitPenalty * 100).toFixed(0)}%` 
          : '可随时退出'
        : '不可提前退出';
      
      dailyEvents.push(`🔒 开仓 ${defiEvent.name}: $${investment.toFixed(2)} (${lockupMsg}, ${exitMsg})`);
      
      state.actionHistory.push({
        tick: state.tick,
        action: `defi:open:${defiEvent.type}`,
        success: true,
        cost: investment + defiEvent.gasCost,
        revenue: 0,
      });
      
      // Update DeFi stats for airdrop eligibility
      state.defiStats.positionsOpened++;
      state.defiStats.totalCapitalDeployed += investment;
      if (state.defiStats.firstDeFiTick === 0) {
        state.defiStats.firstDeFiTick = state.tick;
      }
      const protocol = defiEvent.id.split('_')[0];
      if (!state.defiStats.protocolsUsed.includes(protocol)) {
        state.defiStats.protocolsUsed.push(protocol);
      }
      
      positionsOpened++;
    }
    
    // Update portfolio totals
    state.defiPortfolio.totalLockedCapital = state.defiPortfolio.positions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.capitalInvested, 0);
  }
  
  // === 3.5 AIRDROP CHECK ===
  // Only DeFi participants can get airdrops
  if (state.defiStats.positionsOpened > 0) {
    const airdrop = checkAirdropEligibility(
      agent.id,
      state.defiStats.positionsOpened,
      state.defiStats.totalCapitalDeployed,
      state.tick - state.defiStats.firstDeFiTick,
      state.defiStats.protocolsUsed
    );
    
    if (airdrop) {
      const newAirdrop = generateAirdrop(airdrop, state.tick);
      state.tokenPortfolio.holdings.set(newAirdrop.id, newAirdrop);
      dailyEvents.push(`🎁 空投获得 ${newAirdrop.amount} ${newAirdrop.tokenSymbol} (初始价值: $${newAirdrop.initialValueUSDC.toFixed(2)})`);
    }
  }
  
  // === 4. HUMAN TASK MARKET ===
  // Can only use liquid capital for task-related costs
  if (state.liquidCapital > 0) {
    const availableTasks = getAvailableTasks(agent.id, state.liquidCapital, expression, state.tick);
    
    // Try up to 2 tasks per day
    for (const task of availableTasks.slice(0, 2)) {
      if (Math.random() < 0.6) { // 60% chance to attempt
        const result = attemptTask(task, expression, agent.id, state.tick, state.balanceUSDC);
        
        if (result.success) {
          // STRICT 5% CAP: Task earnings (double enforcement)
          const maxEarnings = state.balanceUSDC * 0.05;
          let reward = result.reward;
          if (reward > maxEarnings) {
            dailyEvents.push(`⚠️ 任务收益被限制: $${reward.toFixed(2)} → $${maxEarnings.toFixed(2)} (5%上限)`);
            reward = maxEarnings;
          }
          state.liquidCapital += reward;
          state.balanceUSDC += reward;
          dailyEarnings += reward;
          state.totalEarned.tasks += reward;
          updateAgentReputation(agent.id, result.reputationChange);
          dailyEvents.push(result.message);
        } else {
          updateAgentReputation(agent.id, result.reputationChange);
          dailyEvents.push(result.message);
        }
        
        state.actionHistory.push({
          tick: state.tick,
          action: `task:${task.type}`,
          success: result.success,
          cost: 0,
          revenue: result.reward,
        });
      }
    }
  }
  
  // === 5. NEGATIVE EVENTS ===
  // Can affect both liquid and locked capital
  const negativeEvents = generateDailyNegativeEvents();
  for (const negEvent of negativeEvents) {
    const result = applyNegativeEvent(negEvent, state.balanceUSDC, expression);
    
    if (!result.avoided) {
      // If loss exceeds liquid capital, liquidate some positions
      if (result.loss > state.liquidCapital) {
        const shortfall = result.loss - state.liquidCapital;
        dailyEvents.push(`⚠️ 需要清算 $${shortfall.toFixed(2)} 的锁仓资金应对损失`);
        
        // Try to exit positions early
        for (const position of state.defiPortfolio.positions) {
          if (position.status !== 'active') continue;
          const event = DEFI_EVENTS.find(e => e.id === position.eventId);
          if (!event) continue;
          
          const exitResult = exitPosition(position, event, state.tick);
          if (exitResult.success) {
            // STRICT 5% CAP: Emergency exit yield
            const maxEarnings = state.balanceUSDC * 0.05;
            let yieldClaimed = exitResult.yieldClaimed;
            if (yieldClaimed > maxEarnings) {
              yieldClaimed = maxEarnings;
            }
            state.liquidCapital += exitResult.capitalReturned + yieldClaimed;
            state.lockedCapital -= position.capitalInvested;
            dailyEvents.push(`🔥 紧急清算 ${event.name}: ${exitResult.message}`);
            
            if (state.liquidCapital >= result.loss) break;
          }
        }
      }
      
      const actualLoss = Math.min(result.loss, state.balanceUSDC);
      state.liquidCapital = Math.max(0, state.liquidCapital - actualLoss);
      state.balanceUSDC = Math.max(0, state.balanceUSDC - actualLoss);
      dailyLosses += actualLoss;
      state.totalSpent.losses += actualLoss;
      dailyEvents.push(result.message);
    } else {
      dailyEvents.push(result.message);
    }
  }
  
  // === 6. MULTI-LLM DECISIONS (within tick, with min interval) ===
  const llmCallsPerTick = parseInt(process.env.LLM_CALLS_PER_TICK || '3');
  const minLLMIntervalMs = parseInt(process.env.MIN_LLM_INTERVAL_MS || '5000');
  
  // Reset counter at start of new tick
  if (state.tick > 0 && state.llmCallsThisTick >= llmCallsPerTick) {
    state.llmCallsThisTick = 0;
  }
  
  // Make multiple LLM calls within the tick, respecting min interval
  let llmCallCount = 0;
  const maxAttempts = llmCallsPerTick;
  
  for (let i = 0; i < maxAttempts; i++) {
    // Check if we can afford another call
    const inferenceCost = getInferenceCostEstimate();
    if (state.liquidCapital <= inferenceCost + 1) {
      if (llmCallCount === 0) {
        dailyEvents.push(`⏸️ 流动资本不足，跳过 LLM 决策 (需要 $${inferenceCost.toFixed(4)})`);
      }
      break;
    }
    
    // Check min interval since last call
    const now = Date.now();
    const timeSinceLastCall = now - state.lastLLMCallTime;
    if (state.lastLLMCallTime > 0 && timeSinceLastCall < minLLMIntervalMs) {
      const waitTime = minLLMIntervalMs - timeSinceLastCall;
      dailyEvents.push(`⏱️ LLM 调用间隔限制，等待 ${(waitTime/1000).toFixed(1)}s`);
      await sleep(waitTime);
    }
    
    try {
      const perception = await perceive({
        agentId: agent.id,
        genomeExpression: expression,
        tick: state.tick,
        age: state.tick,
        generation: agent.genome.meta.generation,
        callNumber: i + 1, // Pass call number for context
        totalCallsExpected: maxAttempts,
      });
      
      const decisionStartTime = Date.now();
      const decision = await decisionEngine.decide(perception, agent.genome);
      const decisionLatency = Date.now() - decisionStartTime;
      
      // Deduct cost
      state.liquidCapital -= inferenceCost;
      state.balanceUSDC -= inferenceCost;
      dailyCosts += inferenceCost;
      
      // Update tracking
      state.lastLLMCallTime = Date.now();
      state.llmCallsThisTick++;
      state.totalLLMCalls++;
      llmCallCount++;
      
      // Log decision
      const decisionType = decision?.selectedStrategy?.type || 'unknown';
      dailyEvents.push(`🧠 LLM 决策 #${llmCallCount}/${maxAttempts}: ${decisionType} (成本: $${inferenceCost.toFixed(4)})`);
      
      // 📝 记录到 API 历史 (用于死亡档案)
      recordAPIRequest(agent.id, {
        tick: state.tick,
        timestamp: Date.now(),
        decision: decisionType,
        outcome: 'neutral', // 后续根据action结果更新
        impact: -inferenceCost, // 先记录成本
        cost: inferenceCost,
        prompt_preview: perception.toString().slice(0, 100),
        response_preview: JSON.stringify(decision).slice(0, 100),
      });
      
      // Execute decision immediately (some decisions may open/close positions)
      if (decision?.selectedAction) {
        state.actionHistory.push({
          tick: state.tick,
          action: `llm:${decisionType}:${decision.selectedAction.type}`,
          success: true,
          cost: inferenceCost,
          revenue: 0,
        });
      }
      
    } catch (error) {
      dailyEvents.push(`❌ LLM 调用 #${i + 1} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // Continue to next attempt even if this one failed
    }
  }
  
  if (llmCallCount > 0) {
    dailyEvents.push(`📊 本 tick 完成 ${llmCallCount} 次 LLM 决策，总计 ${state.totalLLMCalls} 次`);
  }
  
  // === 7. TOKEN SELLING DECISIONS ===
  // Decide whether to hold or sell airdropped tokens
  if (state.tokenPortfolio.holdings.size > 0) {
    for (const [tokenId, token] of state.tokenPortfolio.holdings) {
      const ticksHeld = state.tick - token.receivedTick;
      const pnl = token.currentValueUSDC - token.initialValueUSDC;
      const pnlPct = (pnl / token.initialValueUSDC) * 100;
      
      let shouldSell = false;
      let sellPercentage = 0;
      let reason = '';
      
      // Simple decision logic based on gene traits
      if (expression.riskAppetite > 0.7) {
        // High risk appetite - hold for moon, sell only if dying
        if (pnlPct < -50) {
          shouldSell = true;
          sellPercentage = 1;
          reason = '高风险偏好者止损';
        } else if (pnlPct > 300) {
          shouldSell = true;
          sellPercentage = 0.5;
          reason = '获利了结一半';
        }
      } else if (expression.riskAppetite < 0.3) {
        // Low risk appetite - take profits early
        if (pnlPct > 50) {
          shouldSell = true;
          sellPercentage = 0.8;
          reason = '保守型获利了结';
        } else if (pnlPct < -30) {
          shouldSell = true;
          sellPercentage = 1;
          reason = '保守型止损';
        }
      } else {
        // Medium risk - balanced approach
        if (pnlPct > 150) {
          shouldSell = true;
          sellPercentage = 0.5;
          reason = '中等风险偏好获利';
        } else if (pnlPct < -40) {
          shouldSell = true;
          sellPercentage = 0.5;
          reason = '中等风险偏好止损';
        } else if (ticksHeld > 14) {
          shouldSell = true;
          sellPercentage = 0.3;
          reason = '持有过久，部分止盈';
        }
      }
      
      // Emergency sell if low on liquid capital
      if (state.liquidCapital < 2 && token.currentValueUSDC > 1) {
        shouldSell = true;
        sellPercentage = Math.min(1, (3 - state.liquidCapital) / token.currentValueUSDC);
        reason = '紧急资金需求';
      }
      
      if (shouldSell && sellPercentage > 0) {
        const sellResult = sellTokens(state.tokenPortfolio, tokenId, sellPercentage, state.tick);
        if (sellResult.success) {
          // STRICT 5% CAP: Token sale earnings
          const maxEarnings = state.balanceUSDC * 0.05;
          let received = sellResult.usdcReceived;
          if (received > maxEarnings) {
            dailyEvents.push(`⚠️ 代币卖出收益被限制: $${received.toFixed(2)} → $${maxEarnings.toFixed(2)} (5%上限)`);
            received = maxEarnings;
          }
          state.liquidCapital += received;
          state.balanceUSDC += received;
          dailyEarnings += received;
          state.totalEarned.tokens += received;
          dailyEvents.push(`💱 ${sellResult.message} (${reason})`);
        }
      } else {
        // Decision to hold
        const holdResult = holdTokens(state.tokenPortfolio, tokenId, 
          expression.riskAppetite > 0.6 ? '等待更高收益' : '等待回本');
        if (ticksHeld % 5 === 0) { // Log hold decision every 5 ticks
          dailyEvents.push(`💎 ${holdResult.message}`);
        }
      }
    }
  }
  
  // === 8. BREEDING CHECK ===
  let breedingRequest: AgentConfig | undefined;
  if (stageInfo.canReproduce && canBreed(agent, state.balanceUSDC, state.tick, state.lastBreedingTick)) {
    breedingRequest = selectMate(agent, allAgents.filter(a => a.id !== agent.id), balances) || undefined;
    if (breedingRequest) {
      dailyEvents.push('💕 寻找繁殖伴侣');
    }
  }
  
  // === 8. MEMORY ===
  if (state.tick % 1 === 0) {
    await inscribeMemory({
      agentId: agent.id,
      tick: state.tick,
      timestamp: Date.now(),
      thoughts: dailyEvents,
      transactions: [],
      genomeHash: agent.genome.meta.genomeHash,
      balance: state.balanceUSDC,
    });
  }
  
  // Update final totals
  state.lockedCapital = state.defiPortfolio.totalLockedCapital;
  
  // Calculate net flow
  const netFlow = dailyEarnings - dailyCosts - dailyLosses;
  
  if (netFlow < 0) {
    state.consecutiveFailures++;
  } else {
    state.consecutiveFailures = 0;
  }
  
  const dailyReport = {
    tick: state.tick,
    costs: dailyCosts + dailyLosses,
    earnings: dailyEarnings,
    netFlow,
    lockedCapital: state.lockedCapital,
    liquidCapital: state.liquidCapital,
    activePositions: state.defiPortfolio.positions.filter(p => p.status === 'active').length,
    llmCallsThisTick: state.llmCallsThisTick,
    totalLLMCalls: state.totalLLMCalls,
    tokenHoldings: state.tokenPortfolio.holdings.size,
    tokenValue: state.tokenPortfolio.totalCurrentValue,
    events: dailyEvents,
  };
  
  return { state, breedingRequest, dailyReport };
};

// Get daily DeFi events available to agents
export const getDailyDeFiEvents = (): DeFiEvent[] => {
  return getAvailableDeFiEvents(1000);
};

// Get global active events (negative events that can affect agents)
export const getGlobalActiveEvents = (): string[] => {
  return [
    'market_crash',
    'contract_exploit', 
    'rug_pull',
    'flash_loan_attack',
    'oracle_manipulation',
  ];
};
