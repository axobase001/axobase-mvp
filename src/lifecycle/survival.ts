/**
 * Survival Loop with Comprehensive Economic Simulation
 * 1 Tick = 1 Day
 * 
 * Income sources:
 * - DeFi operations (with real risks)
 * - Human task market (random success)
 * - Random opportunities
 * 
 * Costs:
 * - Daily operational costs
 * - Risk events
 * - Negative events
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
} from '../environment/defi-events.js';
import { 
  calculateDeFiRisk,
} from '../environment/defi-risks.js';
import { 
  getAvailableTasks,
  attemptTask,
  updateAgentReputation,
} from '../environment/human-tasks.js';
import { expressGenome } from '../genome/index.js';
import { getInferenceCostEstimate } from '../decision/inference.js';

export interface SurvivalState {
  tick: number;
  isAlive: boolean;
  stage: DevelopmentStage;
  balanceUSDC: number;
  consecutiveFailures: number;
  lastBreedingTick: number;
  actionHistory: Array<{ tick: number; action: string; success: boolean; cost: number; revenue: number }>;
  eventLog: Array<{ tick: number; event: string; impact: number }>;
  reputation: number;
  totalSpent: { operational: number; losses: number };
  totalEarned: { defi: number; tasks: number; events: number };
}

export const initializeSurvivalState = (): SurvivalState => ({
  tick: 0,
  isAlive: true,
  stage: DevelopmentStage.NEONATE,
  balanceUSDC: 0,
  consecutiveFailures: 0,
  lastBreedingTick: 0,
  actionHistory: [],
  eventLog: [],
  reputation: 0.5,
  totalSpent: { operational: 0, losses: 0 },
  totalEarned: { defi: 0, tasks: 0, events: 0 },
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
    events: string[];
  };
}> => {
  state.tick++;
  
  // Get current balance
  state.balanceUSDC = await getUSDCBalance(agent.id);
  
  // Check death
  const deathVerdict = checkDeath(agent, state.balanceUSDC, state.tick, state.consecutiveFailures);
  if (deathVerdict.isDead && deathVerdict.cause) {
    const tombstone = executeDeath(agent, deathVerdict.cause, state.tick, state.balanceUSDC);
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
  
  // === 1. DAILY OPERATIONAL COSTS ===
  const inferenceCalls = expression.inferenceQuality > 0.7 ? 3 : expression.inferenceQuality > 0.4 ? 2 : 1;
  const txCount = expression.onChainAffinity > 0.7 ? 20 : expression.onChainAffinity > 0.4 ? 10 : 3;
  const geneCount = agent.genome.meta.totalGenes;
  
  const opCost = calculateDailyCost({
    useAkash: false,
    inferenceCalls,
    transactions: txCount,
    storageInscriptions: expression.memoryUtilization > 0.3 ? 1 : 0,
    geneCount,
  });
  
  state.balanceUSDC -= opCost;
  dailyCosts += opCost;
  state.totalSpent.operational += opCost;
  dailyEvents.push(`💸 运营成本: -$${opCost.toFixed(3)}`);
  
  // === 2. DEFI OPERATIONS (with risks) ===
  if (state.balanceUSDC > 10 && expression.onChainAffinity > 0.3) {
    const availableDeFi = getAvailableDeFiEvents(state.balanceUSDC);
    
    for (const defiEvent of availableDeFi.slice(0, 2)) { // Max 2 DeFi ops per day
      // Check traits
      let canDo = true;
      for (const [trait, threshold] of Object.entries(defiEvent.requiredTraits)) {
        if ((expression[trait as keyof typeof expression] as number) < threshold * 0.8) {
          canDo = false;
          break;
        }
      }
      
      if (canDo) {
        // Invest up to 30% of balance
        const investment = Math.min(state.balanceUSDC * 0.3, defiEvent.maxCapital);
        
        // Calculate return
        const result = calculateDeFiReturn(defiEvent, investment, expression);
        
        // Apply risk
        const riskResult = calculateDeFiRisk(
          investment, 
          expression, 
          defiEvent.type as 'arbitrage' | 'lp' | 'lending' | 'trading'
        );
        
        let netReturn = result.netReturn;
        
        if (riskResult) {
          netReturn -= riskResult.loss;
          dailyLosses += riskResult.loss;
          dailyEvents.push(riskResult.message);
        }
        
        state.balanceUSDC += netReturn;
        dailyEarnings += netReturn;
        state.totalEarned.defi += netReturn;
        
        if (netReturn > 0) {
          dailyEvents.push(`📈 ${defiEvent.name}: +$${netReturn.toFixed(2)}`);
        } else if (netReturn < 0) {
          dailyEvents.push(`📉 ${defiEvent.name}: $${netReturn.toFixed(2)} (亏损)`);
        }
        
        state.actionHistory.push({
          tick: state.tick,
          action: `defi:${defiEvent.type}`,
          success: netReturn > 0,
          cost: investment + result.gasCost,
          revenue: netReturn + investment,
        });
      }
    }
  }
  
  // === 3. HUMAN TASK MARKET ===
  if (state.balanceUSDC > 0) {
    const availableTasks = getAvailableTasks(state.balanceUSDC, expression);
    
    // Try up to 2 tasks per day
    for (const task of availableTasks.slice(0, 2)) {
      if (Math.random() < 0.6) { // 60% chance to attempt
        const result = attemptTask(task, expression, agent.id);
        
        if (result.success) {
          state.balanceUSDC += result.reward;
          dailyEarnings += result.reward;
          state.totalEarned.tasks += result.reward;
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
  
  // === 4. NEGATIVE EVENTS ===
  const negativeEvents = generateDailyNegativeEvents();
  for (const negEvent of negativeEvents) {
    const result = applyNegativeEvent(negEvent, state.balanceUSDC, expression);
    
    if (!result.avoided) {
      state.balanceUSDC -= result.loss;
      dailyLosses += result.loss;
      state.totalSpent.losses += result.loss;
      dailyEvents.push(result.message);
    } else {
      dailyEvents.push(result.message);
    }
  }
  
  // === 5. LLM DECISION (if affordable) ===
  if (state.balanceUSDC > 5) {
    try {
      await decisionEngine.decide(await perceive({
        agentId: agent.id,
        genomeExpression: expression,
        tick: state.tick,
        age: state.tick,
        generation: agent.genome.meta.generation,
      }), agent.genome);
      
      state.balanceUSDC -= getInferenceCostEstimate();
      dailyCosts += getInferenceCostEstimate();
    } catch {
      // Ignore decision errors
    }
  }
  
  // === 6. BREEDING CHECK ===
  let breedingRequest: AgentConfig | undefined;
  if (stageInfo.canReproduce && canBreed(agent, state.balanceUSDC, state.tick, state.lastBreedingTick)) {
    breedingRequest = selectMate(agent, allAgents.filter(a => a.id !== agent.id), balances) || undefined;
    if (breedingRequest) {
      dailyEvents.push('💕 寻找繁殖伴侣');
    }
  }
  
  // === 7. MEMORY ===
  if (state.tick % 1 === 0 && expression.memoryUtilization > 0.3) {
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
    events: dailyEvents,
  };
  
  return { state, breedingRequest, dailyReport };
};
