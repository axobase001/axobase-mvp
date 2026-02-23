/**
 * Negative Environmental Events
 *
 * 修复：移除了全局 activeNegativeEvents Map（原设计让所有 agent 共享同一份事件状态，
 * 导致一个 agent 触发崩盘后同一 tick 内其他所有 agent 也被影响，且持续多天叠加。）
 *
 * 现在改为每次调用独立随机，每 tick 最多触发 2 个负面事件，每个事件影响上限为余额 20%。
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
  impactMin: number;  // absolute USDC loss (positive number)
  impactMax: number;
  probability: number;
  avoidable: boolean;
  avoidanceTraits?: Partial<ExpressionResult>;
}

// 影响值已校准：普通事件 0.05-0.3，严重事件 0.2-1.5（不再与余额百分比挂钩的极端值）
export const NEGATIVE_EVENTS: NegativeEvent[] = [
  // === MARKET EVENTS ===
  {
    id: 'crypto_crash_10',
    name: '市场回调',
    type: 'market_crash',
    description: '加密市场整体下跌',
    impactMin: 0.1,
    impactMax: 0.5,
    probability: 0.10,
    avoidable: false,
  },
  {
    id: 'crypto_crash_30',
    name: '熊市崩盘',
    type: 'market_crash',
    description: '市场恐慌性抛售',
    impactMin: 0.3,
    impactMax: 1.2,
    probability: 0.03,
    avoidable: false,
  },
  {
    id: 'black_swan',
    name: '黑天鹅事件',
    type: 'market_crash',
    description: '重大负面新闻',
    impactMin: 0.5,
    impactMax: 2.0,
    probability: 0.01,
    avoidable: false,
  },

  // === SECURITY EVENTS ===
  {
    id: 'wallet_drained',
    name: '钱包被盗',
    type: 'hack',
    description: '私钥泄露',
    impactMin: 0.5,
    impactMax: 2.0,
    probability: 0.01,
    avoidable: true,
    avoidanceTraits: { analyticalAbility: 0.8 },
  },
  {
    id: 'phishing_victim',
    name: '钓鱼攻击',
    type: 'scam',
    description: '点击恶意链接',
    impactMin: 0.2,
    impactMax: 1.0,
    probability: 0.05,
    avoidable: true,
    avoidanceTraits: { analyticalAbility: 0.6 },
  },
  {
    id: 'fake_airdrop',
    name: '虚假空投',
    type: 'scam',
    description: '领取空投时签署恶意交易',
    impactMin: 0.1,
    impactMax: 0.5,
    probability: 0.06,
    avoidable: true,
    avoidanceTraits: { analyticalAbility: 0.5 },
  },

  // === COMPETITION EVENTS ===
  {
    id: 'superior_competitor',
    name: '竞争者入场',
    type: 'competition',
    description: '更高效的AI抢占市场',
    impactMin: 0.1,
    impactMax: 0.4,
    probability: 0.08,
    avoidable: false,
  },
  {
    id: 'price_undercut',
    name: '价格战',
    type: 'competition',
    description: '竞争对手降价',
    impactMin: 0.05,
    impactMax: 0.3,
    probability: 0.10,
    avoidable: false,
  },

  // === TECHNICAL EVENTS ===
  {
    id: 'node_outage',
    name: '节点宕机',
    type: 'technical',
    description: 'RPC节点故障',
    impactMin: 0.02,
    impactMax: 0.15,
    probability: 0.12,
    avoidable: false,
  },
  {
    id: 'failed_transaction',
    name: '交易失败',
    type: 'technical',
    description: 'Gas费不当导致失败',
    impactMin: 0.01,
    impactMax: 0.05,
    probability: 0.15,
    avoidable: true,
    avoidanceTraits: { onChainAffinity: 0.5 },
  },
  {
    id: 'api_rate_limit',
    name: 'API限流',
    type: 'technical',
    description: '被暂时限制调用',
    impactMin: 0.01,
    impactMax: 0.08,
    probability: 0.10,
    avoidable: true,
    avoidanceTraits: { analyticalAbility: 0.6 },
  },
];

/**
 * 为单个 agent 生成本 tick 的负面事件列表。
 * 无全局状态：每次调用完全独立。最多返回 2 个事件。
 */
export const generateDailyNegativeEvents = (): NegativeEvent[] => {
  const triggered: NegativeEvent[] = [];

  for (const event of NEGATIVE_EVENTS) {
    if (triggered.length >= 2) break;
    if (Math.random() < event.probability) {
      triggered.push(event);
    }
  }

  return triggered;
};

/**
 * 将负面事件应用于 agent，返回实际损失。
 * 损失上限：余额的 20%（防止单事件灭顶）。
 */
export const applyNegativeEvent = (
  event: NegativeEvent,
  balance: number,
  expression: ExpressionResult
): { loss: number; message: string; avoided: boolean } => {
  // Avoidance check
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
    if (Math.random() < avoidanceRate * 0.7) {
      return {
        loss: 0,
        message: `🛡️ 成功避免: ${event.name}`,
        avoided: true,
      };
    }
  }

  const rawLoss = event.impactMin + Math.random() * (event.impactMax - event.impactMin);
  // Cap at 20% of current balance to prevent catastrophic single-event wipeout
  const loss = Math.min(rawLoss, balance * 0.20);

  const emoji: Record<NegativeEventType, string> = {
    market_crash: '📉',
    hack: '🥷',
    scam: '🎣',
    regulatory: '📋',
    competition: '⚔️',
    technical: '⚠️',
    social: '💬',
  };

  return {
    loss,
    message: `${emoji[event.type]} ${event.name}: ${event.description} -$${loss.toFixed(3)}`,
    avoided: false,
  };
};
