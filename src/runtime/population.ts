/**
 * Population Manager
 * v2: 种群容量上限、环境灾难、创始者血统追踪、新终止条件 A/B/C/D
 */

import { Agent, AgentSnapshot } from './agent.js';
import { createFounderAgent, createOffspring, AgentConfig } from '../lifecycle/birth.js';
import { Tombstone, executeDeath } from '../lifecycle/death.js';
import { env } from '../config/env.js';
import { CONSTANTS } from '../config/constants.js';
import { setSimulatedBalance } from '../tools/wallet.js';
import { logOffspring, writeOffspringSummary, OffspringRecord } from './conversation-logger.js';
import { expressGenome } from '../genome/index.js';
import { appendFileSync, existsSync, mkdirSync } from 'fs';

const ensureLogsDir = () => {
  if (!existsSync('./logs')) mkdirSync('./logs', { recursive: true });
};

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

export interface TerminationResult {
  triggered: boolean;
  /** A=血统, B=经济, C=存活, D=涌现(不立即停止) */
  condition?: 'A' | 'B' | 'C' | 'D';
  agentId?: string;
  detail?: string;
}

export class Population {
  agents: Map<string, Agent> = new Map();
  tombstones: Tombstone[] = [];
  generation: number = 0;
  breedingEvents: number = 0;
  deathEvents: number = 0;
  competitionDeaths: number = 0;
  private walletIndexCounter: number = 0;
  private isRunning: boolean = false;
  offspringRecords: OffspringRecord[] = [];
  lineageMap: Map<string, Set<string>> = new Map(); // parentId → Set<childId>

  /** agentId → Set of founder IDs (Gen0) they descend from */
  founderAncestorMap: Map<string, Set<string>> = new Map();

  /** 涌现行为触发次数 */
  emergentBehaviorCount: number = 0;

  async initialize(count: number = env.INITIAL_AGENT_COUNT): Promise<void> {
    for (let i = 0; i < count; i++) {
      const config = await createFounderAgent(this.walletIndexCounter++);
      const agent = new Agent(config);
      this.agents.set(agent.id, agent);
      // 创始者是自己血统的源头
      this.founderAncestorMap.set(agent.id, new Set([agent.id]));
    }
  }

  // ── 环境灾难事件（每 tick 开始时 roll）────────────────────────────────────

  private rollEnvironmentalEvent(currentTick: number): void {
    const roll = Math.random();
    const alive = Array.from(this.agents.values()).filter(a => a.isAlive);
    if (alive.length === 0) return;

    let eventType: string | null = null;
    let affected = 0;

    if (roll < 0.05) {
      // 5%: 市场崩盘 -30%
      alive.forEach(a => {
        const nb = a.survivalState.balanceUSDC * 0.7;
        a.survivalState.balanceUSDC = nb;
        setSimulatedBalance(a.id, nb);
      });
      eventType = 'market_crash';
      affected = alive.length;
      console.log(`\n💥 [Tick ${currentTick}] 市场崩盘！全体 ${alive.length} agents 余额 -30%\n`);
    } else if (roll < 0.08) {
      // 3%: 资源爆发 +2 USDC
      alive.forEach(a => {
        const nb = a.survivalState.balanceUSDC + 2;
        a.survivalState.balanceUSDC = nb;
        setSimulatedBalance(a.id, nb);
      });
      eventType = 'resource_boom';
      affected = alive.length;
      console.log(`\n🌟 [Tick ${currentTick}] 资源爆发！全体 ${alive.length} agents +$2\n`);
    } else if (roll < 0.10) {
      // 2%: 瘟疫，随机 40% agents -50%
      const victims = [...alive].sort(() => Math.random() - 0.5)
        .slice(0, Math.ceil(alive.length * 0.4));
      victims.forEach(a => {
        const nb = a.survivalState.balanceUSDC * 0.5;
        a.survivalState.balanceUSDC = nb;
        setSimulatedBalance(a.id, nb);
      });
      eventType = 'plague';
      affected = victims.length;
      console.log(`\n🦠 [Tick ${currentTick}] 瘟疫！${victims.length}/${alive.length} agents 余额 -50%\n`);
    }

    if (eventType) {
      try {
        ensureLogsDir();
        const line = `[${new Date().toISOString()}] tick=${currentTick}  event=${eventType}  affected=${affected}/${alive.length} agents\n`;
        appendFileSync('./logs/events.txt', line);
      } catch { /* best effort */ }
    }
  }

