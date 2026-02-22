/**
 * Axobase MVP Entry Point
 * Main simulation with HTTP API
 */

import { Population } from './runtime/population.js';
import { logPopulationStats, exportToCSV } from './runtime/logger.js';
import { env, validateEnv } from './config/env.js';
import { CONSTANTS } from './config/constants.js';
import { createAPIServer } from './api.js';

const TICK_INTERVAL = env.TICK_INTERVAL_MS;
const SNAPSHOT_INTERVAL = env.SNAPSHOT_INTERVAL_MS;

async function main(): Promise<void> {
  const errors = validateEnv();
  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    process.exit(1);
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║           🧬 Axobase MVP - Real Simulation             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 Initial agents: ${env.INITIAL_AGENT_COUNT}`);
  console.log(`⏱️  Tick interval: ${TICK_INTERVAL / 1000}s`);
  console.log(`🔗 Chain: ${env.CHAIN}`);
  console.log(`🤖 LLM: ${env.OPENROUTER_MODEL}`);
  console.log('');

  const population = new Population();
  
  // Initialize population
  console.log('🚀 Initializing population...');
  try {
    await population.initialize();
    console.log(`✅ ${env.INITIAL_AGENT_COUNT} agents created`);
  } catch (error) {
    console.error('❌ Failed to initialize:', error);
    process.exit(1);
  }

  // Start API server
  console.log('');
  createAPIServer(population);

  // Start simulation
  population.start();
  console.log('▶️  Simulation started');
  console.log('');

  // Setup intervals
  const tickInterval = setInterval(async () => {
    await population.runTick();
  }, TICK_INTERVAL);

  const snapshotInterval = setInterval(async () => {
    const stats = population.getStats();
    await logPopulationStats(stats);
    console.log(`📈 Tick ${stats.oldestAgent.toString().padStart(4)} | ` +
                `Alive: ${stats.aliveAgents}/${stats.totalAgents} | ` +
                `Avg: $${stats.averageBalance.toFixed(2)} | ` +
                `🐣 ${stats.breedingEvents} | 💀 ${stats.deathEvents}`);
  }, SNAPSHOT_INTERVAL);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('');
    console.log('🛑 Shutting down...');
    clearInterval(tickInterval);
    clearInterval(snapshotInterval);
    population.stop();
    
    await population.saveSnapshot('./snapshots/final.json');
    
    const stats = population.getStats();
    await exportToCSV([stats], './logs/final-stats.csv');
    
    console.log('💾 Final snapshot saved');
    console.log('');
    console.log('📊 Simulation Summary:');
    console.log(`   Total agents created: ${stats.totalAgents}`);
    console.log(`   Alive: ${stats.aliveAgents}`);
    console.log(`   Deaths: ${stats.deathEvents}`);
    console.log(`   Breeding events: ${stats.breedingEvents}`);
    console.log(`   Final avg balance: $${stats.averageBalance.toFixed(2)}`);
    console.log('');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('💡 Press Ctrl+C to stop');
  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
