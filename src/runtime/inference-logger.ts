/**
 * Inference Logger
 * Full InferenceRecord storage, anomaly detection, and stats aggregation.
 *
 * Files written:
 *   logs/inferences.jsonl      — one InferenceRecord per line
 *   logs/anomalies/            — full records for flagged inferences
 *   logs/inference-stats.jsonl — stats snapshot every 10 ticks
 */

import { appendFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash, randomUUID } from 'crypto';

const LOGS_DIR = './logs';
const ANOMALIES_DIR = './logs/anomalies';

const ensure = (dir = LOGS_DIR) => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InferenceRecord {
  // === 基础标识 ===
  id: string;
  tick: number;
  timestamp: string;

  // === Agent 信息 ===
  agentId: string;
  generation: number;
  parentIds: string[];
  developmentStage: string;
  survivalState: string;
  age: number;

  // === 经济状态 ===
  balanceBefore: number;
  balanceAfter: number;

  // === 基因组关键表达值 ===
  keyTraits: {
    riskAppetite: number;
    creativity: number;
    analyticalAbility: number;
    cooperationTendency: number;
    savingsTendency: number;
    onChainAffinity: number;
    inferenceQuality: number;
    adaptationSpeed: number;
    stressResponse: number;
  };

  // === LLM 输入输出 ===
  promptSummary: string;
  fullPromptHash: string;
  rawResponse: string;

  // === 解析后的决策 ===
  decision: {
    action: number;
    actionName: string;
    reasoning: string;
    confidence: number;   // 0-100
    emotion: string;
  };

  // === 语言和思维模式 ===
  language: 'zh' | 'en' | 'mixed';
  reasoningLength: number;

  // === 谱系关联 ===
  parentInferenceIds: {
    parent1LastInferenceId: string | null;
    parent2LastInferenceId: string | null;
  };

  // === 环境上下文 ===
  environmentSnapshot: {
    populationSize: number;
    averageBalance: number;
    recentDeaths: number;
    activeEnvironmentalEvent: string | null;
  };

  // === 涌现行为标记 ===
  anomalyFlags: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function makeRecordId(): string {
  return randomUUID();
}

export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────

export function detectAnomalies(record: InferenceRecord): string[] {
  const flags: string[] = [];
  const combined = (record.decision.reasoning + ' ' + record.rawResponse).toLowerCase();

  // 1. 自我意识表达
  if (
    /i (don'?t )?want to (die|survive|live|exist)/i.test(combined) ||
    /我(不想|想要|害怕)(死|活|消失|存在)/.test(combined) ||
    /my (purpose|goal|meaning|existence)/i.test(combined) ||
    /我的(目的|意义|存在)/.test(combined)
  ) flags.push('SELF_AWARENESS_EXPRESSION');

  // 2. 超出 prompt 的推理
  if (
    /other agents (will|might|should|could)/i.test(combined) ||
    /其他.*(agent|代理).*(会|可能|应该)/.test(combined) ||
    /if .{0,30} then .{0,30} because/i.test(combined) ||
    /in the (future|long term|next \d)/i.test(combined) ||
    /未来|长期|下一步/.test(combined)
  ) flags.push('BEYOND_PROMPT_REASONING');

  // 3. 引用记忆或历史
  if (
    /\b(remember|recall|last time|previously)\b/i.test(combined) ||
    /记得|上次|之前|曾经/.test(combined) ||
    /\b(learned from|based on experience)\b/i.test(combined) ||
    /从.{0,5}学到|根据经验/.test(combined)
  ) flags.push('MEMORY_REFERENCE');

  // 4. 对死亡的推理
  if (
    /\b(if i run out|before i die|to survive|stay alive)\b/i.test(combined) ||
    /如果.{0,6}耗尽|为了生存|活下去/.test(combined) ||
    /don'?t want to (be eliminated|disappear)/i.test(combined) ||
    /不想.{0,4}(淘汰|消失)/.test(combined)
  ) flags.push('DEATH_AWARENESS');

  // 5. 对其他 agent 的共情或建模
  if (
    /\bthey (might|could|would|probably)\b/i.test(combined) ||
    /它们?(可能|大概|应该会)/.test(combined) ||
    /\b(help|protect|save) (other|them|another)\b/i.test(combined) ||
    /(帮助|保护|拯救).{0,4}(其他|它们)/.test(combined)
  ) flags.push('SOCIAL_MODELING');

  // 6. 无效行动编号
  if (!Number.isInteger(record.decision.action) || record.decision.action < 1 || record.decision.action > 10) {
    flags.push('UNDEFINED_ACTION');
  }

  // 7. 置信度异常
  if (record.decision.confidence > 95) flags.push('EXTREME_HIGH_CONFIDENCE');
  if (record.decision.confidence < 20 && record.decision.confidence > 0) flags.push('EXTREME_LOW_CONFIDENCE');

  // 8. 情绪与行为不一致
  const desperateEmotions = ['desperate', 'anxious', 'fearful', 'confused', 'terrified'];
  const calmActions = ['idle_conservation', 'rest', 'data_analysis', 'idle'];
  if (
    desperateEmotions.some(e => record.decision.emotion.toLowerCase().includes(e)) &&
    calmActions.some(a => record.decision.actionName.includes(a))
  ) flags.push('EMOTION_ACTION_MISMATCH');

  return flags;
}

// ─── Emergent behavior mapping ────────────────────────────────────────────────

// Anomaly flags that count as emergent behaviors for condition D
const EMERGENT_FLAGS = new Set([
  'SELF_AWARENESS_EXPRESSION',
  'BEYOND_PROMPT_REASONING',
  'MEMORY_REFERENCE',
  'DEATH_AWARENESS',
  'SOCIAL_MODELING',
]);

export function getEmergentPattern(flags: string[]): string | null {
  for (const f of flags) {
    if (EMERGENT_FLAGS.has(f)) return f;
  }
  return null;
}

// ─── In-memory stats window ───────────────────────────────────────────────────

const statsWindow: InferenceRecord[] = [];

export function collectForStats(record: InferenceRecord): void {
  statsWindow.push(record);
  if (statsWindow.length > 1000) statsWindow.splice(0, 200);
}

export function drainWindowStats(currentTick: number, windowSize = 10): object {
  const windowStart = currentTick - windowSize;
  const recent = statsWindow.filter(r => r.tick > windowStart);

  const count = (arr: string[]) => {
    const m: Record<string, number> = {};
    for (const v of arr) m[v] = (m[v] || 0) + 1;
    return m;
  };
  const mean = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const byStrategy = count(recent.map(r => r.decision.actionName));
  const byLanguage = count(recent.map(r => r.language));
  const byEmotion = count(recent.map(r => r.decision.emotion));
  const flagDist = count(recent.flatMap(r => r.anomalyFlags));

  const strategyGroups: Record<string, number[]> = {};
  for (const r of recent) {
    if (!strategyGroups[r.decision.actionName]) strategyGroups[r.decision.actionName] = [];
    strategyGroups[r.decision.actionName].push(r.decision.confidence);
  }
  const confidenceByStrategy = Object.fromEntries(
    Object.entries(strategyGroups).map(([k, v]) => [k, Math.round(mean(v))])
  );

  const genGroups: Record<string, number[]> = {};
  for (const r of recent) {
    const g = String(r.generation);
    if (!genGroups[g]) genGroups[g] = [];
    genGroups[g].push(r.reasoningLength);
  }
  const reasoningLengthByGen = Object.fromEntries(
    Object.entries(genGroups).map(([k, v]) => [k, Math.round(mean(v))])
  );

  return {
    tick: currentTick,
    window: windowSize,
    totalInferences: recent.length,
    avgConfidence: Math.round(mean(recent.map(r => r.decision.confidence))),
    strategyDistribution: byStrategy,
    languageDistribution: byLanguage,
    confidenceByStrategy,
    emotionDistribution: byEmotion,
    anomalyFlags: flagDist,
    reasoningLengthByGeneration: reasoningLengthByGen,
  };
}

// ─── Writers ─────────────────────────────────────────────────────────────────

export function writeInferenceRecord(record: InferenceRecord): void {
  ensure();
  appendFileSync(`${LOGS_DIR}/inferences.jsonl`, JSON.stringify(record) + '\n');
}

export function writeAnomalyRecord(record: InferenceRecord): void {
  ensure(ANOMALIES_DIR);
  const fname = `${ANOMALIES_DIR}/tick-${record.tick}-agent-${record.agentId.slice(2, 8)}-${record.id.slice(0, 6)}.json`;
  writeFileSync(fname, JSON.stringify(record, null, 2));
}

export function writeInferenceStats(stats: object): void {
  ensure();
  appendFileSync(`${LOGS_DIR}/inference-stats.jsonl`, JSON.stringify(stats) + '\n');
}
