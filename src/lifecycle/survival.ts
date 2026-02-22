/**
 * Survival Loop
 * Main agent lifecycle execution
 */

import { AgentConfig } from './birth.js';
import { checkDeath, executeDeath, DeathVerdict, Tombstone } from './death.js';
import { canBreed, selectMate, BreedingResult } from './breeding.js';
import { determineStage, DevelopmentStage } from './development.js';
import { DecisionEngine } from '../decision/engine.js';
import { perceive, PerceptionResult } from '../decision/perceive.js';
import { calculateTickMetabolicCost } from '../genome/metabolism.js';
import { getUSDCBalance } from '../tools/wallet.js';
import { inscribeMemory } from '../tools/arweave.js';
import { CONSTANTS } from '../config/constants.js';

export interface SurvivalState {
  tick: number;
  isAlive: boolean;
  stage: DevelopmentStage;
  balanceUSDC: number;
  consecutiveFailures: number;
  lastBreedingTick: number;
  actionHistory: Array<{ tick: number; action: string; success: boolean; cost: number }>;
}

export const initializeSurvivalState = (): SurvivalState => ({
  tick: 0,
  isAlive: true,
  stage: DevelopmentStage.NEONATE,
  balanceUSDC: 0,
  consecutiveFailures: 0,
  lastBreedingTick: 0,
  actionHistory: [],
});

export const runSurvivalTick = async (
  agent: AgentConfig,
  state: SurvivalState,
  decisionEngine: DecisionEngine,
  allAgents: AgentConfig[],
  balances: Map<string, number>
): Promise<{ state: SurvivalState; tombstone?: Tombstone; breedingRequest?: AgentConfig }> => {
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
  
  // Calculate metabolic cost
  const tickHours = CONSTANTS.TICK_INTERVAL_MS / (60 * 60 * 1000);
  const metabolicCost = calculateTickMetabolicCost(agent.genome, tickHours) * stageInfo.metabolismMultiplier;
  state.balanceUSDC -= metabolicCost;
  
  // Perceive environment
  const perception = await perceive({
    agentId: agent.id,
    genomeExpression: {
      riskAppetite: 0.5, onChainAffinity: 0.5, cooperationTendency: 0.5,
      savingsRate: 0.5, inferenceQuality: 0.5, creativeAbility: 0.5,
      analyticalAbility: 0.5, humanDependence: 0.5, adaptationSpeed: 0.5,
      stressResponse: 0.5, learningRate: 0.5, planningHorizon: 0.5,
      metabolicCost: 0.01, maxLifespan: 500, cycleSpeed: 0.5,
      globalMutationRate: 0.02, crossoverRate: 0.5,
    },
    tick: state.tick,
    age: state.tick,
    generation: agent.genome.meta.generation,
  });
  
  // Make decision
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
  
  // Execute action (mock for MVP)
  const actionSuccess = Math.random() > 0.3;
  const actionCost = decision.costEstimate;
  state.balanceUSDC -= actionCost;
  
  state.actionHistory.push({
    tick: state.tick,
    action: decision.selectedAction.type,
    success: actionSuccess,
    cost: actionCost + metabolicCost,
  });
  
  if (actionSuccess) {
    state.consecutiveFailures = 0;
  } else {
    state.consecutiveFailures++;
  }
  
  // Check breeding
  let breedingRequest: AgentConfig | undefined;
  if (stageInfo.canReproduce && canBreed(agent, state.balanceUSDC, state.tick, state.lastBreedingTick)) {
    breedingRequest = selectMate(agent, allAgents.filter(a => a.id !== agent.id), balances) || undefined;
  }
  
  // Inscribe memory periodically
  if (state.tick % 100 === 0) {
    await inscribeMemory({
      agentId: agent.id,
      tick: state.tick,
      timestamp: Date.now(),
      thoughts: state.actionHistory.slice(-10),
      transactions: [],
      genomeHash: agent.genome.meta.genomeHash,
      balance: state.balanceUSDC,
    });
  }
  
  return { state, breedingRequest };
};
