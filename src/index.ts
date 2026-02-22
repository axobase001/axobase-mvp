/**
 * Axobase MVP Entry Point
 */

import { Population } from './runtime/population.js';
import { logPopulationStats, exportToCSV } from './runtime/logger.js';
import { env, validateEnv } from './config/env.js';
import { CONSTANTS } from './config/constants.js';

const TICK_INTERVAL = env.TICK_INTERVAL_MS;
const SNAPSHOT_INTERVAL = env.SNAPSHOT_INTERVAL_MS;

async function main(): Promise<void> {
  const errors = validateEnv();
  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    process.exit(1);
  }

  console.log('🧬 Axobase MVP Starting...');
  console.log(`📊 Initial agents: ${env.INITIAL_AGENT_COUNT}`);
  console.log(`⏱️  Tick interval: ${TICK_INTERVAL / 1000}s`);
  console.log(`🔗 Chain: ${env.CHAIN}`);

  const population = new Population();
  
  // Try to load existing snapshot
  try {
    // DECISION: For MVP, always start fresh
    await population.initialize();
    console.log('✅ Population initialized');
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }

  population.start();

  // Setup intervals
  const tickInterval = setInterval(async () => {
    await population.runTick();
  }, TICK_INTERVAL);

  const snapshotInterval = setInterval(async () => {
    const stats = population.getStats();
    await logPopulationStats(stats);
    console.log(`📈 Tick ${stats.oldestAgent}: ${stats.aliveAgents} alive, ${stats.deathEvents} dead`);
  }, SNAPSHOT_INTERVAL);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down...');
    clearInterval(tickInterval);
    clearInterval(snapshotInterval);
    population.stop();
    
    await population.saveSnapshot('./snapshots/final.json');
    
    const stats = population.getStats();
    await exportToCSV([stats], './logs/final-stats.csv');
    
    console.log('💾 Final snapshot saved');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('🚀 Running... Press Ctrl+C to stop');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
