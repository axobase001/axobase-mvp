/**
 * Structured Logger
 * Records agent and population events
 */

import { writeFile, appendFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

const LOGS_DIR = './logs';
const SNAPSHOTS_DIR = './snapshots';

const ensureDirs = (): void => {
  if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });
  if (!existsSync(SNAPSHOTS_DIR)) mkdirSync(SNAPSHOTS_DIR, { recursive: true });
};

export interface TickLog {
  timestamp: number;
  agentId: string;
  tick: number;
  balance: number;
  action: {
    strategyId: string;
    success: boolean;
    costUSDC: number;
    details: unknown;
  };
  genome: {
    totalGenes: number;
    metabolicCost: number;
    expressionHash: string;
  };
  signals: {
    sent: string[];
    received: string[];
  };
}

export const logTick = async (log: TickLog): Promise<void> => {
  ensureDirs();
  const logLine = JSON.stringify(log) + '\n';
  await appendFile(`${LOGS_DIR}/agent-${log.agentId}.jsonl`, logLine);
};

export const logPopulationStats = async (stats: unknown): Promise<void> => {
  ensureDirs();
  const timestamp = Date.now();
  await writeFile(`${SNAPSHOTS_DIR}/population-${timestamp}.json`, JSON.stringify(stats, null, 2));
};

export const exportToCSV = async (statsArray: unknown[], path: string): Promise<void> => {
  if (statsArray.length === 0) return;
  
  const first = statsArray[0] as Record<string, unknown>;
  const headers = Object.keys(first);
  
  const lines = statsArray.map(stat => {
    const s = stat as Record<string, unknown>;
    return headers.map(h => {
      const val = s[h];
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }).join(',');
  });
  
  const csv = [headers.join(','), ...lines].join('\n');
  await writeFile(path, csv);
};
