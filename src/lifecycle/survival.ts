/**
 * Survival Loop with Real Costs and DeFi Events
 * 1 Tick = 1 Day
 * Includes realistic operational costs and DeFi yield opportunities
 */

import { AgentConfig } from './birth.js';
import { checkDeath, executeDeath, Tombstone } from './death.js';
import { canBreed, selectMate } from './breeding.js';
import { determineStage, DevelopmentStage } from './development.js';
import { DecisionEngine } from '../decision/engine.js';
import { perceive } from '../decision/perceive.js';
import { getUSDCBalance } from '../tools/wallet.js';
import { inscribeMemory } from '../tools/arweave.js';
import { calculateDailyCost, DAILY_SCENARIOS } from '../config/costs.js';
import { 
  generateRandomEvents, 
  getActiveEvents, 
  canAgentUtilizeEvent, 
  calculateEventImpact,
  EnvironmentEvent 
} from '../environment/events.js';
import { 
  DEFI_EVENTS,
  getAvailableDeFiEvents,
  calculateDeFiReturn,
  DeFiEvent,
} from '../environment/defi-events.js';
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
  eventLog: Array<{ tick: number; eventName: string; impact: number; description: string }>;
  totalSpent: {
    compute: number;
    inference: number;
    gas: number;
    storage: number;
    genome: number;
  };
  totalEarned: {
    defi: number;
    events: number;
  };
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
  totalSpent: { compute: 0, inference: 0, gas: 0, storage: 0, genome: 0 },
  totalEarned: { defi: 0, events: 0 },
});

// Global state
let globalActiveEvents: EnvironmentEvent[] = [];
let dailyDeFiEvents: DeFiEvent[] = [];

