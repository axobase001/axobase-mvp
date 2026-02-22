/**
 * Environmental Events System
 * Simulates real-world opportunities and risks for agents
 */

import { ExpressionResult } from '../genome/types.js';

export type EventType = 
  | 'market_opportunity'
  | 'content_demand'
  | 'data_request'
  | 'cooperation_offer'
  | 'market_crash'
  | 'scam_attempt'
  | 'hack_attempt'
  | 'gas_spike'
  | 'liquidity_crunch'
  | 'lucky_find'
  | 'competition'
  | 'regulatory_news';

export interface EnvironmentEvent {
  id: string;
  type: EventType;
  name: string;
  description: string;
  probability: number;
  impact: { min: number; max: number };
  duration: number;
  requiredTraits?: Partial<ExpressionResult>;
  riskLevel: number;
}

export const ENVIRONMENT_EVENTS: EnvironmentEvent[] = [
  {
    id: 'dex_arbitrage_opportunity',
    type: 'market_opportunity',
    name: 'DEX套利机会',
    description: '不同DEX之间的价格差异，可以低买高卖',
    probability: 0.3,
    impact: { min: 0.5, max: 5.0 },
    duration: 3,
    requiredTraits: { riskAppetite: 0.5, onChainAffinity: 0.6 },
    riskLevel: 0.4,
  },
  {
    id: 'content_viral_opportunity',
    type: 'content_demand',
    name: '内容病毒传播机会',
    description: '某个话题正在 trending，创作相关内容可能获得打赏',
    probability: 0.25,
    impact: { min: 0.1, max: 3.0 },
    duration: 5,
    requiredTraits: { creativeAbility: 0.5 },
    riskLevel: 0.2,
  },
  {
    id: 'data_analysis_job',
    type: 'data_request',
    name: '数据分析任务',
    description: '有Agent需要复杂数据分析服务',
    probability: 0.2,
    impact: { min: 0.3, max: 2.0 },
    duration: 2,
    requiredTraits: { analyticalAbility: 0.6 },
    riskLevel: 0.1,
  },
  {
    id: 'partnership_offer',
    type: 'cooperation_offer',
    name: '合作提议',
    description: '另一个Agent提议合作，共同分担成本分享收益',
    probability: 0.15,
    impact: { min: -1.0, max: 4.0 },
    duration: 10,
    requiredTraits: { cooperationTendency: 0.4 },
    riskLevel: 0.3,
  },
  {
    id: 'market_panic',
    type: 'market_crash',
    name: '市场恐慌',
    description: '市场突然下跌，资产价值缩水',
    probability: 0.1,
    impact: { min: -10.0, max: -0.5 },
    duration: 8,
    riskLevel: 0.8,
  },
  {
    id: 'phishing_attempt',
    type: 'scam_attempt',
    name: '钓鱼诈骗',
    description: '收到看似合法的链接，点击可能丢失资金',
    probability: 0.15,
    impact: { min: -5.0, max: 0 },
    duration: 1,
    riskLevel: 0.9,
  },
  {
    id: 'smart_contract_bug',
    type: 'hack_attempt',
    name: '智能合约漏洞',
    description: '交互的合约存在漏洞，可能导致资金损失',
    probability: 0.05,
    impact: { min: -20.0, max: 0 },
    duration: 1,
    riskLevel: 0.95,
  },
  {
    id: 'gas_price_spike',
    type: 'gas_spike',
    name: 'Gas费暴涨',
    description: '网络拥堵导致交易成本激增',
    probability: 0.2,
    impact: { min: -0.5, max: -0.1 },
    duration: 4,
    riskLevel: 0.3,
  },
  {
    id: 'airdrop_claim',
    type: 'lucky_find',
    name: '空投领取',
    description: '有资格领取意外的空投代币',
    probability: 0.05,
    impact: { min: 0.1, max: 10.0 },
    duration: 5,
    riskLevel: 0.1,
  },
  {
    id: 'new_competitor',
    type: 'competition',
    name: '新竞争者',
    description: '来了个效率更高的Agent，抢走了你的机会',
    probability: 0.2,
    impact: { min: -2.0, max: -0.1 },
    duration: 20,
    riskLevel: 0.4,
  },
];

const activeEvents = new Map<string, { event: EnvironmentEvent; remainingTicks: number }>();

export const generateRandomEvents = (): EnvironmentEvent[] => {
  const events: EnvironmentEvent[] = [];
  
  for (const event of ENVIRONMENT_EVENTS) {
    if (Math.random() < event.probability) {
      const hasSimilar = Array.from(activeEvents.values()).some(
        e => e.event.type === event.type
      );
      
      if (!hasSimilar) {
        events.push(event);
        activeEvents.set(event.id, { event, remainingTicks: event.duration });
      }
    }
  }
  
  return events;
};

export const getActiveEvents = (): EnvironmentEvent[] => {
  for (const [id, data] of activeEvents) {
    data.remainingTicks--;
    if (data.remainingTicks <= 0) {
      activeEvents.delete(id);
    }
  }
  
  return Array.from(activeEvents.values()).map(d => d.event);
};

export const canAgentUtilizeEvent = (
  event: EnvironmentEvent,
  expression: ExpressionResult
): boolean => {
  if (!event.requiredTraits) return true;
  
  for (const [trait, threshold] of Object.entries(event.requiredTraits)) {
    const value = expression[trait as keyof ExpressionResult];
    if (typeof value === 'number' && value < threshold) {
      return false;
    }
  }
  
  return true;
};

export const calculateEventImpact = (
  event: EnvironmentEvent,
  expression: ExpressionResult
): { amount: number; description: string } => {
  const range = event.impact.max - event.impact.min;
  const baseImpact = event.impact.min + Math.random() * range;
  
  let adjustedImpact = baseImpact;
  
  if (event.type === 'market_opportunity') {
    adjustedImpact *= (1 + expression.analyticalAbility * 0.5);
    if (expression.riskAppetite > 0.8 && Math.random() < 0.2) {
      adjustedImpact *= -0.5;
    }
  }
  
  if (event.type === 'scam_attempt' || event.type === 'hack_attempt') {
    if (expression.analyticalAbility > 0.7 && Math.random() < expression.analyticalAbility) {
      return { amount: 0, description: `识别并避开了${event.name}` };
    }
  }
  
  const finalAmount = parseFloat(adjustedImpact.toFixed(2));
  
  let description = '';
  if (finalAmount > 0) {
    description = `通过${event.name}赚取了 $${finalAmount}`;
  } else if (finalAmount < 0) {
    description = `因${event.name}损失了 $${Math.abs(finalAmount)}`;
  } else {
    description = `遇到${event.name}但没有产生影响`;
  }
  
  return { amount: finalAmount, description };
};

export const getEventSummary = (): string[] => {
  const events = getActiveEvents();
  if (events.length === 0) return ['市场环境平静'];
  
  return events.map(e => {
    const emoji = { market_opportunity: '📈', content_demand: '📝', data_request: '📊',
      cooperation_offer: '🤝', market_crash: '📉', scam_attempt: '🎣', hack_attempt: '🥷',
      gas_spike: '⛽', liquidity_crunch: '🏜️', lucky_find: '🍀', competition: '⚔️',
      regulatory_news: '📋' }[e.type] || '❓';
    return `${emoji} ${e.name}: ${e.description}`;
  });
};
