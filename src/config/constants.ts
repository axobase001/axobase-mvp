/**
 * Global Constants - Axobase MVP 核心配置
 *
 * v2 修改：增加进化压力
 * - 种群容量上限 MAX_POPULATION: 30
 * - 濒死机制 DYING_BALANCE_THRESHOLD / DYING_DURATION
 * - 衰老机制 SENESCENCE_START_TICK
 * - 繁殖成本提高：门槛 15U，每方 5U
 * - BASE_TICK_COST: 0.8 (确保 30U 起步约 40 ticks 内死亡)
 */

export const CONSTANTS = {
  TICK_INTERVAL_MS: 4_000,
  SNAPSHOT_INTERVAL_MS: 20_000,
  CSV_EXPORT_INTERVAL_MS: 86_400_000,

  // ── 死亡阈值 ──────────────────────────────────────────────────────────────
  DEATH_BALANCE_THRESHOLD: 0.001,        // 余额归零时的紧急死亡
  DYING_BALANCE_THRESHOLD: 0.5,          // 余额低于此值 → 进入濒死状态
  DYING_DURATION: 5,                     // 濒死持续 N ticks 后死亡

  // ── 繁殖 (真实成本) ────────────────────────────────────────────────────────
  BREEDING_BALANCE_THRESHOLD: 15.0,      // 至少持有 15 USDC 才能繁殖
  BREEDING_COST_PER_PARENT: 5.0,         // 每个父母出 5 USDC
  OFFSPRING_INITIAL_BALANCE: 6.0,        // 子代获得 6 USDC（系统消耗 4U）
  BREEDING_COOLDOWN: 20,                 // 繁殖后冷却 20 ticks
  MINIMUM_BREEDING_AGE: 15,             // 至少存活 15 ticks 才能繁殖

  // ── 种群容量 ──────────────────────────────────────────────────────────────
  MAX_POPULATION: 30,                    // 种群硬上限
  OVERCROWDING_THRESHOLD: 25,            // 超过此数量触发竞争淘汰

  // ── 基础代谢成本 ──────────────────────────────────────────────────────────
  // 30 USDC / 0.8 per tick ≈ 37.5 ticks（不赚钱时约 40 tick 死亡）
  BASE_TICK_COST: 0.8,

  // ── 衰老 ──────────────────────────────────────────────────────────────────
  SENESCENCE_START_TICK: 500,            // 超过此 tick 后出现自然死亡概率
  SENESCENCE_BASE_DEATH_RATE: 0.05,      // 每 tick 5% 基础死亡率（越老越高）

  // ── 实验终止条件 ─────────────────────────────────────────────────────────
  EXPERIMENT_END_DESCENDANT_RATIO: 0.70, // 血统垄断：后代占 70% 存活种群
  EXPERIMENT_END_MIN_POPULATION: 30,     // 血统检查要求种群 > 30
  EXPERIMENT_END_ECONOMIC_RATIO: 0.80,   // 经济垄断：单个 agent 持有 80% 总资金
  EXPERIMENT_END_ECONOMIC_MIN_POPULATION: 10, // 经济垄断检查要求种群 > 10
  EXPERIMENT_END_SURVIVAL_MULTIPLIER: 5, // 存活超过前 5 代平均寿命的 5 倍
  EMERGENT_BEHAVIOR_STOP_COUNT: 10,      // 涌现行为触发 10 次后停止

  EMERGENCY_BALANCE_THRESHOLD: 1.0,

  // ── 发育阶段（合计 15 ticks 成年）────────────────────────────────────────
  NEONATE_DURATION: 5,
  JUVENILE_DURATION: 10,                 // 5 + 10 = 15 ticks → ADULT

  INITIAL_GENE_COUNT: 63,
  MAX_GENE_COUNT: 200,
  MIN_GENE_COUNT: 20,

  BASE_MUTATION_RATE: 0.02,
  BASE_DUPLICATION_RATE: 0.01,
  BASE_DELETION_RATE: 0.01,
  BASE_HGT_RATE: 0.001,
  BASE_DE_NOVO_RATE: 0.001,

  EARNINGS_CAP_PERCENT: 0.30,
  DEFI_MIN_LIQUID: 5.0,
} as const;

export type ConstantKey = keyof typeof CONSTANTS;
