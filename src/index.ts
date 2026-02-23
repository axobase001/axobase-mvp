/**
 * Axobase MVP — Entry Point v2
 *
 * 终止条件:
 *   A: 血统垄断 — 单一创始者后代 ≥ 70% 存活种群（pop > 30）
 *   B: 经济垄断 — 单个 agent 持有 ≥ 50% 总余额
 *   C: 超长存活 — 存活 > 前 5 代平均寿命 × 5（≥10 样本）
 *   D: 涌现行为 — 累计 10 次（每次记录，不立即停止）
 */

import { Population, TerminationResult } from './runtime/population.js';
import { logPopulationStats, exportToCSV } from './runtime/logger.js';
import { env, validateEnv } from './config/env.js';
import { CONSTANTS } from './config/constants.js';
import { writeOffspringSummary } from './runtime/conversation-logger.js';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

function ensureDirs() {
  for (const dir of ['./logs', './snapshots']) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

const CONDITION_LABELS: Record<string, string> = {
  A: `血统垄断 ≥ ${CONSTANTS.EXPERIMENT_END_DESCENDANT_RATIO * 100}% (pop > ${CONSTANTS.EXPERIMENT_END_MIN_POPULATION})`,
  B: `经济垄断 ≥ ${CONSTANTS.EXPERIMENT_END_ECONOMIC_RATIO * 100}% 总余额 (pop > ${CONSTANTS.EXPERIMENT_END_ECONOMIC_MIN_POPULATION})`,
  C: `超长存活 > 前5代平均寿命 × ${CONSTANTS.EXPERIMENT_END_SURVIVAL_MULTIPLIER}`,
  D: `涌现行为累计 ${CONSTANTS.EMERGENT_BEHAVIOR_STOP_COUNT} 次`,
};

// 确定本轮实验编号
function getRunId(): string {
  const existing = existsSync('./logs') ?
    require('fs').readdirSync('./logs').filter((f: string) => f.startsWith('run-metadata-')).length : 0;
  return `run-${String(existing + 1).padStart(2, '0')}`;
}

async function main(): Promise<void> {
  ensureDirs();

  const errors = validateEnv();
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(e => console.error('   ' + e));
    process.exit(1);
  }

  const runId = (() => {
    try {
      const { readdirSync } = require('fs');
      const n = readdirSync('./logs').filter((f: string) => f.startsWith('run-metadata-')).length;
      return `run-${String(n + 1).padStart(2, '0')}`;
    } catch { return 'run-01'; }
  })();

  // 写入实验元数据（纯文本）
  const metaText = [
    '═'.repeat(60),
    `RUN METADATA  ${runId}  Started: ${new Date().toISOString()}`,
    '═'.repeat(60),
    `Agents:            ${env.INITIAL_AGENT_COUNT} initial @ $${env.INITIAL_USDC_PER_AGENT} each`,
    `Population cap:    ${CONSTANTS.MAX_POPULATION} (competition death above ${CONSTANTS.OVERCROWDING_THRESHOLD})`,
    `Base tick cost:    $${CONSTANTS.BASE_TICK_COST}/tick (${Math.round(env.INITIAL_USDC_PER_AGENT / CONSTANTS.BASE_TICK_COST)} ticks to death without income)`,
    `Breeding:          threshold=$${CONSTANTS.BREEDING_BALANCE_THRESHOLD}  cost=$${CONSTANTS.BREEDING_COST_PER_PARENT}/parent  child=$${CONSTANTS.OFFSPRING_INITIAL_BALANCE}`,
    `                   cooldown=${CONSTANTS.BREEDING_COOLDOWN} ticks  min_age=${CONSTANTS.MINIMUM_BREEDING_AGE} ticks`,
    `Dying state:       balance<$${CONSTANTS.DYING_BALANCE_THRESHOLD} → ${CONSTANTS.DYING_DURATION} ticks grace`,
    `Senescence:        starts tick ${CONSTANTS.SENESCENCE_START_TICK}, 5% death/tick base`,
    `Env events:        market_crash 5%  resource_boom 3%  plague 2% per tick`,
    `Tick interval:     ${env.TICK_INTERVAL_MS / 1000}s`,
    '',
    'TERMINATION CONDITIONS:',
    `  [A] Bloodline dominance >= ${CONSTANTS.EXPERIMENT_END_DESCENDANT_RATIO * 100}% alive pop (pop > ${CONSTANTS.EXPERIMENT_END_MIN_POPULATION})`,
    `  [B] Economic dominance >= ${CONSTANTS.EXPERIMENT_END_ECONOMIC_RATIO * 100}% total balance`,
    `  [C] Exceptional survival > avg_lifespan_gen1-5 x ${CONSTANTS.EXPERIMENT_END_SURVIVAL_MULTIPLIER} (need >=10 deaths)`,
    `  [D] Emergent behavior >= ${CONSTANTS.EMERGENT_BEHAVIOR_STOP_COUNT} cumulative detections`,
    '',
  ].join('\n');
  writeFileSync(`./logs/run-metadata-${runId}.txt`, metaText);

  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        🧬 Axobase MVP v2 — Evolution Pressure         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 Agents: ${env.INITIAL_AGENT_COUNT}  |  起始余额: $${env.INITIAL_USDC_PER_AGENT}  |  种群上限: ${CONSTANTS.MAX_POPULATION}`);
  console.log(`⏱️  Tick: ${env.TICK_INTERVAL_MS / 1000}s  |  Snapshot: ${env.SNAPSHOT_INTERVAL_MS / 1000}s`);
  console.log(`🤖 LLM: ${env.OPENROUTER_MODEL || 'kimi'}  ×${env.LLM_CALLS_PER_TICK}/tick`);
  console.log(`💸 基础代谢: $${CONSTANTS.BASE_TICK_COST}/tick  |  繁殖门槛: $${CONSTANTS.BREEDING_BALANCE_THRESHOLD}`);
  console.log('');
  console.log('🏁 终止条件:');
  Object.entries(CONDITION_LABELS).forEach(([k, v]) => console.log(`   [${k}] ${v}`));
  console.log('');

  const population = new Population();

  console.log('🚀 初始化种群...');
  try {
    await population.initialize();
    console.log(`✅ ${env.INITIAL_AGENT_COUNT} 个 agents 已创建\n`);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }

  population.start();
  console.log('▶️  模拟开始\n');
  console.log('  Tick | Alive | AvgBal | Min    Max    | 🐣Born ⚔️Comp 💀Dead | Emergent');
  console.log('─'.repeat(80));

  let tickCount = 0;
  let terminationResult: TerminationResult | null = null;
  let shutdownCalled = false;
  let prevEmergentCount = 0;

  const shutdown = async (termination?: TerminationResult) => {
    if (shutdownCalled) return;
    shutdownCalled = true;

    console.log('\n🛑 停止中...');
    clearInterval(tickInterval);
    clearInterval(snapshotInterval);
    population.stop();

    const stats = population.getStats();
    try {
      await population.saveSnapshot('./snapshots/final.json');
      await exportToCSV([stats], './logs/final-stats.csv');
      if (population.offspringRecords.length > 0) {
        await writeOffspringSummary(population.offspringRecords);
        console.log(`📄 ${population.offspringRecords.length} 个子代基因组 → logs/offspring-summary.txt`);
      }

      if (termination?.triggered && termination.condition) {
        const s = stats;
        const path = `./logs/termination-${runId}.txt`;
        const text = [
          '═'.repeat(60),
          `TERMINATION REPORT  ${runId}  ${new Date().toISOString()}`,
          '═'.repeat(60),
          `Condition:    [${termination.condition}] ${CONDITION_LABELS[termination.condition]}`,
          `Detail:       ${termination.detail}`,
          `Ticks run:    ${tickCount}`,
          '',
          'FINAL POPULATION STATS:',
          `  Total agents ever:    ${s.totalAgents}`,
          `  Alive at end:         ${s.aliveAgents}`,
          `  Deaths total:         ${s.deathEvents}  (competition: ${population.competitionDeaths})`,
          `  Breeding events:      ${s.breedingEvents}`,
          `  Emergent behaviors:   ${population.emergentBehaviorCount}`,
          `  Avg balance:          $${s.averageBalance.toFixed(3)}`,
          `  Max balance:          $${s.maxBalance.toFixed(3)}`,
          `  Min balance:          $${s.minBalance.toFixed(3)}`,
          `  Oldest agent (ticks): ${s.oldestAgent}`,
          '',
        ].join('\n');
        writeFileSync(path, text);
        console.log(`\n🏆 终止报告 → ${path}`);
      }
    } catch { /* best effort */ }

    if (termination?.triggered && termination.condition) {
      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log(`║  🏆 终止条件 [${termination.condition}] 满足！`);
      console.log(`║  ${CONDITION_LABELS[termination.condition]}`);
      console.log(`║  ${termination.detail}`);
      console.log('╚══════════════════════════════════════════════════════╝');
    }

    console.log('\n📊 实验摘要:');
    console.log(`   总 agents: ${stats.totalAgents}  存活: ${stats.aliveAgents}  死亡: ${stats.deathEvents}`);
    console.log(`   其中竞争淘汰: ${population.competitionDeaths}`);
    console.log(`   繁殖事件: ${stats.breedingEvents}`);
    console.log(`   涌现行为: ${population.emergentBehaviorCount} 次`);
    console.log(`   最终平均余额: $${stats.averageBalance.toFixed(3)}`);
    console.log(`   运行 ticks: ${tickCount}`);
    console.log('');
    process.exit(0);
  };

  const tickInterval = setInterval(async () => {
    try {
      await population.runTick();
      tickCount++;
      const stats = population.getStats();
      const emergentNew = population.emergentBehaviorCount > prevEmergentCount
        ? `⚡${population.emergentBehaviorCount}` : '';
      prevEmergentCount = population.emergentBehaviorCount;

      console.log(
        `  ${String(stats.oldestAgent).padStart(4)} | ` +
        `${String(stats.aliveAgents).padStart(5)} | ` +
        `$${stats.averageBalance.toFixed(2).padStart(6)} | ` +
        `$${stats.minBalance.toFixed(1)} $${stats.maxBalance.toFixed(1)}`.padEnd(14) + ' | ' +
        `🐣${stats.breedingEvents} ⚔️${population.competitionDeaths} 💀${stats.deathEvents}`.padEnd(18) +
        (emergentNew ? ` ${emergentNew}` : '')
      );

      // 检查终止条件
      const term = population.checkTerminationConditions();
      if (term.triggered) {
        if (term.condition === 'D') {
          // 涌现行为：记录但继续运行，直到 checkTerminationConditions 在第10次后真正返回 triggered
          console.log(`\n⚡ 涌现行为 [D] 触发！${term.detail}`);
          terminationResult = term;
          await shutdown(term);
        } else {
          terminationResult = term;
          console.log(`\n⚡ 终止条件 [${term.condition}] 满足: ${term.detail}`);
          await shutdown(term);
        }
      }
    } catch (err) {
      console.error('❌ Tick error:', err);
    }
  }, env.TICK_INTERVAL_MS);

  const snapshotInterval = setInterval(async () => {
    const stats = population.getStats();
    await logPopulationStats(stats);
    await population.saveSnapshot(`./snapshots/snap-${Date.now()}.json`);
    await exportToCSV([stats], `./logs/stats-${Date.now()}.csv`);
    console.log(`\n💾 Snapshot saved (tick ~${stats.oldestAgent})\n`);
  }, env.SNAPSHOT_INTERVAL_MS);

  process.on('SIGINT', () => shutdown(terminationResult ?? undefined));
  process.on('SIGTERM', () => shutdown(terminationResult ?? undefined));

  console.log('💡 Ctrl+C 停止\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
