/**
 * DeFi Risks and Negative Events
 * Realistic loss scenarios in DeFi
 */

import { ExpressionResult } from '../genome/types.js';

export type RiskType = 
  | 'impermanent_loss'
  | 'smart_contract_bug'
  | 'rug_pull'
  | 'oracle_manipulation'
  | 'liquidation'
  | 'slippage'
  | 'front_running'
  | 'governance_attack'
  | 'bridge_hack'
  | 'flash_loan_attack';

export interface DeFiRisk {
  id: string;
  name: string;
  type: RiskType;
  description: string;
  // Probability of happening when agent participates in DeFi
  baseProbability: number;
  // Loss range (as % of invested capital)
  lossMin: number;
  lossMax: number;
  // Can be mitigated by traits?
  mitigatedBy: Partial<ExpressionResult>;
  mitigationEffect: number; // How much traits reduce probability
}

export const DEFI_RISKS: DeFiRisk[] = [
  {
    id: 'impermanent_loss_standard',
    name: '无常损失',
    type: 'impermanent_loss',
    description: '价格波动导致LP头寸价值下降',
    baseProbability: 0.4,
    lossMin: 0.02,  // 2%
    lossMax: 0.15,  // 15%
    mitigatedBy: { analyticalAbility: 0.6 },
    mitigationEffect: 0.3,
  },
  {
    id: 'impermanent_loss_extreme',
    name: '严重无常损失',
    type: 'impermanent_loss',
    description: '单边剧烈行情导致重大损失',
    baseProbability: 0.1,
    lossMin: 0.15,
    lossMax: 0.50,  // Up to 50% loss
    mitigatedBy: { analyticalAbility: 0.7, stressResponse: 0.6 },
    mitigationEffect: 0.4,
  },
  {
    id: 'smart_contract_bug_minor',
    name: '合约小漏洞',
    type: 'smart_contract_bug',
    description: '交互的合约有bug，部分资金无法取出',
    baseProbability: 0.05,
    lossMin: 0.05,
    lossMax: 0.20,
    mitigatedBy: { analyticalAbility: 0.8 },
    mitigationEffect: 0.5,
  },
  {
    id: 'smart_contract_bug_major',
    name: '合约严重漏洞',
    type: 'smart_contract_bug',
    description: '合约被攻击，资金被盗',
    baseProbability: 0.02,
    lossMin: 0.30,
    lossMax: 1.00,  // Total loss
    mitigatedBy: { analyticalAbility: 0.9 },
    mitigationEffect: 0.6,
  },
  {
    id: 'rug_pull',
    name: '项目方跑路',
    type: 'rug_pull',
    description: '协议开发者卷走流动性',
    baseProbability: 0.08,
    lossMin: 0.50,
    lossMax: 1.00,
    mitigatedBy: { analyticalAbility: 0.7, riskAppetite: 0.3 },
    mitigationEffect: 0.7, // Conservative agents avoid this
  },
  {
    id: 'oracle_manipulation',
    name: '预言机攻击',
    type: 'oracle_manipulation',
    description: '价格预言机被操纵导致错误清算',
    baseProbability: 0.03,
    lossMin: 0.20,
    lossMax: 0.80,
    mitigatedBy: { analyticalAbility: 0.8 },
    mitigationEffect: 0.5,
  },
  {
    id: 'liquidation',
    name: '杠杆清算',
    type: 'liquidation',
    description: '使用杠杆被强制清算',
    baseProbability: 0.15,
    lossMin: 0.10,
    lossMax: 0.50,
    mitigatedBy: { riskAppetite: 0.3, analyticalAbility: 0.6 },
    mitigationEffect: 0.4,
  },
  {
    id: 'high_slippage',
    name: '高滑点损失',
    type: 'slippage',
    description: '大额交易导致显著滑点',
    baseProbability: 0.25,
    lossMin: 0.01,
    lossMax: 0.10,
    mitigatedBy: { analyticalAbility: 0.5 },
    mitigationEffect: 0.3,
  },
  {
    id: 'front_running',
    name: '被抢先交易',
    type: 'front_running',
    description: 'MEV机器人抢先执行你的交易',
    baseProbability: 0.20,
    lossMin: 0.02,
    lossMax: 0.20,
    mitigatedBy: { onChainAffinity: 0.7, analyticalAbility: 0.6 },
    mitigationEffect: 0.4,
  },
  {
    id: 'governance_attack',
    name: '治理攻击',
    type: 'governance_attack',
    description: '恶意提案通过损害代币持有者',
    baseProbability: 0.04,
    lossMin: 0.30,
    lossMax: 0.90,
    mitigatedBy: { analyticalAbility: 0.8 },
    mitigationEffect: 0.5,
  },
  {
    id: 'bridge_hack',
    name: '跨链桥被黑',
    type: 'bridge_hack',
    description: '使用的跨链桥被攻击',
    baseProbability: 0.06,
    lossMin: 0.20,
    lossMax: 1.00,
    mitigatedBy: { riskAppetite: 0.3 },
    mitigationEffect: 0.5,
  },
];

