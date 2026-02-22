/**
 * Environment Configuration
 */

import 'dotenv/config';

export const env = {
  CHAIN: process.env.CHAIN || 'base-sepolia',
  BASE_RPC_URL: process.env.BASE_RPC_URL || 'https://sepolia.base.org',
  MASTER_WALLET_PRIVATE_KEY: process.env.MASTER_WALLET_PRIVATE_KEY || '',
  
  INITIAL_AGENT_COUNT: parseInt(process.env.INITIAL_AGENT_COUNT || '5', 10),
  INITIAL_USDC_PER_AGENT: parseInt(process.env.INITIAL_USDC_PER_AGENT || '10', 10),
  TICK_INTERVAL_MS: parseInt(process.env.TICK_INTERVAL_MS || '600000', 10),
  
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct',
  
  ENABLE_ARWEAVE: process.env.ENABLE_ARWEAVE === 'true',
  IRYS_PRIVATE_KEY: process.env.IRYS_PRIVATE_KEY || '',
  
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  SNAPSHOT_INTERVAL_MS: parseInt(process.env.SNAPSHOT_INTERVAL_MS || '3600000', 10),
};

export const validateEnv = (): string[] => {
  const errors: string[] = [];
  
  if (!env.OPENROUTER_API_KEY) {
    errors.push('OPENROUTER_API_KEY is required');
  }
  
  return errors;
};
