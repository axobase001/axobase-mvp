/**
 * Agent Runtime
 * Encapsulates agent state and behavior
 */

import { DynamicGenome, GenomeHash, expressGenome } from '../genome/index.js';
import { DecisionEngine } from '../decision/engine.js';
import { AgentConfig } from '../lifecycle/birth.js';
import { SurvivalState, initializeSurvivalState, runSurvivalTick } from '../lifecycle/survival.js';
import { Tombstone } from '../lifecycle/death.js';
import { DevelopmentStage } from '../lifecycle/development.js';
import { createHDWallet, setSimulatedBalance } from '../tools/wallet.js';
import { assignAgentName } from '../monitoring/umbilical-monitor.js';

export interface AgentSnapshot {
  id: string;
  genome: DynamicGenome;
  survivalState: SurvivalState;
  walletIndex: number;
  parentIds: [string, string] | null;
}

export class Agent {
  id: string;
  walletIndex: number;
  genome: DynamicGenome;
  parentIds: [string, string] | null;
  survivalState: SurvivalState;
  decisionEngine: DecisionEngine;
  private isRunning: boolean = false;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.walletIndex = config.walletIndex;
    this.genome = config.genome;
    this.parentIds = config.parentIds;
    this.survivalState = initializeSurvivalState();
    this.survivalState.balanceUSDC = config.initialBalance;
    
    // Set simulated balance for MVP (real blockchain not available)
    setSimulatedBalance(this.id, config.initialBalance);
    
    this.decisionEngine = new DecisionEngine({
      agentId: this.id,
      llmProvider: 'api',
    });
    
    // Assign a name based on genome traits
    const expression = expressGenome(this.genome);
    assignAgentName(this.id, {
      analyticalAbility: expression.analyticalAbility,
      creativeAbility: expression.creativeAbility,
      socialVsTechnical: expression.socialVsTechnical,
      riskAppetite: expression.riskAppetite,
    });
  }

  get isAlive(): boolean {
    return this.survivalState.isAlive;
  }

  get stage(): DevelopmentStage {
    return this.survivalState.stage;
  }

  get age(): number {
    return this.survivalState.tick;
  }

  get balanceUSDC(): number {
    return this.survivalState.balanceUSDC;
  }

  get genomeHash(): GenomeHash {
    return this.genome.meta.genomeHash;
  }

  get expression() {
    return expressGenome(this.genome);
  }

  async tick(allAgents: Agent[], balances: Map<string, number>): Promise<{ tombstone?: Tombstone; breedingRequest?: Agent }> {
    if (!this.isAlive) return {};

    const result = await runSurvivalTick(
      this.toConfig(),
      this.survivalState,
      this.decisionEngine,
      allAgents.map(a => a.toConfig()),
      balances
    );

    this.survivalState = result.state;

    return {
      tombstone: result.tombstone,
      breedingRequest: result.breedingRequest ? Agent.fromConfig({
        id: result.breedingRequest.id,
        genome: result.breedingRequest.genome,
        walletIndex: result.breedingRequest.walletIndex,
        parentIds: result.breedingRequest.parentIds,
        initialBalance: result.breedingRequest.initialBalance,
      }) : undefined,
    };
  }

  toConfig(): AgentConfig {
    return {
      id: this.id,
      walletIndex: this.walletIndex,
      genome: this.genome,
      parentIds: this.parentIds,
      initialBalance: this.survivalState.balanceUSDC,
    };
  }

  serialize(): AgentSnapshot {
    return {
      id: this.id,
      genome: this.genome,
      survivalState: this.survivalState,
      walletIndex: this.walletIndex,
      parentIds: this.parentIds,
    };
  }

  static deserialize(snapshot: AgentSnapshot): Agent {
    const agent = new Agent({
      id: snapshot.id,
      walletIndex: snapshot.walletIndex,
      genome: snapshot.genome,
      parentIds: snapshot.parentIds,
      initialBalance: snapshot.survivalState.balanceUSDC,
    });
    agent.survivalState = snapshot.survivalState;
    return agent;
  }

  static fromConfig(config: AgentConfig): Agent {
    return new Agent(config);
  }
}
