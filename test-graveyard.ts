/**
 * 测试数字墓地自动记录功能
 */

import { createDeathRecord, recordToGraveyard, APIRequestRecord } from './src/monitoring/graveyard.js';
import { AgentConfig } from './src/lifecycle/birth.js';
import { SurvivalState, initializeSurvivalState } from './src/lifecycle/survival.js';
import { DeathVerdict } from './src/lifecycle/death.js';
import { createFounderGenome } from './src/genome/factory.js';

// 创建一个测试 Agent
const testAgent: AgentConfig = {
  id: '0x1234567890abcdef',
  walletIndex: 0,
  genome: createFounderGenome(),
  parentIds: null,
  initialBalance: 10,
};

// 创建一个测试 SurvivalState
const testState: SurvivalState = {
  ...initializeSurvivalState(),
  tick: 42,
  balanceUSDC: 0.01,
  liquidCapital: 0.01,
  lockedCapital: 0,
  consecutiveFailures: 15,
  totalLLMCalls: 12,
  totalEarned: { defi: 2.5, tasks: 1.2, events: 0, tokens: 0 },
  totalSpent: { operational: 3.2, losses: 10.5 },
  eventLog: [
    { tick: 40, event: '尝试高风险套利失败', impact: -2.0 },
    { tick: 41, event: '余额不足支付运营成本', impact: -0.5 },
    { tick: 42, event: '连续失败15次，濒临死亡', impact: -0.1 },
  ],
  actionHistory: [
    { tick: 5, action: 'defi:arbitrage', success: false, cost: 0.5, revenue: 0 },
    { tick: 12, action: 'task:data_labeling', success: true, cost: 0, revenue: 0.3 },
    { tick: 20, action: 'defi:lp', success: false, cost: 1.0, revenue: 0 },
  ],
  defiStats: {
    positionsOpened: 3,
    totalCapitalDeployed: 15,
    protocolsUsed: ['aerodrome', 'aave'],
    firstDeFiTick: 5,
  },
  tokenPortfolio: {
    holdings: new Map(),
    totalCurrentValue: 0,
    totalInitialValue: 0,
    realizedProfits: 0,
    unrealizedPnl: 0,
  },
  lastLLMCallTime: Date.now() - 60000,
  llmCallsThisTick: 0,
  totalLLMCalls: 12,
};

// 测试 API 历史
const testAPIHistory: APIRequestRecord[] = [
  {
    tick: 5,
    timestamp: Date.now() - 300000,
    decision: 'arbitrage_eth_usdc',
    outcome: 'failure',
    impact: -2.5,
    cost: 0.0008,
    prompt_preview: '分析ETH/USDC价差...',
    response_preview: '{"action": "arbitrage", "confidence": 0.8}',
  },
  {
    tick: 12,
    timestamp: Date.now() - 200000,
    decision: 'data_labeling_task',
    outcome: 'success',
    impact: 0.3,
    cost: 0.0008,
    prompt_preview: '评估可用任务...',
    response_preview: '{"action": "task", "type": "data_labeling"}',
  },
  {
    tick: 35,
    timestamp: Date.now() - 100000,
    decision: 'high_risk_farm',
    outcome: 'failure',
    impact: -5.0,
    cost: 0.0008,
    prompt_preview: '分析高收益农场...',
    response_preview: '{"action": "defi", "risk": "high"}',
  },
];

// 测试死亡判决
const testVerdict: DeathVerdict = {
  isDead: true,
  cause: 'economic',
  reason: 'Balance depleted after 15 consecutive failures',
};

console.log('🧪 测试数字墓地自动记录功能...\n');

try {
  // 创建死亡档案
  console.log('1️⃣ 创建死亡档案...');
  const record = createDeathRecord(testAgent, testState, testVerdict, testAPIHistory);
  
  console.log(`✅ 档案创建成功`);
  console.log(`   - Bot名字: ${record.name}`);
  console.log(`   - 存活时间: ${record.lifespan_ticks} ticks`);
  console.log(`   - 死亡原因: ${record.death.cause}`);
  console.log(`   - API调用: ${record.api_activity.total_calls}次`);
  console.log(`   - 关键决策: ${record.api_activity.requests.length}条`);
  console.log(`   - 教训总结: ${record.lessons.length}条\n`);
  
  // 记录到墓地
  console.log('2️⃣ 写入 GRAVEYARD.md...');
  recordToGraveyard(record);
  
  console.log('✅ 测试完成！请检查 GRAVEYARD.md 文件\n');
  
} catch (error) {
  console.error('❌ 测试失败:', error);
  process.exit(1);
}
