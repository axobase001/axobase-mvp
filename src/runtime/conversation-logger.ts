/**
 * Log Writer — Plain Text Format
 * 所有日志以可读纯文本追加，便于上传 LLM 分析
 *
 * 文件列表:
 *   logs/conversations.txt   — 每次 LLM 对话完整记录
 *   logs/offspring.txt       — 每个子代出生记录
 *   logs/tombstones.txt      — 每个死亡个体墓碑
 *   logs/events.txt          — 环境事件 + 涌现行为
 *   logs/memory-{id}.txt     — 每个 agent 的思维日志（追加）
 */

import { appendFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const LOGS_DIR = './logs';
const ensure = () => { if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true }); };

const sep = (char = '─', len = 60) => char.repeat(len);
const append = (file: string, text: string) => { ensure(); appendFileSync(file, text); };

// ─── Conversation ─────────────────────────────────────────────────────────────

export interface ConversationRecord {
  timestamp: number;
  agentId: string;
  agentShortId: string;
  tick: number;
  callIndex: number;
  model: string;
  costUSD: number;
  balance: number;
  prompt: string;
  response: string;
  decision: { strategyType: string; reasoning: string; confidence: number };
}

export const logConversation = async (r: ConversationRecord): Promise<void> => {
  const ts = new Date(r.timestamp).toISOString();
  const text = [
    '',
    sep('═'),
    `CONVERSATION  Agent: ${r.agentId.slice(0, 12)}  Tick: ${r.tick}  Call: ${r.callIndex}`,
    `Time: ${ts}  Model: ${r.model}  Cost: $${r.costUSD.toFixed(5)}  Balance: $${r.balance.toFixed(3)}`,
    sep(),
    'PROMPT:',
    r.prompt.trim(),
    sep(),
    'RESPONSE:',
    r.response.trim(),
    sep(),
    `DECISION  Strategy: ${r.decision.strategyType}  Confidence: ${(r.decision.confidence * 100).toFixed(0)}%`,
    `Reasoning: ${r.decision.reasoning}`,
    '',
  ].join('\n');
  append(`${LOGS_DIR}/conversations.txt`, text);
};

// ─── Offspring ────────────────────────────────────────────────────────────────

export interface OffspringRecord {
  timestamp: number;
  offspringId: string;
  parent1Id: string;
  parent2Id: string;
  generation: number;
  initialBalance: number;
  genomeHash: string;
  totalGenes: number;
  chromosomeSummary: Array<{
    name: string; geneCount: number; avgValue: number;
    keyGenes: Array<{ name: string; value: number; origin: string }>;
  }>;
  expressedTraits: Record<string, number>;
}

const bar = (v: number) => '█'.repeat(Math.round(v * 10)).padEnd(10, '░') + ` ${(v * 100).toFixed(0)}%`;

export const logOffspring = async (r: OffspringRecord): Promise<void> => {
  const ts = new Date(r.timestamp).toISOString();
  const lines = [
    '',
    sep('═'),
    `OFFSPRING  ID: ${r.offspringId.slice(0, 12)}  Gen: ${r.generation}  Born: ${ts}`,
    `Parents: ${r.parent1Id.slice(0, 10)} × ${r.parent2Id.slice(0, 10)}`,
    `Balance: $${r.initialBalance}  Genes: ${r.totalGenes}  Hash: ${r.genomeHash.slice(0, 20)}`,
    sep(),
    'EXPRESSED TRAITS:',
    ...Object.entries(r.expressedTraits).map(([k, v]) =>
      `  ${k.padEnd(24)} ${bar(v)}`
    ),
    sep(),
    'CHROMOSOMES:',
    ...r.chromosomeSummary.map(c => {
      const top = c.keyGenes.map(g => `${g.name}=${g.value.toFixed(2)}(${g.origin})`).join('  ');
      return `  [${c.name.padEnd(16)}] ${c.geneCount} genes  avg=${c.avgValue.toFixed(2)}  top: ${top}`;
    }),
    '',
  ];
  append(`${LOGS_DIR}/offspring.txt`, lines.join('\n'));
};

export const writeOffspringSummary = async (records: OffspringRecord[]): Promise<void> => {
  const lines = [
    sep('═'),
    `OFFSPRING SUMMARY  Total: ${records.length}  Generated: ${new Date().toISOString()}`,
    sep('═'),
    '',
  ];
  for (const r of records) {
    lines.push(`  Gen${r.generation}  ${r.offspringId.slice(0, 12)}  parents: ${r.parent1Id.slice(0, 8)} × ${r.parent2Id.slice(0, 8)}  $${r.initialBalance}  genes: ${r.totalGenes}`);
  }
  lines.push('');
  writeFileSync(`${LOGS_DIR}/offspring-summary.txt`, lines.join('\n'));
};