// Select DeFi events for the day
const generateDailyDeFiEvents = (): DeFiEvent[] => {
  const available: DeFiEvent[] = [];
  for (const event of DEFI_EVENTS) {
    if (Math.random() < event.dailyProbability) {
      available.push(event);
    }
  }
  return available;
};

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
    costs: { compute: number; inference: number; gas: number; storage: number; genome: number; total: number };
    earnings: { defi: number; events: number; total: number };
    netFlow: number;
    actions: string[];
  };
}> => {
  state.tick++;
  
  // Get current balance
  state.balanceUSDC = await getUSDCBalance(agent.id);
  
  // Check death conditions
  const deathVerdict = checkDeath(agent, state.balanceUSDC, state.tick, state.consecutiveFailures);
  if (deathVerdict.isDead && deathVerdict.cause) {
    const tombstone = executeDeath(agent, deathVerdict.cause, state.tick, state.balanceUSDC);
    return { state: { ...state, isAlive: false }, tombstone };
  }
  
  // Determine development stage
  const maxLifespan = agent.genome.chromosomes
    .flatMap(c => c.genes)
    .find(g => g.name === 'max_lifespan')?.value || 1;
  const stageInfo = determineStage(state.tick, maxLifespan * 1000);
  state.stage = stageInfo.stage;
  
  // === REAL DAILY COSTS ===
  const expression = expressGenome(agent.genome);
  const geneCount = agent.genome.meta.totalGenes;
  
  // 1. Compute cost (use own server model = $0/day for simulation)
  const computeCost = 0; // $0 if using own server
  
  // 2. Inference cost (depends on how many LLM calls)
  // Agents with higher inference_quality_pref make more calls
  const inferenceCalls = expression.inferenceQuality > 0.7 ? 3 : expression.inferenceQuality > 0.4 ? 2 : 1;
  const inferenceCost = inferenceCalls * getInferenceCostEstimate();
  
  // 3. Gas cost (depends on onChainAffinity)
  const txCount = expression.onChainAffinity > 0.7 ? 20 : expression.onChainAffinity > 0.4 ? 10 : 3;
  const gasCost = txCount * 0.003; // Average swap cost
  
  // 4. Storage cost (depends on memory utilization)
  const inscriptions = expression.memoryUtilization > 0.7 ? 4 : expression.memoryUtilization > 0.3 ? 1 : 0;
  const storageCost = inscriptions * 0.001;
  
  // 5. Genome metabolism
  const genomeCost = geneCount * 0.0002;
  
  const totalDailyCost = computeCost + inferenceCost + gasCost + storageCost + genomeCost;
  state.balanceUSDC -= totalDailyCost;
  
  state.totalSpent.compute += computeCost;
  state.totalSpent.inference += inferenceCost;
  state.totalSpent.gas += gasCost;
  state.totalSpent.storage += storageCost;
  state.totalSpent.genome += genomeCost;
  
  const dailyActions: string[] = [
    `💰 日常成本: -$${totalDailyCost.toFixed(3)} (推理:${inferenceCalls}次, Gas:${txCount}笔)`,
  ];
  
  // === ENVIRONMENTAL EVENTS ===
  if (state.tick % 1 === 0) { // Daily event generation
    generateRandomEvents();
    dailyDeFiEvents = generateDailyDeFiEvents();
  }
  globalActiveEvents = getActiveEvents();
  
  let eventEarnings = 0;
  
  // Process random events
  for (const event of globalActiveEvents) {
    if (canAgentUtilizeEvent(event, expression)) {
      const alreadyUtilized = state.eventLog.some(
        log => log.tick > state.tick - event.duration && log.eventName === event.name
      );
      
      if (!alreadyUtilized && Math.random() < 0.5) {
        const impact = calculateEventImpact(event, expression);
        state.balanceUSDC += impact.amount;
        eventEarnings += impact.amount;
        
        state.eventLog.push({
          tick: state.tick,
          eventName: event.name,
          impact: impact.amount,
          description: impact.description,
        });
        
        dailyActions.push(`${impact.amount >= 0 ? '✅' : '❌'} ${impact.description}`);
      }
    }
  }
  
  state.totalEarned.events += eventEarnings;
  
  // === DEFI OPPORTUNITIES ===
  let defiEarnings = 0;
  
  // Get available DeFi events based on capital
  const availableDeFi = getAvailableDeFiEvents(state.balanceUSDC + 10); // +10 to check if close to threshold
  
  for (const defiEvent of availableDeFi) {
    // Only participate if traits match
    let canParticipate = true;
    for (const [trait, threshold] of Object.entries(defiEvent.requiredTraits)) {
      const value = expression[trait as keyof ExpressionResult];
      if (typeof value === 'number' && value < threshold) {
        canParticipate = false;
        break;
      }
    }
    
    if (canParticipate && state.balanceUSDC >= defiEvent.minCapital) {
      const result = calculateDeFiReturn(defiEvent, state.balanceUSDC, expression);
      
      if (result.success || result.netReturn !== 0) {
        state.balanceUSDC += result.netReturn;
        defiEarnings += result.netReturn;
        
        state.actionHistory.push({
          tick: state.tick,
          action: `defi:${defiEvent.type}`,
          success: result.success,
          cost: result.gasCost,
          revenue: result.grossReturn,
        });
        
        dailyActions.push(`${result.netReturn >= 0 ? '📈' : '📉'} ${result.message}`);
      }
    }
  }
  
  state.totalEarned.defi += defiEarnings;
  
  // === LLM DECISION MAKING ===
  if (state.balanceUSDC > 2) { // Only make decisions if have enough funds
    const perception = await perceive({
      agentId: agent.id,
      genomeExpression: expression,
      tick: state.tick,
      age: state.tick,
      generation: agent.genome.meta.generation,
    });
    
    let decision;
    try {
      decision = await decisionEngine.decide(perception, agent.genome);
      state.balanceUSDC -= inferenceCost / inferenceCalls; // Additional decision cost
    } catch {
      // Fallback
    }
  }
  
  // Check breeding
  let breedingRequest: AgentConfig | undefined;
  if (stageInfo.canReproduce && canBreed(agent, state.balanceUSDC, state.tick, state.lastBreedingTick)) {
    breedingRequest = selectMate(agent, allAgents.filter(a => a.id !== agent.id), balances) || undefined;
  }
  
  // Memory inscription
  if (state.tick % 1 === 0 && expression.memoryUtilization > 0.3) {
    await inscribeMemory({
      agentId: agent.id,
      tick: state.tick,
      timestamp: Date.now(),
      thoughts: dailyActions,
      transactions: [],
      genomeHash: agent.genome.meta.genomeHash,
      balance: state.balanceUSDC,
    });
  }
  
  // Prepare daily report
  const totalEarnings = defiEarnings + eventEarnings;
  const netFlow = totalEarnings - totalDailyCost;
  
  const dailyReport = {
    tick: state.tick,
    costs: {
      compute: computeCost,
      inference: inferenceCost,
      gas: gasCost,
      storage: storageCost,
      genome: genomeCost,
      total: totalDailyCost,
    },
    earnings: {
      defi: defiEarnings,
      events: eventEarnings,
      total: totalEarnings,
    },
    netFlow,
    actions: dailyActions,
  };
  
  // Update consecutive failures
  if (netFlow < 0) {
    state.consecutiveFailures++;
  } else {
    state.consecutiveFailures = 0;
  }
  
  return { state, breedingRequest, dailyReport };
};

export const getGlobalActiveEvents = (): EnvironmentEvent[] => globalActiveEvents;
export const getDailyDeFiEvents = (): DeFiEvent[] => dailyDeFiEvents;
