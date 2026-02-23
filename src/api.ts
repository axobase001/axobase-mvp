/**
 * HTTP API Server
 * Provides endpoints for the web dashboard with real cost data
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Population } from './runtime/population.js';
import { logPopulationStats } from './runtime/logger.js';
import { DAILY_SCENARIOS, DAILY_COSTS } from './config/costs.js';
import { getDailyDeFiEvents, getGlobalActiveEvents } from './lifecycle/survival.js';
import { getDeFiEventSummary, DeFiPosition } from './environment/defi-events.js';
import { getModelPricingInfo } from './decision/inference.js';
import { umbilicalMonitor, assignAgentName, getAgentName, MaternalHealth } from './monitoring/umbilical-monitor.js';

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
      
      // Calculate aggregate capital stats across all agents
      let totalLocked = 0;
      let totalLiquid = 0;
      let totalPositions = 0;
      
      for (const agent of population.agents.values()) {
        const state = (agent as any).survivalState;
        if (state) {
          totalLocked += state.lockedCapital || 0;
          totalLiquid += state.liquidCapital || 0;
          totalPositions += state.defiPortfolio?.positions?.filter((p: { status: string }) => p.status === 'active').length || 0;
        }
      }
      
      sendJson(res, {
        ...stats,
        costs: DAILY_SCENARIOS.STANDARD,
        activeEvents: getGlobalActiveEvents().length,
        activeDeFi: getDailyDeFiEvents().length,
        capitalStats: {
          totalLocked: Math.round(totalLocked * 100) / 100,
          totalLiquid: Math.round(totalLiquid * 100) / 100,
          totalPositions,
          lockupRatio: totalLocked + totalLiquid > 0 ? totalLocked / (totalLocked + totalLiquid) : 0,
        },
      });
      return;
    }

    // Get agents with detailed info
    if (url === '/api/agents' && method === 'GET') {
      if (!population) {
        sendError(res, 'Population not initialized', 503);
        return;
      }
      
      // Get maternal health for display
      const maternalHealth = umbilicalMonitor.getMaternalHealth();
      
      const agents = Array.from(population.agents.values()).map(agent => {
        const state = (agent as any).survivalState;
        const portfolio = state?.defiPortfolio;
        const name = getAgentName(agent.id);
        
        return {
          id: agent.id,
          name: name,  // Bot名字
          balance: agent.balanceUSDC,
          liquidCapital: state?.liquidCapital || 0,
          lockedCapital: state?.lockedCapital || 0,
          age: agent.age,
          stage: agent.stage,
          status: agent.isAlive ? 'alive' : 'dead',
          genomeHash: agent.genomeHash.substring(0, 16) + '...',
          totalSpent: state?.totalSpent || {},
          totalEarned: state?.totalEarned || {},
          llmStats: {
            totalCalls: state?.totalLLMCalls || 0,
            callsThisTick: state?.llmCallsThisTick || 0,
            lastThinkingAgo: state?.lastLLMCallTime ? 
              Math.floor((Date.now() - state.lastLLMCallTime) / 1000) + 's ago' : 'never',
          },
          defiPositions: portfolio?.positions?.filter((p: { status: string }) => p.status === 'active').map((p: DeFiPosition) => ({
            name: p.eventName,
            type: p.type,
            invested: p.capitalInvested,
            accruedYield: Math.round(p.accumulatedYield * 100) / 100,
            maturesIn: Math.max(0, p.maturityTick - state.tick),
            canExit: state.tick >= p.maturityTick,
          })) || [],
        };
      });
      
      sendJson(res, {
        maternalHealth: {
          status: maternalHealth.status,
          statusEmoji: maternalHealth.status === 'healthy' ? '💚' : 
                       maternalHealth.status === 'stressed' ? '💛' : '❤️',
          apiCallsToday: maternalHealth.apiCallsToday,
          apiCallsLimit: maternalHealth.apiCallsLimit,
          apiCallsPercentage: Math.round(maternalHealth.apiCallsPercentage),
          averageLatencyMs: maternalHealth.averageLatencyMs,
          estimatedMonthlyCost: maternalHealth.estimatedMonthlyCost,
        },
        agents: agents,
      });
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
          lockupDays: e.lockupPeriodTicks,
          earlyExit: e.allowsEarlyExit 
            ? e.earlyExitPenalty > 0 
              ? `可提前退出 (${(e.earlyExitPenalty * 100).toFixed(0)}%罚金)` 
              : '可随时退出'
            : '锁仓期内不可退出',
          settlementDelay: e.settlementDelayTicks > 0 ? `${e.settlementDelayTicks}天结算期` : '即时结算',
        })),
      });
      return;
    }

    // === UMBILICAL MONITOR (脐带监测面板) ===
    if (url === '/api/monitor' && method === 'GET') {
      // 母体健康指标
      const maternalHealth = umbilicalMonitor.getMaternalHealth();
      
      // 胎儿神经活动
      let fetalActivity: ReturnType<typeof umbilicalMonitor.getFetalNeuralActivity>[] = [];
      if (population) {
        for (const [agentId, agent] of population.agents) {
          const state = (agent as any).survivalState;
          if (state) {
            // 确保有名字
            if (!getAgentName(agentId).startsWith('Bot-')) {
              // 已经有名字了
            } else if (agent.genome) {
              const expression = agent.genome;
              assignAgentName(agentId, {
                analyticalAbility: expression.analyticalAbility || 0.5,
                creativeAbility: expression.creativeAbility || 0.5,
                socialVsTechnical: expression.socialVsTechnical || 0.5,
                riskAppetite: expression.riskAppetite || 0.5,
              });
            }
            fetalActivity.push(umbilicalMonitor.getFetalNeuralActivity(agentId, state));
          }
        }
      }
      
      // 检查警报
      const newAlerts = umbilicalMonitor.checkAlerts();
      const allAlerts = umbilicalMonitor.getAlerts();
      
      // 自动暂停逻辑
      const shouldAutoPause = newAlerts.some(a => a.autoPauseTriggered);
      if (shouldAutoPause && isRunning && population) {
        population.stop();
        isRunning = false;
      }
      
      sendJson(res, {
        maternalHealth: {
          ...maternalHealth,
          statusEmoji: maternalHealth.status === 'healthy' ? '💚' : 
                       maternalHealth.status === 'stressed' ? '💛' : '❤️',
        },
        fetalActivity: fetalActivity.sort((a, b) => b.anxietyScore - a.anxietyScore),
        alerts: allAlerts.slice(-10).reverse(), // 最近10条，最新的在前
        autoPaused: shouldAutoPause,
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
    console.log(`   • GET  /api/monitor   - 🩺 脐带监测面板 (Umbilical Monitor)`);
    console.log(`   • POST /api/control   - Control simulation`);
    console.log(`\n🩺 Umbilical Monitor: http://localhost:${port}/api/monitor`);
  });

  return server;
};

export { isRunning };
