/**
 * HTTP API Server
 * Provides endpoints for the web dashboard with real cost data
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Population } from './runtime/population.js';
import { logPopulationStats } from './runtime/logger.js';
import { DAILY_SCENARIOS, DAILY_COSTS } from './config/costs.js';
import { getDailyDeFiEvents, getGlobalActiveEvents } from './lifecycle/survival.js';
import { getDeFiEventSummary } from './environment/defi-events.js';
import { getModelPricingInfo } from './decision/inference.js';

let population: Population | null = null;
let isRunning = false;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const sendJson = (res: ServerResponse, data: unknown, status = 200) => {
  res.writeHead(status, corsHeaders);
  res.end(JSON.stringify(data));
};

const sendError = (res: ServerResponse, message: string, status = 400) => {
  sendJson(res, { error: message }, status);
};

export const createAPIServer = (pop: Population, port = 3001) => {
  population = pop;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(200, corsHeaders);
      res.end();
      return;
    }

    const url = req.url || '/';
    const method = req.method || 'GET';

    // Health check
    if (url === '/' && method === 'GET') {
      sendJson(res, { 
        status: 'ok', 
        service: 'Axobase API',
        version: '0.2.0',
        tickRate: '1 day per tick',
        population: population ? 'initialized' : 'not initialized',
        isRunning 
      });
      return;
    }

    // Get stats
    if (url === '/api/stats' && method === 'GET') {
      if (!population) {
        sendError(res, 'Population not initialized', 503);
        return;
      }
      
      const stats = population.getStats();
      sendJson(res, {
        ...stats,
        costs: DAILY_SCENARIOS.STANDARD,
        activeEvents: getGlobalActiveEvents().length,
        activeDeFi: getDailyDeFiEvents().length,
      });
      return;
    }

    // Get agents with detailed info
    if (url === '/api/agents' && method === 'GET') {
      if (!population) {
        sendError(res, 'Population not initialized', 503);
        return;
      }
      
      const agents = Array.from(population.agents.values()).map(agent => {
        const state = (agent as any).survivalState;
        return {
          id: agent.id,
          balance: agent.balanceUSDC,
          age: agent.age,
          stage: agent.stage,
          status: agent.isAlive ? 'alive' : 'dead',
          genomeHash: agent.genomeHash.substring(0, 16) + '...',
          totalSpent: state?.totalSpent || {},
          totalEarned: state?.totalEarned || {},
        };
      });
      
      sendJson(res, agents);
      return;
    }

    // Get cost breakdown
    if (url === '/api/costs' && method === 'GET') {
      sendJson(res, {
        daily: DAILY_COSTS,
        scenarios: DAILY_SCENARIOS,
        llmPricing: getModelPricingInfo(),
      });
      return;
    }

    // Get DeFi opportunities
    if (url === '/api/defi' && method === 'GET') {
      sendJson(res, {
        available: getDeFiEventSummary(),
        active: getDailyDeFiEvents().map(e => ({
          name: e.name,
          type: e.type,
          minCapital: e.minCapital,
          apy: `${((e.dailyYieldMin * 365) * 100).toFixed(0)}-${((e.dailyYieldMax * 365) * 100).toFixed(0)}%`,
          risk: e.riskLevel < 0.3 ? '低' : e.riskLevel < 0.6 ? '中' : '高',
        })),
      });
      return;
    }

    // Control simulation
    if (url === '/api/control' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { action } = JSON.parse(body);
          
          switch (action) {
            case 'start':
              if (population && !isRunning) {
                population.start();
                isRunning = true;
              }
              sendJson(res, { success: true, action: 'start', isRunning });
              break;
              
            case 'stop':
              if (population && isRunning) {
                population.stop();
                isRunning = false;
              }
              sendJson(res, { success: true, action: 'stop', isRunning });
              break;
              
            case 'reset':
              if (population) {
                population.stop();
                await population.initialize();
                isRunning = false;
              }
              sendJson(res, { success: true, action: 'reset' });
              break;
              
            default:
              sendError(res, 'Invalid action', 400);
          }
        } catch {
          sendError(res, 'Invalid JSON', 400);
        }
      });
      return;
    }

    // 404
    sendError(res, 'Not found', 404);
  });

  server.listen(port, () => {
    console.log(`🌐 API Server running on http://localhost:${port}`);
    console.log(`   Endpoints:`);
    console.log(`   • GET  /              - Health check`);
    console.log(`   • GET  /api/stats     - Population statistics`);
    console.log(`   • GET  /api/agents    - Agent list with cost/earning data`);
    console.log(`   • GET  /api/costs     - Daily cost breakdown`);
    console.log(`   • GET  /api/defi      - DeFi opportunities`);
    console.log(`   • POST /api/control   - Control simulation`);
  });

  return server;
};

export { isRunning };
