/**
 * DeFi Events with Realistic Market Yields
 * Based on actual DeFi market data (2024-2025)
 * 
 * APY ranges from real protocols:
 * - DEX Arbitrage: 10-50% APY (opportunity-based, volatile)
 * - Lending (Aave/Compound): 3-8% APY (stable)
 * - LP Rewards: 5-30% APY (impermanent loss risk)
 * - Staking: 4-15% APY (depending on token)
 * - MEV: Highly variable, 0-100%+ APY
 * 
 * Daily yield = APY / 365
 */

import { ExpressionResult } from '../genome/types.js';

export interface DeFiEvent {
  id: string;
  name: string;
  type: 'arbitrage' | 'lending' | 'lp_reward' | 'staking' | 'mev' | 'yield_farming';
  description: string;
  // Capital required to participate (USDC)
  minCapital: number;
  maxCapital: number;
  // Daily yield range (as decimal, e.g., 0.001 = 0.1% daily = ~43% APY)
  dailyYieldMin: number;
  dailyYieldMax: number;
  // Risk of loss (0-1)
  riskLevel: number;
  // Probability of occurrence per day
  dailyProbability: number;
  // Required agent traits
  requiredTraits: Partial<ExpressionResult>;
  // Gas cost to execute
  gasCost: number;
}

