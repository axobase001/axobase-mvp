/**
 * Arweave Tools
 * Memory inscription (optional, MVP uses local file fallback)
 */

import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
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

const ensureLogsDir = (): void => {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
};

export const inscribeMemory = async (data: MemoryData): Promise<string> => {
  if (env.ENABLE_ARWEAVE) {
    return inscribeToArweave(data);
  }
  return writeToLocalFile(data);
};

const writeToLocalFile = async (data: MemoryData): Promise<string> => {
  ensureLogsDir();
  
  const filename = `${LOGS_DIR}/memory-${data.agentId}-${data.tick}.json`;
  await writeFile(filename, JSON.stringify(data, null, 2));
  
  return `local://${filename}`;
};

const inscribeToArweave = async (_data: MemoryData): Promise<string> => {
  // DECISION: Arweave integration deferred to post-MVP
  // Would use Irys/Bundlr SDK here
  throw new Error('Arweave not implemented in MVP');
};

export const inscribeMemoryBatch = async (dataArray: MemoryData[]): Promise<string[]> => {
  return Promise.all(dataArray.map(data => inscribeMemory(data)));
};
