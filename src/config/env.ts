/**
 * Environment Configuration
 */

import 'dotenv/config';

export const env = {
  CHAIN: process.env.CHAIN || 'base-sepolia',
  BASE_RPC_URL: process.env.BASE_RPC_URL || 'https://sepolia.base.org',
  MASTER_WALLET_PRIVATE_KEY: process.env.MASTER_WALLET_PRIVATE_KEY || '',

  INITIAL_AGENT_COUNT: parseInt(process.env.INITIAL_AGENT_COUNT || '5', 10),
  INITIAL_USDC_PER_AGENT: parseFloat(process.env.INITIAL_USDC_PER_AGENT || '15'),

  // Fast defaults for local testing
  TICK_INTERVAL_MS: parseInt(process.env.TICK_INTERVAL_MS || '60000', 10),
  SNAPSHOT_INTERVAL_MS: parseInt(process.env.SNAPSHOT_INTERVAL_MS || '300000', 10),

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct',
  KIMI_API_KEY: process.env.KIMI_API_KEY || '',

  LLM_CALLS_PER_TICK: parseInt(process.env.LLM_CALLS_PER_TICK || '1', 10),
  MIN_LLM_INTERVAL_MS: parseInt(process.env.MIN_LLM_INTERVAL_MS || '2000', 10),

  ENABLE_ARWEAVE: process.env.ENABLE_ARWEAVE === 'true',
  IRYS_PRIVATE_KEY: process.env.IRYS_PRIVATE_KEY || '',

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

export const validateEnv = (): string[] => {
  const errors: string[] = [];

  if (!env.OPENROUTER_API_KEY && !env.KIMI_API_KEY) {
    errors.push('需要 OPENROUTER_API_KEY 或 KIMI_API_KEY');
  }

  return errors;
};
