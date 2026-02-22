/**
 * Survival Loop with Environmental Events
 * Main agent lifecycle execution with event handling
 */

import { AgentConfig } from './birth.js';
import { checkDeath, executeDeath, Tombstone } from './death.js';
import { canBreed, selectMate } from './breeding.js';
import { determineStage, DevelopmentStage } from './development.js';
import { DecisionEngine } from '../decision/engine.js';
import { perceive, PerceptionResult } from '../decision/perceive.js';
import { calculateTickMetabolicCost } from '../genome/metabolism.js';
import { getUSDCBalance } from '../tools/wallet.js';
import { inscribeMemory } from '../tools/arweave.js';
import { CONSTANTS } from '../config/constants.js';
import { 
  generateRandomEvents, 
  getActiveEvents, 
  canAgentUtilizeEvent, 
  calculateEventImpact,
  EnvironmentEvent 
} from '../environment/events.js';
import { expressGenome } from '../genome/index.js';

export interface SurvivalState {
  tick: number;
  isAlive: boolean;
  stage: DevelopmentStage;
  balanceUSDC: number;
  consecutiveFailures: number;
  lastBreedingTick: number;
  actionHistory: Array<{ tick: number; action: string; success: boolean; cost: number }>;
  eventLog: Array<{ tick: number; eventName: string; impact: number; description: string }>;
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
});

// 全局活跃事件（所有Agent共享）
let globalActiveEvents: EnvironmentEvent[] = [];

export const runSurvivalTick = async (
  agent: AgentConfig,
  state: SurvivalState,
  decisionEngine: DecisionEngine,
  allAgents: AgentConfig[],
  balances: Map<string, number>
): Promise<{ state: SurvivalState; tombstone?: Tombstone; breedingRequest?: AgentConfig; eventResults?: string[] }> => {
  state.tick++;
  
  // 每10 ticks生成新事件
  if (state.tick % 10 === 0) {
    generateRandomEvents();
  }
  globalActiveEvents = getActiveEvents();
  
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
  
  // Calculate metabolic cost
  const tickHours = CONSTANTS.TICK_INTERVAL_MS / (60 * 60 * 1000);
  const metabolicCost = calculateTickMetabolicCost(agent.genome, tickHours) * stageInfo.metabolismMultiplier;
  state.balanceUSDC -= metabolicCost;
  
  // Process environmental events
  const expression = expressGenome(agent.genome);
  const eventResults: string[] = [];
  
  for (const event of globalActiveEvents) {
    if (canAgentUtilizeEvent(event, expression)) {
      // 检查是否已经成功利用过这个事件
      const alreadyUtilized = state.eventLog.some(
        log => log.tick > state.tick - event.duration && log.eventName === event.name
      );
      
      if (!alreadyUtilized && Math.random() < 0.7) { // 70%概率尝试利用事件
        const impact = calculateEventImpact(event, expression);
        state.balanceUSDC += impact.amount;
        
        state.eventLog.push({
          tick: state.tick,
          eventName: event.name,
          impact: impact.amount,
          description: impact.description,
        });
        
        eventResults.push(impact.description);
        
        // 记录到action history
        state.actionHistory.push({
          tick: state.tick,
          action: `event:${event.type}`,
          success: impact.amount > 0,
          cost: impact.amount < 0 ? -impact.amount : 0,
        });
      }
    }
  }
  
  // Perceive environment
  const perception = await perceive({
    agentId: agent.id,
    genomeExpression: expression,
    tick: state.tick,
    age: state.tick,
    generation: agent.genome.meta.generation,
  });
  
  // Make decision (if no significant event happened)
  if (eventResults.length === 0 || state.balanceUSDC > 5) {
    let decision;
    try {
      decision = await decisionEngine.decide(perception, agent.genome);
    } catch {
      decision = {
        selectedStrategy: { id: 'idle_conservation' },
        selectedAction: { type: 'idle_conservation', params: {} },
        reasoning: 'Fallback',
        confidence: 0.3,
        costEstimate: 0.001,
      } as unknown as Awaited<ReturnType<DecisionEngine['decide']>>;
    }
    
    // Execute action
    const actionSuccess = Math.random() > 0.3;
    const actionCost = decision.costEstimate;
    state.balanceUSDC -= actionCost;
    
    if (actionSuccess && decision.selectedStrategy.id !== 'idle_conservation') {
      // 策略执行可能带来收益
      const strategyGain = Math.random() * 0.5;
      state.balanceUSDC += strategyGain;
      state.consecutiveFailures = 0;
      
      state.actionHistory.push({
        tick: state.tick,
        action: decision.selectedAction.type,
        success: true,
        cost: actionCost - strategyGain,
      });
    } else {
      state.consecutiveFailures++;
      state.actionHistory.push({
        tick: state.tick,
        action: decision.selectedAction.type,
        success: false,
        cost: actionCost,
      });
    }
  }
  
  // Check breeding
  let breedingRequest: AgentConfig | undefined;
  if (stageInfo.canReproduce && canBreed(agent, state.balanceUSDC, state.tick, state.lastBreedingTick)) {
    breedingRequest = selectMate(agent, allAgents.filter(a => a.id !== agent.id), balances) || undefined;
  }
  
  // Inscribe memory periodically
  if (state.tick % 50 === 0) {
    await inscribeMemory({
      agentId: agent.id,
      tick: state.tick,
      timestamp: Date.now(),
      thoughts: [...state.actionHistory.slice(-10), ...eventResults],
      transactions: [],
      genomeHash: agent.genome.meta.genomeHash,
      balance: state.balanceUSDC,
    });
  }
  
  return { state, breedingRequest, eventResults };
};

export const getGlobalActiveEvents = (): EnvironmentEvent[] => globalActiveEvents;