  // ── 竞争淘汰（种群超过容量时）────────────────────────────────────────────

  private enforceCarryingCapacity(currentTick: number): void {
    const alive = Array.from(this.agents.values()).filter(a => a.isAlive);
    if (alive.length <= CONSTANTS.OVERCROWDING_THRESHOLD) return;

    // 按余额升序，最穷的先被淘汰
    const toKill = alive.length - CONSTANTS.OVERCROWDING_THRESHOLD;
    const sorted = [...alive].sort((a, b) => a.balanceUSDC - b.balanceUSDC);

    for (let i = 0; i < toKill; i++) {
      const victim = sorted[i];
      const verdict = { isDead: true, cause: 'competition' as const, reason: '种群过载竞争淘汰' };
      const tombstone = executeDeath(
        victim.toConfig(), 'competition', currentTick,
        victim.balanceUSDC, victim.survivalState, verdict
      );
      victim.survivalState = { ...victim.survivalState, isAlive: false };
      this.tombstones.push(tombstone);
      this.deathEvents++;
      this.competitionDeaths++;
      console.log(`⚔️  竞争淘汰: ${victim.id.slice(0, 10)} (余额 $${victim.balanceUSDC.toFixed(2)})`);
    }
  }

  // ── 主 tick ───────────────────────────────────────────────────────────────

  async runTick(): Promise<void> {
    if (!this.isRunning) return;

    // 获取当前 tick（用任一存活 agent 的 tick+1 估算，或 0）
    const anyAlive = Array.from(this.agents.values()).find(a => a.isAlive);
    const currentTick = (anyAlive?.age ?? 0) + 1;

    // 1. 环境灾难事件（tick 开始前）
    this.rollEnvironmentalEvent(currentTick);

    const balances = new Map<string, number>();
    for (const [id, agent] of this.agents) {
      if (agent.isAlive) balances.set(id, agent.balanceUSDC);
    }

    const aliveAgents = Array.from(this.agents.values()).filter(a => a.isAlive);

    for (const agent of aliveAgents) {
      const { tombstone, breedingRequest } = await agent.tick(aliveAgents, balances);

      if (tombstone) {
        this.tombstones.push(tombstone);
        this.deathEvents++;
      }

      // 检查涌现行为
      if (agent.survivalState.emergentBehaviorInfo) {
        this.emergentBehaviorCount++;
        const info = agent.survivalState.emergentBehaviorInfo;
        console.log(`\n⚡ 涌现行为 #${this.emergentBehaviorCount}: Agent ${agent.id.slice(0, 10)} → [${info.pattern}]`);
        console.log(`   推理片段: "${info.reasoning.slice(0, 120)}"`);
        try {
          ensureLogsDir();
          const ts = new Date().toISOString();
          const text = `[${ts}] EMERGENT #${this.emergentBehaviorCount}  agent=${agent.id.slice(0, 12)}  tick=${info.tick}  pattern=${info.pattern}\n  reasoning: ${info.reasoning.replace(/\n/g, ' ')}\n\n`;
          appendFileSync('./logs/events.txt', text);
        } catch { /* best effort */ }
      }

      if (breedingRequest) {
        // 种群硬上限检查（繁殖前）
        const currentAlive = Array.from(this.agents.values()).filter(a => a.isAlive).length;
        if (currentAlive >= CONSTANTS.MAX_POPULATION) continue;

        const mate = this.agents.get(breedingRequest.id);
        if (mate && mate.isAlive) {
          const mateCost = CONSTANTS.BREEDING_COST_PER_PARENT;
          if (mate.survivalState.balanceUSDC >= mateCost) {
            mate.survivalState.balanceUSDC -= mateCost;
            mate.survivalState.liquidCapital = Math.max(0, mate.survivalState.liquidCapital - mateCost);
            setSimulatedBalance(mate.id, mate.survivalState.balanceUSDC);
          }

          const offspringConfig = await this.createOffspring(agent, mate);
          const offspring = new Agent(offspringConfig);
          this.agents.set(offspring.id, offspring);
          this.breedingEvents++;

          // 亲子关系追踪
          if (!this.lineageMap.has(agent.id)) this.lineageMap.set(agent.id, new Set());
          if (!this.lineageMap.has(mate.id)) this.lineageMap.set(mate.id, new Set());
          this.lineageMap.get(agent.id)!.add(offspring.id);
          this.lineageMap.get(mate.id)!.add(offspring.id);

          // 创始血统追踪（子代继承双亲的全部创始祖先集合）
          const p1Founders = this.founderAncestorMap.get(agent.id) || new Set([agent.id]);
          const p2Founders = this.founderAncestorMap.get(mate.id) || new Set([mate.id]);
          this.founderAncestorMap.set(offspring.id, new Set([...p1Founders, ...p2Founders]));

          // 子代基因组记录
          const expression = expressGenome(offspringConfig.genome);
          const chromSummary = offspringConfig.genome.chromosomes.map(c => ({
            name: c.name,
            geneCount: c.genes.length,
            avgValue: c.genes.reduce((s, g) => s + g.value, 0) / (c.genes.length || 1),
            keyGenes: c.genes
              .sort((a, b) => b.essentiality - a.essentiality)
              .slice(0, 3)
              .map(g => ({ name: g.name, value: g.value, origin: g.origin })),
          }));
          const record: OffspringRecord = {
            timestamp: Date.now(),
            offspringId: offspring.id,
            parent1Id: agent.id,
            parent2Id: mate.id,
            generation: offspringConfig.genome.meta.generation,
            initialBalance: offspringConfig.initialBalance,
            genomeHash: offspringConfig.genome.meta.genomeHash,
            totalGenes: offspringConfig.genome.meta.totalGenes,
            chromosomeSummary: chromSummary,
            expressedTraits: {
              riskAppetite: expression.riskAppetite,
              analyticalAbility: expression.analyticalAbility,
              creativeAbility: expression.creativeAbility,
              cooperationTendency: expression.cooperationTendency,
              onChainAffinity: expression.onChainAffinity,
              inferenceQuality: expression.inferenceQuality,
              humanDependence: expression.humanDependence,
              adaptationSpeed: expression.adaptationSpeed,
              learningRate: expression.learningRate,
            },
          };
          this.offspringRecords.push(record);
          logOffspring(record).catch(() => {});

          console.log(
            `🐣 新生命! ${offspring.id.slice(0, 10)}  Gen:${record.generation}  ` +
            `父:${agent.id.slice(0, 8)} × 母:${mate.id.slice(0, 8)}  ` +
            `起步:$${offspringConfig.initialBalance}  Genes:${record.totalGenes}`
          );
        }
      }
    }

    // 2. 竞争淘汰（tick 结束后）
    this.enforceCarryingCapacity(currentTick);
  }