// Realistic daily yields calculated from APY
// Daily = (1 + APY)^(1/365) - 1 ≈ APY/365 for small APY
export const DEFI_EVENTS: DeFiEvent[] = [
  // === DEX ARBITRAGE ===
  // Real APY: 15-50% depending on market volatility
  // Daily: 0.04% - 0.11%
  {
    id: 'dex_arb_eth_usdc',
    name: 'ETH/USDC 套利机会',
    type: 'arbitrage',
    description: 'Uniswap和Aerodrome之间存在价差，可低买高卖',
    minCapital: 100,
    maxCapital: 5000,
    dailyYieldMin: 0.0004,   // 0.04% daily = ~15% APY
    dailyYieldMax: 0.002,    // 0.2% daily = ~100% APY (rare opportunity)
    riskLevel: 0.3,
    dailyProbability: 0.25,  // 25% chance per day
    requiredTraits: {
      onChainAffinity: 0.6,
      analyticalAbility: 0.5,
      riskAppetite: 0.4,
    },
    gasCost: 0.005,
  },
  {
    id: 'dex_arb_triangular',
    name: '三角套利机会',
    type: 'arbitrage',
    description: 'ETH→USDC→USDT→ETH 三角套利',
    minCapital: 500,
    maxCapital: 10000,
    dailyYieldMin: 0.0003,
    dailyYieldMax: 0.0015,
    riskLevel: 0.35,
    dailyProbability: 0.15,
    requiredTraits: {
      onChainAffinity: 0.7,
      analyticalAbility: 0.6,
      riskAppetite: 0.5,
    },
    gasCost: 0.008,
  },
  
  // === LENDING / MONEY MARKET ===
  // Real APY: 3-8% for stablecoins on Aave/Compound
  // Daily: 0.008% - 0.022%
  {
    id: 'aave_lend_usdc',
    name: 'Aave USDC 存款收益',
    type: 'lending',
    description: '在 Aave 存入 USDC 赚取利息',
    minCapital: 10,
    maxCapital: 10000,
    dailyYieldMin: 0.00008,  // 0.008% daily = 3% APY
    dailyYieldMax: 0.00022,  // 0.022% daily = 8% APY
    riskLevel: 0.05,         // Very low risk
    dailyProbability: 0.9,   // Always available
    requiredTraits: {
      onChainAffinity: 0.3,
      riskAppetite: 0.2,
      savingsRate: 0.4,
    },
    gasCost: 0.002,
  },
  {
    id: 'compound_lend_eth',
    name: 'Compound ETH 存款',
    type: 'lending',
    description: '在 Compound 存入 ETH 赚取利息',
    minCapital: 0.01,        // 0.01 ETH
    maxCapital: 10,
    dailyYieldMin: 0.00006,  // 0.006% daily = 2.2% APY
    dailyYieldMax: 0.00016,  // 0.016% daily = 6% APY
    riskLevel: 0.08,
    dailyProbability: 0.85,
    requiredTraits: {
      onChainAffinity: 0.3,
      riskAppetite: 0.25,
    },
    gasCost: 0.003,
  },
  
  // === LIQUIDITY POOL REWARDS ===
  // Real APY: 10-30% for major LPs (with IL risk)
  // Daily: 0.027% - 0.082%
  {
    id: 'lp_eth_usdc_aerodrome',
    name: 'Aerodrome ETH/USDC LP',
    type: 'lp_reward',
    description: '为 Aerodrome 提供 ETH/USDC 流动性，赚取手续费和代币奖励',
    minCapital: 50,
    maxCapital: 20000,
    dailyYieldMin: 0.00027,  // 0.027% daily = 10% APY
    dailyYieldMax: 0.00082,  // 0.082% daily = 35% APY
    riskLevel: 0.45,         // Impermanent loss risk
    dailyProbability: 0.95,  // Always available
    requiredTraits: {
      onChainAffinity: 0.5,
      riskAppetite: 0.5,
      diversification_pref: 0.4,
    },
    gasCost: 0.008,
  },
  {
    id: 'lp_usdc_usdt_curve',
    name: 'Curve USDC/USDT LP',
    type: 'lp_reward',
    description: '稳定币对 LP，低无常损失风险',
    minCapital: 100,
    maxCapital: 50000,
    dailyYieldMin: 0.00014,  // 0.014% daily = 5% APY
    dailyYieldMax: 0.00041,  // 0.041% daily = 15% APY
    riskLevel: 0.25,         // Lower IL risk for stable pairs
    dailyProbability: 0.95,
    requiredTraits: {
      onChainAffinity: 0.4,
      riskAppetite: 0.3,
    },
    gasCost: 0.006,
  },
  {
    id: 'lp_altcoin_high_yield',
    name: '高风险山寨币 LP',
    type: 'lp_reward',
    description: '新兴代币的高收益流动性池',
    minCapital: 50,
    maxCapital: 5000,
    dailyYieldMin: 0.00055,  // 0.055% daily = 20% APY
    dailyYieldMax: 0.0027,   // 0.27% daily = 200% APY (volatile!)
    riskLevel: 0.75,         // High IL and rug risk
    dailyProbability: 0.4,
    requiredTraits: {
      onChainAffinity: 0.6,
      riskAppetite: 0.8,
      opportunity_detection: 0.7,
    },
    gasCost: 0.01,
  },
  
  // === STAKING ===
  // Real APY: 4-15% for ETH staking
  // Daily: 0.011% - 0.041%
  {
    id: 'stake_eth_lido',
    name: 'Lido ETH 质押',
    type: 'staking',
    description: '质押 ETH 获得 stETH，赚取质押收益',
    minCapital: 0.01,
    maxCapital: 100,
    dailyYieldMin: 0.00011,  // 0.011% daily = 4% APY
    dailyYieldMax: 0.00027,  // 0.027% daily = 10% APY
    riskLevel: 0.15,
    dailyProbability: 0.95,
    requiredTraits: {
      onChainAffinity: 0.4,
      riskAppetite: 0.3,
      investment_horizon: 0.5,
    },
    gasCost: 0.004,
  },
  
  // === YIELD FARMING ===
  // Boosted rewards with protocol tokens
  {
    id: 'yield_farm_aero',
    name: 'Aerodrome 流动性挖矿',
    type: 'yield_farming',
    description: '存入 LP 代币，额外赚取 AERO 代币奖励',
    minCapital: 100,
    maxCapital: 15000,
    dailyYieldMin: 0.00041,  // 0.041% base + 0.1% rewards
    dailyYieldMax: 0.0014,   // Can be very high with token appreciation
    riskLevel: 0.5,
    dailyProbability: 0.7,
    requiredTraits: {
      onChainAffinity: 0.6,
      riskAppetite: 0.6,
      adaptationSpeed: 0.5,
    },
    gasCost: 0.012,
  },
  
  // === MEV EXTRACTION ===
  // Highly variable, requires technical skill
  {
    id: 'mev_sandwich',
    name: 'MEV 三明治攻击',
    type: 'mev',
    description: '检测大型交易，抢先买入后卖出',
    minCapital: 1000,
    maxCapital: 50000,
    dailyYieldMin: 0,        // Can lose money
    dailyYieldMax: 0.01,     // 1% daily = huge APY (rare!)
    riskLevel: 0.85,
    dailyProbability: 0.1,   // Rare opportunity
    requiredTraits: {
      onChainAffinity: 0.9,
      analyticalAbility: 0.9,
      riskAppetite: 0.9,
      technicalSkill: 0.9,
    },
    gasCost: 0.02,
  },
];

