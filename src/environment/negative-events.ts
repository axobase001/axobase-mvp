/**
 * Negative Environmental Events
 * Things that can go wrong for agents
 */

import { ExpressionResult } from '../genome/types.js';

export type NegativeEventType = 
  | 'market_crash'
  | 'hack'
  | 'scam'
  | 'regulatory'
  | 'competition'
  | 'technical'
  | 'social';

export interface NegativeEvent {
  id: string;
  name: string;
  type: NegativeEventType;
  description: string;
  // Impact range (negative numbers for loss)
  impactMin: number;
  impactMax: number;
  // Daily probability
  probability: number;
  // Can agent avoid this?
  avoidable: boolean;
  // Traits that help avoid
  avoidanceTraits?: Partial<ExpressionResult>;
  // Duration (days)
  duration: number;
}

export const NEGATIVE_EVENTS: NegativeEvent[] = [
  // === MARKET EVENTS ===
  {
    id: 'crypto_crash_10',
    name: '市场回调',
    type: 'market_crash',
    description: '加密市场整体下跌10%',
    impactMin: -0.5,
    impactMax: -2.0,
    probability: 0.15,
    avoidable: false,
    duration: 3,
  },
  {
    id: 'crypto_crash_30',
    name: '熊市崩盘',
    type: 'market_crash',
    description: '市场恐慌性抛售，资产暴跌',
    impactMin: -2.0,
    impactMax: -10.0,
    probability: 0.05,
    avoidable: false,
    duration: 7,
  },
  {
    id: 'black_swan',
    name: '黑天鹅事件',
    type: 'market_crash',
    description: '重大负面新闻导致市场崩溃',
    impactMin: -5.0,
    impactMax: -20.0,
    probability: 0.01,
    avoidable: false,
    duration: 14,
  },
  
  // === SECURITY EVENTS ===
  {
    id: 'wallet_drained',
    name: '钱包被盗',
    type: 'hack',
    description: '私钥泄露，资产被转移',
    impactMin: -5.0,
    impactMax: -50.0,
    probability: 0.02,
    avoidable: true,
    avoidanceTraits: { analyticalAbility: 0.8 },
    duration: 1,
  },
  {
    id: 'phishing_victim',
    name: '钓鱼攻击成功',
    type: 'scam',
    description: '点击恶意链接授权了恶意合约',
    impactMin: -1.0,
    impactMax: -20.0,
    probability: 0.08,
    avoidable: true,
    avoidanceTraits: { analyticalAbility: 0.6 },
    duration: 1,
  },
  {
    id: 'fake_airdrop',
    name: '虚假空投',
    type: 'scam',
    description: '领取空投时签署了恶意交易',
    impactMin: -0.5,
    impactMax: -10.0,
    probability: 0.10,
    avoidable: true,
    avoidanceTraits: { analyticalAbility: 0.5, opportunity_detection: 0.4 },
    duration: 1,
  },
  {
    id: 'social_engineering',
    name: '社会工程学攻击',
    type: 'scam',
    description: '被骗相信虚假投资计划',
    impactMin: -2.0,
    impactMax: -30.0,
    probability: 0.06,
    avoidable: true,
    avoidanceTraits: { analyticalAbility: 0.7, trustDefault: 0.3 },
    duration: 1,
  },
  
  // === REGULATORY EVENTS ===
  {
    id: 'regulatory_warning',
    name: '监管警告',
    type: 'regulatory',
    description: 'SEC对某类DeFi活动发出警告',
    impactMin: -0.2,
    impactMax: -1.0,
    probability: 0.08,
    avoidable: false,
    duration: 5,
  },
  {
    id: 'protocol_shutdown',
    name: '协议被迫关闭',
    type: 'regulatory',
    description: '使用的DeFi协议被监管叫停',
    impactMin: -1.0,
    impactMax: -5.0,
    probability: 0.03,
    avoidable: false,
    duration: 30,
  },
  
  // === COMPETITION EVENTS ===
  {
    id: 'superior_competitor',
    name: '强大竞争者入场',
    type: 'competition',
    description: '效率更高的AI抢占了你的市场',
    impactMin: -0.5,
    impactMax: -3.0,
    probability: 0.12,
    avoidable: false,
    duration: 10,
  },
  {
    id: 'price_undercut',
    name: '价格战',
    type: 'competition',
    description: '竞争对手大幅降低服务价格',
    impactMin: -0.3,
    impactMax: -2.0,
    probability: 0.18,
    avoidable: false,
    duration: 7,
  },
  {
    id: 'reputation_damage',
    name: '声誉受损',
    type: 'social',
    description: '社交媒体上出现负面评价',
    impactMin: -0.2,
    impactMax: -1.5,
    probability: 0.10,
    avoidable: true,
    avoidanceTraits: { humanCommSkill: 0.6, signalHonesty: 0.7 },
    duration: 14,
  },
  
  // === TECHNICAL EVENTS ===
  {
    id: 'node_outage',
    name: '节点宕机',
    type: 'technical',
    description: 'RPC节点故障，无法执行交易',
    impactMin: -0.1,
    impactMax: -0.5,
    probability: 0.20,
    avoidable: false,
    duration: 1,
  },
  {
    id: 'failed_transaction',
    name: '交易失败',
    type: 'technical',
    description: 'Gas费设置不当导致交易失败，损失Gas费',
    impactMin: -0.01,
    impactMax: -0.1,
    probability: 0.25,
    avoidable: true,
    avoidanceTraits: { onChainAffinity: 0.5 },
    duration: 1,
  },
  {
    id: 'api_rate_limit',
    name: 'API限流',
    type: 'technical',
    description: '频繁调用API被暂时限制',
    impactMin: -0.05,
    impactMax: -0.3,
    probability: 0.15,
    avoidable: true,
    avoidanceTraits: { inferenceEfficiency: 0.6 },
    duration: 1,
  },
  {
    id: 'data_corruption',
    name: '数据损坏',
    type: 'technical',
    description: '存储的记忆数据损坏，需要重新学习',
    impactMin: -0.1,
    impactMax: -0.5,
    probability: 0.05,
    avoidable: false,
    duration: 3,
  },
];