  private async createOffspring(parent1: Agent, parent2: Agent): Promise<AgentConfig> {
    return createOffspring(
      parent1.toConfig(),
      parent2.toConfig(),
      this.walletIndexCounter++
    );
  }

  start(): void { this.isRunning = true; }
  stop(): void { this.isRunning = false; }

  // ── 统计 ──────────────────────────────────────────────────────────────────

  getStats(): PopulationStats {
    const aliveAgents = Array.from(this.agents.values()).filter(a => a.isAlive);
    const balances = aliveAgents.map(a => a.balanceUSDC);
    const ages = aliveAgents.map(a => a.age);

    const strategyDist: Record<string, number> = {};
    for (const agent of aliveAgents) {
      strategyDist[agent.stage] = (strategyDist[agent.stage] || 0) + 1;
    }

    return {
      timestamp: Date.now(),
      totalAgents: this.agents.size,
      aliveAgents: aliveAgents.length,
      deadAgents: this.deathEvents,
      averageBalance: balances.length > 0 ? balances.reduce((a, b) => a + b, 0) / balances.length : 0,
      medianBalance: balances.length > 0
        ? [...balances].sort((a, b) => a - b)[Math.floor(balances.length / 2)] : 0,
      minBalance: balances.length > 0 ? Math.min(...balances) : 0,
      maxBalance: balances.length > 0 ? Math.max(...balances) : 0,
      averageAge: ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0,
      oldestAgent: ages.length > 0 ? Math.max(...ages) : 0,
      breedingEvents: this.breedingEvents,
      deathEvents: this.deathEvents,
      strategyDistribution: strategyDist,
    };
  }

  // ── 终止条件 ──────────────────────────────────────────────────────────────

