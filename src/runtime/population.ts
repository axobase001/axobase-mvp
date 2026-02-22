/**
 * Population Manager
 * Manages all agents in the simulation
 */

import { Agent, AgentSnapshot } from './agent.js';
import { createFounderAgent, createOffspring, AgentConfig } from '../lifecycle/birth.js';
import { Tombstone } from '../lifecycle/death.js';
import { env } from '../config/env.js';

export interface PopulationStats {
  timestamp: number;
  totalAgents: number;
  aliveAgents: number;
  deadAgents: number;
  averageBalance: number;
  medianBalance: number;
  minBalance: number;
  maxBalance: number;
  averageAge: number;
  oldestAgent: number;
  breedingEvents: number;
  deathEvents: number;
  strategyDistribution: Record<string, number>;
}

export class Population {
  agents: Map<string, Agent> = new Map();
  tombstones: Tombstone[] = [];
  generation: number = 0;
  breedingEvents: number = 0;
  deathEvents: number = 0;
  private walletIndexCounter: number = 0;
  private isRunning: boolean = false;

  async initialize(count: number = env.INITIAL_AGENT_COUNT): Promise<void> {
    for (let i = 0; i < count; i++) {
      const config = await createFounderAgent(this.walletIndexCounter++);
      const agent = new Agent(config);
      this.agents.set(agent.id, agent);
    }
  }

  async runTick(): Promise<void> {
    if (!this.isRunning) return;

    const balances = new Map<string, number>();
    for (const [id, agent] of this.agents) {
      if (agent.isAlive) {
        balances.set(id, agent.balanceUSDC);
      }
    }

    const aliveAgents = Array.from(this.agents.values()).filter(a => a.isAlive);
    
    for (const agent of aliveAgents) {
      const { tombstone, breedingRequest } = await agent.tick(aliveAgents, balances);
      
      if (tombstone) {
        this.tombstones.push(tombstone);
        this.deathEvents++;
      }
      
      if (breedingRequest) {
        // Find mate and create offspring
        const mate = this.agents.get(breedingRequest.id);
        if (mate && mate.isAlive) {
          const offspringConfig = await this.createOffspring(agent, mate);
          const offspring = new Agent(offspringConfig);
          this.agents.set(offspring.id, offspring);
          this.breedingEvents++;
        }
      }
    }
  }

  private async createOffspring(parent1: Agent, parent2: Agent): Promise<AgentConfig> {
    return createOffspring(
      parent1.toConfig(),
      parent2.toConfig(),
      this.walletIndexCounter++
    );
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  getStats(): PopulationStats {
    const aliveAgents = Array.from(this.agents.values()).filter(a => a.isAlive);
    const balances = aliveAgents.map(a => a.balanceUSDC);
    const ages = aliveAgents.map(a => a.age);
    
    const strategyDist: Record<string, number> = {};
    for (const agent of aliveAgents) {
      // Simplified: just count for MVP
      strategyDist[agent.stage] = (strategyDist[agent.stage] || 0) + 1;
    }

    return {
      timestamp: Date.now(),
      totalAgents: this.agents.size,
      aliveAgents: aliveAgents.length,
      deadAgents: this.deathEvents,
      averageBalance: balances.length > 0 ? balances.reduce((a, b) => a + b, 0) / balances.length : 0,
      medianBalance: balances.length > 0 ? balances.sort((a, b) => a - b)[Math.floor(balances.length / 2)] : 0,
      minBalance: balances.length > 0 ? Math.min(...balances) : 0,
      maxBalance: balances.length > 0 ? Math.max(...balances) : 0,
      averageAge: ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0,
      oldestAgent: ages.length > 0 ? Math.max(...ages) : 0,
      breedingEvents: this.breedingEvents,
      deathEvents: this.deathEvents,
      strategyDistribution: strategyDist,
    };
  }

  async saveSnapshot(path: string): Promise<void> {
    const snapshot = {
      generation: this.generation,
      breedingEvents: this.breedingEvents,
      deathEvents: this.deathEvents,
      agents: Array.from(this.agents.values()).map(a => a.serialize()),
      tombstones: this.tombstones,
    };
    
    const { writeFile } = await import('fs/promises');
    await writeFile(path, JSON.stringify(snapshot, null, 2));
  }

  static async loadSnapshot(path: string): Promise<Population> {
    const { readFile } = await import('fs/promises');
    const data = JSON.parse(await readFile(path, 'utf-8'));
    
    const population = new Population();
    population.generation = data.generation;
    population.breedingEvents = data.breedingEvents;
    population.deathEvents = data.deathEvents;
    population.tombstones = data.tombstones || [];
    
    for (const agentSnapshot of data.agents) {
      const agent = Agent.deserialize(agentSnapshot);
      population.agents.set(agent.id, agent);
    }
    
    return population;
  }
}