/**
 * Calculate if a DeFi loss event occurs
 */
export const calculateDeFiRisk = (
  investedAmount: number,
  expression: ExpressionResult,
  activityType: 'arbitrage' | 'lp' | 'lending' | 'trading'
): { occurred: boolean; loss: number; message: string } | null => {
  // Adjust probabilities based on activity type
  let riskMultiplier = 1.0;
  switch (activityType) {
    case 'arbitrage': riskMultiplier = 1.2; break;
    case 'lp': riskMultiplier = 1.5; break; // LP has more risks
    case 'lending': riskMultiplier = 0.8; break;
    case 'trading': riskMultiplier = 1.3; break;
  }
  
  for (const risk of DEFI_RISKS) {
    let probability = risk.baseProbability * riskMultiplier;
    
    // Apply mitigation from traits
    for (const [trait, threshold] of Object.entries(risk.mitigatedBy)) {
      const value = expression[trait as keyof ExpressionResult];
      if (typeof value === 'number' && value >= threshold) {
        probability *= (1 - risk.mitigationEffect);
      }
    }
    
    // Check if risk occurs
    if (Math.random() < probability) {
      const lossPercent = risk.lossMin + Math.random() * (risk.lossMax - risk.lossMin);
      const lossAmount = investedAmount * lossPercent;
      
      let message = '';
      switch (risk.type) {
        case 'impermanent_loss':
          message = `📉 ${risk.name}: 价格波动导致损失 $${lossAmount.toFixed(2)}`;
          break;
        case 'smart_contract_bug':
          message = `🐛 ${risk.name}: 合约故障损失 $${lossAmount.toFixed(2)}`;
          break;
        case 'rug_pull':
          message = `🏃 ${risk.name}: 项目方跑路损失 $${lossAmount.toFixed(2)}`;
          break;
        case 'liquidation':
          message = `💥 ${risk.name}: 杠杆被清算损失 $${lossAmount.toFixed(2)}`;
          break;
        case 'front_running':
          message = `🥷 ${risk.name}: MEV攻击损失 $${lossAmount.toFixed(2)}`;
          break;
        default:
          message = `⚠️ ${risk.name}: DeFi风险损失 $${lossAmount.toFixed(2)}`;
      }
      
      return {
        occurred: true,
        loss: lossAmount,
        message,
      };
    }
  }
  
  return null; // No risk event occurred
};

/**
 * Get risk summary for frontend
 */
export const getRiskSummary = (): Array<{
  type: string;
  probability: string;
  maxLoss: string;
  mitigatable: string;
}> => {
  return DEFI_RISKS.map(risk => ({
    type: risk.name,
    probability: `${(risk.baseProbability * 100).toFixed(0)}%`,
    maxLoss: `${(risk.lossMax * 100).toFixed(0)}%`,
    mitigatable: Object.keys(risk.mitigatedBy).length > 0 ? '是' : '否',
  }));
};
