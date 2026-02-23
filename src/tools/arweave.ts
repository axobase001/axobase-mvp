/**
 * Memory Log Writer
 * 每个 agent 一个 .txt 文件，每 5 tick 追加一次思维日志
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { env } from '../config/env.js';

export interface MemoryData {
  agentId: string;
  tick: number;
  timestamp: number;
  thoughts: unknown[];
  transactions: unknown[];
  genomeHash: string;
  balance: number;
}

const LOGS_DIR = './logs';
const ensure = () => { if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true }); };

export const inscribeMemory = async (data: MemoryData): Promise<string> => {
  if (env.ENABLE_ARWEAVE) return inscribeToArweave(data);
  return writeToLocalFile(data);
};

const writeToLocalFile = async (data: MemoryData): Promise<string> => {
  ensure();
  const file = `${LOGS_DIR}/memory-${data.agentId.slice(0, 10)}.txt`;
  const ts = new Date(data.timestamp).toISOString();
  const thoughts = (data.thoughts as string[]).join('\n  ');
  const text = [
    `${'─'.repeat(50)}`,
    `tick=${data.tick}  time=${ts}  balance=$${(data.balance as number).toFixed(3)}`,
    `genome=${data.genomeHash.toString().slice(0, 20)}`,
    `thoughts:`,
    `  ${thoughts || '(none)'}`,
    '',
  ].join('\n');
  appendFileSync(file, text);
  return `local://${file}`;
};

const inscribeToArweave = async (_data: MemoryData): Promise<string> => {
  throw new Error('Arweave not implemented in MVP');
};

export const inscribeMemoryBatch = async (dataArray: MemoryData[]): Promise<string[]> => {
  return Promise.all(dataArray.map(d => inscribeMemory(d)));
};