// Calculate expected daily return for an event
export const calculateDeFiReturn = (
  event: DeFiEvent,
  capital: number,
  expression: ExpressionResult
): { grossReturn: number; gasCost: number; netReturn: number; success: boolean; message: string } => {
  // Check if agent has required capital
  if (capital < event.minCapital) {
    return {
      grossReturn: 0,
      gasCost: 0,
      netReturn: 0,
      success: false,
      message: `资本不足，需要至少 $${event.minCapital} 参与 ${event.name}`,
    };
  }
  
  // Check if agent has required traits
  for (const [trait, threshold] of Object.entries(event.requiredTraits)) {
    const value = expression[trait as keyof ExpressionResult];
    if (typeof value === 'number' && value < threshold) {
      return {
        grossReturn: 0,
        gasCost: 0,
        netReturn: 0,
        success: false,
        message: `基因特质不匹配，无法参与 ${event.name}`,
      };
    }
  }
  
  // Determine actual capital to use (up to max)
  const actualCapital = Math.min(capital * 0.8, event.maxCapital); // Use max 80% of balance
  
  // Calculate yield with some randomness
  const yieldRange = event.dailyYieldMax - event.dailyYieldMin;
  const randomYield = event.dailyYieldMin + Math.random() * yieldRange;
  
  // Risk adjustment: higher risk appetite may get higher returns but also more losses
  let adjustedYield = randomYield;
  const riskRoll = Math.random();
  
  if (riskRoll < event.riskLevel) {
    // Bad outcome: loss
    // Loss severity depends on risk level and agent's risk appetite
    const lossSeverity = event.riskLevel * (1 + expression.riskAppetite * 0.5);
    adjustedYield = -randomYield * lossSeverity * 2; // Losses can be bigger than gains
  } else if (expression.analyticalAbility > 0.7) {
    // Good analytical skills improve yields
    adjustedYield *= (1 + (expression.analyticalAbility - 0.7) * 0.3);
  }
  
  const grossReturn = actualCapital * adjustedYield;
  const gasCost = event.gasCost;
  const netReturn = grossReturn - gasCost;
  
  let message = '';
  if (netReturn > 0) {
    message = `${event.name} 获利 $${netReturn.toFixed(2)} (${(adjustedYield * 100).toFixed(3)}% 日收益)`;
  } else if (netReturn < 0) {
    message = `${event.name} 亏损 $${Math.abs(netReturn).toFixed(2)} (无常损失/滑点)`;
  } else {
    message = `${event.name} 收支平衡`;
  }
  
  return {
    grossReturn,
    gasCost,
    netReturn,
    success: netReturn > 0,
    message,
  };
};

// Get available DeFi events based on capital
export const getAvailableDeFiEvents = (capital: number): DeFiEvent[] => {
  return DEFI_EVENTS.filter(event => 
    capital >= event.minCapital && Math.random() < event.dailyProbability
  );
};

// Format APY for display
export const formatAPY = (dailyYield: number): string => {
  const apy = (Math.pow(1 + dailyYield, 365) - 1) * 100;
  if (apy < 10) return `${apy.toFixed(1)}%`;
  if (apy < 100) return `${apy.toFixed(0)}%`;
  return `${apy.toFixed(0)}%+`;
};

// Event descriptions for frontend
export const getDeFiEventSummary = (): Array<{ name: string; apy: string; risk: string }> => {
  return DEFI_EVENTS.map(event => ({
    name: event.name,
    apy: formatAPY((event.dailyYieldMin + event.dailyYieldMax) / 2),
    risk: event.riskLevel < 0.2 ? '低风险' : event.riskLevel < 0.5 ? '中风险' : '高风险',
  }));
};