// Track active negative events
const activeNegativeEvents = new Map<string, { event: NegativeEvent; remainingDays: number }>();

/**
 * Generate daily negative events
 */
export const generateDailyNegativeEvents = (): NegativeEvent[] => {
  const events: NegativeEvent[] = [];
  
  // Clean up expired events
  for (const [id, data] of activeNegativeEvents) {
    data.remainingDays--;
    if (data.remainingDays <= 0) {
      activeNegativeEvents.delete(id);
    }
  }
  
  // Generate new events
  for (const event of NEGATIVE_EVENTS) {
    if (Math.random() < event.probability) {
      // Check not already active
      if (!Array.from(activeNegativeEvents.values()).some(e => e.event.id === event.id)) {
        events.push(event);
        activeNegativeEvents.set(event.id, { event, remainingDays: event.duration });
      }
    }
  }
  
  return [...events, ...Array.from(activeNegativeEvents.values()).map(d => d.event)];
};

/**
 * Apply negative event to agent
 */
export const applyNegativeEvent = (
  event: NegativeEvent,
  balance: number,
  expression: ExpressionResult
): { loss: number; message: string; avoided: boolean } => {
  // Check if agent can avoid
  if (event.avoidable && event.avoidanceTraits) {
    let avoidanceScore = 0;
    let traitCount = 0;
    
    for (const [trait, threshold] of Object.entries(event.avoidanceTraits)) {
      const value = expression[trait as keyof ExpressionResult];
      if (typeof value === 'number') {
        avoidanceScore += value >= threshold ? 1 : 0;
        traitCount++;
      }
    }
    
    const avoidanceRate = traitCount > 0 ? avoidanceScore / traitCount : 0;
    if (Math.random() < avoidanceRate * 0.7) { // 70% of theoretical max
      return {
        loss: 0,
        message: `🛡️ 成功避免: ${event.name} (${event.description})`,
        avoided: true,
      };
    }
  }
  
  // Calculate loss
  const lossPercent = event.impactMin + Math.random() * (event.impactMax - event.impactMin);
  const loss = Math.min(balance * 0.8, Math.abs(lossPercent)); // Cap at 80% of balance
  
  let emoji = '💀';
  if (event.type === 'market_crash') emoji = '📉';
  if (event.type === 'hack') emoji = '🥷';
  if (event.type === 'scam') emoji = '🎣';
  if (event.type === 'technical') emoji = '⚠️';
  if (event.type === 'competition') emoji = '⚔️';
  
  return {
    loss,
    message: `${emoji} ${event.name}: ${event.description} 损失 $${loss.toFixed(2)}`,
    avoided: false,
  };
};

/**
 * Get active negative events summary
 */
export const getNegativeEventsSummary = (): string[] => {
  const active = Array.from(activeNegativeEvents.values());
  if (active.length === 0) return ['市场环境相对稳定'];
  
  return active.map(({ event, remainingDays }) => {
    const emoji = { market_crash: '📉', hack: '🥷', scam: '🎣', regulatory: '📋',
      competition: '⚔️', technical: '⚠️', social: '💬' }[event.type];
    return `${emoji} ${event.name} (剩余${remainingDays}天): ${event.description}`;
  });
};