  /**
   * A: 血统垄断 — 单个创始者后代占存活种群 70%（且 pop > 30）
   * B: 经济垄断 — 单个 agent 持有总余额 50%
   * C: 超长存活 — 存活 > 前 5 代平均寿命 × 5（需 ≥10 死亡样本）
   * D: 涌现行为 — 累计触发 10 次（不立即终止，仅报告）
   */
  checkTerminationConditions(): TerminationResult {
    const aliveAgents = Array.from(this.agents.values()).filter(a => a.isAlive);
    const totalPop = aliveAgents.length;

    // ── 条件 A: 血统垄断 ─────────────────────────────────────────────────
    if (totalPop > CONSTANTS.EXPERIMENT_END_MIN_POPULATION) {
      const founderCounts: Record<string, number> = {};
      for (const agent of aliveAgents) {
        if (agent.parentIds === null) continue; // 创始者不算自己后代
        const founders = this.founderAncestorMap.get(agent.id) || new Set();
        for (const fId of founders) {
          founderCounts[fId] = (founderCounts[fId] || 0) + 1;
        }
      }
      const maxCount = Math.max(0, ...Object.values(founderCounts));
      const dominantFounder = Object.entries(founderCounts).find(([, c]) => c === maxCount)?.[0];
      const ratio = maxCount / totalPop;
      if (ratio >= CONSTANTS.EXPERIMENT_END_DESCENDANT_RATIO && dominantFounder) {
        return {
          triggered: true, condition: 'A', agentId: dominantFounder,
          detail: `血统垄断: ${dominantFounder.slice(0, 10)} 后代 ${maxCount}/${totalPop} = ${(ratio * 100).toFixed(1)}%`,
        };
      }
    }

    // ── 条件 B: 经济垄断 ─────────────────────────────────────────────────
    const totalBalance = aliveAgents.reduce((s, a) => s + a.balanceUSDC, 0);
    if (totalBalance > 0 && totalPop > CONSTANTS.EXPERIMENT_END_ECONOMIC_MIN_POPULATION) {
      for (const agent of aliveAgents) {
        const ratio = agent.balanceUSDC / totalBalance;
        if (ratio >= CONSTANTS.EXPERIMENT_END_ECONOMIC_RATIO) {
          return {
            triggered: true, condition: 'B', agentId: agent.id,
            detail: `经济垄断: ${agent.id.slice(0, 10)} 持有 $${agent.balanceUSDC.toFixed(2)} / 总 $${totalBalance.toFixed(2)} = ${(ratio * 100).toFixed(1)}%`,
          };
        }
      }
    }

    // ── 条件 C: 超长存活 ─────────────────────────────────────────────────
    // 前 5 代死亡 agent 的平均寿命
    const earlyDeadAges = this.tombstones
      .filter(t => t.generation <= 5)
      .map(t => t.age);
    if (earlyDeadAges.length >= 10) {
      const avgLifespan = earlyDeadAges.reduce((a, b) => a + b, 0) / earlyDeadAges.length;
      const threshold = avgLifespan * CONSTANTS.EXPERIMENT_END_SURVIVAL_MULTIPLIER;
      for (const agent of aliveAgents) {
        if (agent.age > threshold) {
          return {
            triggered: true, condition: 'C', agentId: agent.id,
            detail: `超长存活: ${agent.id.slice(0, 10)} 存活 ${agent.age} ticks (阈值 ${threshold.toFixed(0)} = ${avgLifespan.toFixed(0)} × ${CONSTANTS.EXPERIMENT_END_SURVIVAL_MULTIPLIER})`,
          };
        }
      }
    }

    // ── 条件 D: 涌现行为 ─────────────────────────────────────────────────
    if (this.emergentBehaviorCount >= CONSTANTS.EMERGENT_BEHAVIOR_STOP_COUNT) {
      return {
        triggered: true, condition: 'D',
        detail: `涌现行为累计 ${this.emergentBehaviorCount} 次，触发停止`,
      };
    }

    return { triggered: false };
  }

  // ── 快照 ──────────────────────────────────────────────────────────────────

  async saveSnapshot(path: string): Promise<void> {
    const snapshot = {
      generation: this.generation,
      breedingEvents: this.breedingEvents,
      deathEvents: this.deathEvents,
      competitionDeaths: this.competitionDeaths,
      emergentBehaviorCount: this.emergentBehaviorCount,
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
