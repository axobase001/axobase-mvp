/**
 * HTTP API Server
 * Provides endpoints for the web dashboard
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Population } from './runtime/population.js';
import { logPopulationStats } from './runtime/logger.js';

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
    // Handle CORS preflight
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
        version: '0.1.0',
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
      sendJson(res, population.getStats());
      return;
    }

    // Get agents
    if (url === '/api/agents' && method === 'GET') {
      if (!population) {
        sendError(res, 'Population not initialized', 503);
        return;
      }
      
      const agents = Array.from(population.agents.values()).map(agent => ({
        id: agent.id,
        balance: agent.balanceUSDC,
        age: agent.age,
        stage: agent.stage,
        status: agent.isAlive ? 'alive' : 'dead',
        genomeHash: agent.genomeHash.substring(0, 16) + '...',
      }));
      
      sendJson(res, agents);
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
    console.log(`   • GET  /           - Health check`);
    console.log(`   • GET  /api/stats  - Population statistics`);
    console.log(`   • GET  /api/agents - Agent list`);
    console.log(`   • POST /api/control - Control simulation`);
  });

  return server;
};

export { isRunning };
