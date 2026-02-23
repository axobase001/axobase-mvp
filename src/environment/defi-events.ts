/**
 * DeFi Events with Realistic Market Yields & Capital Lockup
 * Based on actual DeFi market data (2024-2025)
 * 
 * Key additions:
 * - Lockup periods: Funds are locked for specific durations
 * - Capital utilization: Funds cannot be used for other operations while locked
 * - Early exit penalties: Withdrawing before lockup ends incurs losses
 * - Settlement delays: Different strategies have different fund availability
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
  // ===== CAPITAL LOCKUP CONFIGURATION =====
  // Minimum lockup period in ticks (days)
  lockupPeriodTicks: number;
  // Can withdraw early? (some protocols allow, some don't)
  allowsEarlyExit: boolean;
  // Early exit penalty percentage (0-1), 0 = no penalty
  earlyExitPenalty: number;
  // Capital settlement delay - how many ticks until funds are available after exit
  settlementDelayTicks: number;
  // Is yield paid at maturity or continuously?
  yieldPayoutSchedule: 'continuous' | 'maturity' | 'weekly' | 'monthly';
  // Reinvestment: does yield auto-compound or need manual claim?
  autoCompounds: boolean;
}

// Track active DeFi positions
export interface DeFiPosition {
  eventId: string;
  eventName: string;
  type: DeFiEvent['type'];
  capitalInvested: number;
  entryTick: number;
  maturityTick: number; // When can withdraw without penalty
  accumulatedYield: number;
  claimedYield: number;
  status: 'active' | 'exiting' | 'settling' | 'completed';
  exitTick?: number;
  availableAfterTick?: number; // When funds will be liquid
}

// DeFi strategies - NOT for everyone
// Each strategy requires specific gene combinations
// Most agents should focus on tasks, not DeFi

export const DEFI_EVENTS: DeFiEvent[] = [
  // === DEX ARBITRAGE ===
  // HIGH BARRIER: Requires exceptional analytical + technical skills
  // Most agents will NEVER qualify for this
  {
    id: 'dex_arb_eth_usdc',
    name: 'ETH/USDC 跨所套利',
    type: 'arbitrage',
    description: '利用 Uniswap 和 Aerodrome 之间的价差进行瞬时套利。需要极高的链上分析能力和快速执行。',
    minCapital: 500,  // Increased - need serious capital
    maxCapital: 5000,
    dailyYieldMin: 0.0002,   // Lowered - competition is fierce
    dailyYieldMax: 0.001,
    riskLevel: 0.4,  // Higher risk - MEV bots compete
    dailyProbability: 0.15,  // Rare opportunities
    requiredTraits: {
      onChainAffinity: 0.85,     // Must be extremely on-chain native
      analyticalAbility: 0.8,    // Must be analytical genius
      riskAppetite: 0.6,         // Must tolerate risk
      adaptationSpeed: 0.7,      // Must adapt quickly
    },
    gasCost: 0.01,
    // Capital lockup: 1 tick (instant execution, same block)
    lockupPeriodTicks: 1,
    allowsEarlyExit: false, // Can't exit mid-arbitrage
    earlyExitPenalty: 0,
    settlementDelayTicks: 0, // Immediate settlement
    yieldPayoutSchedule: 'continuous', // Profit realized immediately
    autoCompounds: false,
  },
  {
    id: 'dex_arb_triangular',
    name: '三角套利 (ETH-USDC-USDT)',
    type: 'arbitrage',
    description: 'ETH→USDC→USDT→ETH 三角套利，需要跨多个 DEX 执行，资金占用略长。',
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
    lockupPeriodTicks: 1,
    allowsEarlyExit: false,
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false,
  },
  
  // === LENDING / MONEY MARKET ===
  // Aave/Compound style - no lockup, instant withdrawal
  {
    id: 'aave_lend_usdc',
    name: 'Aave USDC 活期存款',
    type: 'lending',
    description: '在 Aave 存入 USDC 赚取浮动利息。可随时提取，无锁仓期。年化 3-8%，适合保守型策略。',
    minCapital: 10,
    maxCapital: 10000,
    dailyYieldMin: 0.00008,
    dailyYieldMax: 0.00022,
    riskLevel: 0.05,
    dailyProbability: 0.9,
    requiredTraits: {
      onChainAffinity: 0.3,
      riskAppetite: 0.2,
      savingsRate: 0.4,
    },
    gasCost: 0.002,
    lockupPeriodTicks: 0, // No lockup - instant withdrawal
    allowsEarlyExit: true,
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous', // Interest accrues continuously
    autoCompounds: false, // Need to manually withdraw or use aToken
  },
  {
    id: 'compound_lend_eth',
    name: 'Compound ETH 存款',
    type: 'lending',
    description: '在 Compound 存入 ETH 获得 cETH，赚取借贷利息。无锁仓，但 Gas 成本需要考虑。',
    minCapital: 0.01,
    maxCapital: 10,
    dailyYieldMin: 0.00006,
    dailyYieldMax: 0.00016,
    riskLevel: 0.08,
    dailyProbability: 0.85,
    requiredTraits: {
      onChainAffinity: 0.3,
      riskAppetite: 0.25,
    },
    gasCost: 0.003,
    lockupPeriodTicks: 0,
    allowsEarlyExit: true,
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false,
  },
  {
    id: 'fixed_lend_30d',
    name: '30天固定利率存款',
    type: 'lending',
    description: '固定期限存款，30天后到期。年化收益略高于活期，提前退出有 1% 罚金。',
    minCapital: 50,
    maxCapital: 20000,
    dailyYieldMin: 0.00014,  // ~5% APY
    dailyYieldMax: 0.00033,  // ~12% APY
    riskLevel: 0.1,
    dailyProbability: 0.6,
    requiredTraits: {
      onChainAffinity: 0.3,
      riskAppetite: 0.2,
      savingsRate: 0.5,
    },
    gasCost: 0.002,
    lockupPeriodTicks: 30, // 30 day lockup
    allowsEarlyExit: true,
    earlyExitPenalty: 0.01, // 1% penalty
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'maturity', // Yield paid at end
    autoCompounds: false,
  },
  
  // === LIQUIDITY POOL REWARDS ===
  // LP positions - can exit anytime but may have IL
  {
    id: 'lp_eth_usdc_aerodrome',
    name: 'Aerodrome ETH/USDC LP',
    type: 'lp_reward',
    description: '为 Aerodrome 提供 ETH/USDC 流动性，赚取手续费和 AERO 代币。可随时退出，但面临无常损失风险。',
    minCapital: 50,
    maxCapital: 20000,
    dailyYieldMin: 0.00027,
    dailyYieldMax: 0.00082,
    riskLevel: 0.45,
    dailyProbability: 0.95,
    requiredTraits: {
      onChainAffinity: 0.5,
      riskAppetite: 0.5,
    },
    gasCost: 0.008,
    lockupPeriodTicks: 0, // Can exit anytime
    allowsEarlyExit: true,
    earlyExitPenalty: 0, // No penalty, but IL applies
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false, // Rewards need to be claimed
  },
  {
    id: 'lp_usdc_usdt_curve',
    name: 'Curve USDC/USDT 稳定币 LP',
    type: 'lp_reward',
    description: '稳定币对 LP，低无常损失风险。适合风险偏好较低的参与者。',
    minCapital: 100,
    maxCapital: 50000,
    dailyYieldMin: 0.00014,
    dailyYieldMax: 0.00041,
    riskLevel: 0.25,
    dailyProbability: 0.95,
    requiredTraits: {
      onChainAffinity: 0.4,
      riskAppetite: 0.3,
    },
    gasCost: 0.006,
    lockupPeriodTicks: 0,
    allowsEarlyExit: true,
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false,
  },
  {
    id: 'lp_locked_7d',
    name: '7天锁定高收益 LP',
    type: 'lp_reward',
    description: '锁定 7 天获得额外奖励。提前退出损失 50% 累积收益。',
    minCapital: 100,
    maxCapital: 10000,
    dailyYieldMin: 0.00055,
    dailyYieldMax: 0.0014,
    riskLevel: 0.55,
    dailyProbability: 0.5,
    requiredTraits: {
      onChainAffinity: 0.5,
      riskAppetite: 0.6,
    },
    gasCost: 0.01,
    lockupPeriodTicks: 7,
    allowsEarlyExit: true,
    earlyExitPenalty: 0, // 50% of yield lost (handled separately)
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'maturity',
    autoCompounds: false,
  },
  {
    id: 'lp_altcoin_high_yield',
    name: '高风险山寨币 LP (30天锁)',
    type: 'lp_reward',
    description: '新兴代币的高收益流动性池，30天锁仓期。高无常损失和高 rugs 风险。',
    minCapital: 50,
    maxCapital: 5000,
    dailyYieldMin: 0.00055,
    dailyYieldMax: 0.0027,
    riskLevel: 0.75,
    dailyProbability: 0.4,
    requiredTraits: {
      onChainAffinity: 0.6,
      riskAppetite: 0.8,
    },
    gasCost: 0.01,
    lockupPeriodTicks: 30,
    allowsEarlyExit: false, // No early exit for high-risk farms
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false,
  },
  
  // === STAKING ===
  // ETH staking with unstaking period
  {
    id: 'stake_eth_lido',
    name: 'Lido ETH 流动性质押',
    type: 'staking',
    description: '质押 ETH 获得 stETH，可立即交易。收益自动复利。年化 3-4%。',
    minCapital: 0.01,
    maxCapital: 100,
    dailyYieldMin: 0.00008,
    dailyYieldMax: 0.00011,
    riskLevel: 0.15,
    dailyProbability: 0.95,
    requiredTraits: {
      onChainAffinity: 0.4,
      riskAppetite: 0.3,
    },
    gasCost: 0.004,
    lockupPeriodTicks: 0, // Liquid staking - no lockup
    allowsEarlyExit: true,
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: true, // stETH rebases
  },
  {
    id: 'stake_eth_native',
    name: '原生 ETH 质押 (有解锁期)',
    type: 'staking',
    description: '直接质押到 Beacon Chain，享受更高收益但有 3-7 天解锁期。',
    minCapital: 0.1,
    maxCapital: 100,
    dailyYieldMin: 0.0001,
    dailyYieldMax: 0.00014,
    riskLevel: 0.12,
    dailyProbability: 0.7,
    requiredTraits: {
      onChainAffinity: 0.5,
      riskAppetite: 0.3,
    },
    gasCost: 0.005,
    lockupPeriodTicks: 0, // No minimum, but unstaking takes time
    allowsEarlyExit: false,
    earlyExitPenalty: 0,
    settlementDelayTicks: 5, // 5 days to unstake
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false,
  },
  
  // === YIELD FARMING ===
  // Lock LP tokens for rewards
  {
    id: 'yield_farm_aero',
    name: 'Aerodrome 流动性挖矿 (7天锁)',
    type: 'yield_farming',
    description: '存入 LP 代币，锁定 7 天赚取 AERO 代币奖励 + 手续费。',
    minCapital: 100,
    maxCapital: 15000,
    dailyYieldMin: 0.00041,
    dailyYieldMax: 0.0014,
    riskLevel: 0.5,
    dailyProbability: 0.7,
    requiredTraits: {
      onChainAffinity: 0.6,
      riskAppetite: 0.6,
    },
    gasCost: 0.012,
    lockupPeriodTicks: 7,
    allowsEarlyExit: true,
    earlyExitPenalty: 0.1, // 10% of rewards burned
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false,
  },
  {
    id: 'yield_farm_30d',
    name: '高年化农场 (30天锁仓)',
    type: 'yield_farming',
    description: '30 天锁仓期，年化可达 50-200%。新协议，需谨慎评估合约风险。',
    minCapital: 200,
    maxCapital: 8000,
    dailyYieldMin: 0.0014,
    dailyYieldMax: 0.0055,
    riskLevel: 0.7,
    dailyProbability: 0.3,
    requiredTraits: {
      onChainAffinity: 0.7,
      riskAppetite: 0.8,
    },
    gasCost: 0.015,
    lockupPeriodTicks: 30,
    allowsEarlyExit: false,
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'weekly',
    autoCompounds: false,
  },
  
  // === MEV EXTRACTION ===
  // Instant, but requires significant capital
  {
    id: 'mev_sandwich',
    name: 'MEV 三明治攻击',
    type: 'mev',
    description: '检测大型交易，抢先买入后卖出。需要高资本和快速执行，单次操作。',
    minCapital: 1000,
    maxCapital: 50000,
    dailyYieldMin: 0,
    dailyYieldMax: 0.01,
    riskLevel: 0.85,
    dailyProbability: 0.1,
    requiredTraits: {
      onChainAffinity: 0.9,
      analyticalAbility: 0.9,
      riskAppetite: 0.9,
    },
    gasCost: 0.02,
    lockupPeriodTicks: 1,
    allowsEarlyExit: false,
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false,
  },
  {
    id: 'mev_arbitrage_flashloan',
    name: '闪电贷 MEV 套利',
    type: 'mev',
    description: '使用闪电贷无需本金即可套利。单块内完成，无资金占用风险但技术门槛极高。',
    minCapital: 0, // Flashloan - no capital needed
    maxCapital: 100000,
    dailyYieldMin: 0,
    dailyYieldMax: 0.02,
    riskLevel: 0.9,
    dailyProbability: 0.05,
    requiredTraits: {
      onChainAffinity: 0.95,
      analyticalAbility: 0.95,
      riskAppetite: 0.9,
    },
    gasCost: 0.03,
    lockupPeriodTicks: 1,
    allowsEarlyExit: false,
    earlyExitPenalty: 0,
    settlementDelayTicks: 0,
    yieldPayoutSchedule: 'continuous',
    autoCompounds: false,
  },
];

// Agent's DeFi portfolio tracker
export interface DeFiPortfolio {
  positions: DeFiPosition[];
  totalLockedCapital: number;
  totalAvailableCapital: number;
  totalAccumulatedYield: number;
  totalClaimedYield: number;
}

export const createEmptyPortfolio = (): DeFiPortfolio => ({
  positions: [],
  totalLockedCapital: 0,
  totalAvailableCapital: 0,
  totalAccumulatedYield: 0,
  totalClaimedYield: 0,
});

// Open a new DeFi position
export const openPosition = (
  event: DeFiEvent,
  capital: number,
  currentTick: number
): DeFiPosition => {
  return {
    eventId: event.id,
    eventName: event.name,
    type: event.type,
    capitalInvested: capital,
    entryTick: currentTick,
    maturityTick: currentTick + event.lockupPeriodTicks,
    accumulatedYield: 0,
    claimedYield: 0,
    status: 'active',
  };
};

// Calculate yield for a position based on elapsed time
export const calculatePositionYield = (
  position: DeFiPosition,
  event: DeFiEvent,
  currentTick: number
): number => {
  const elapsedTicks = currentTick - position.entryTick;
  
  // Use average yield for calculation
  const avgDailyYield = (event.dailyYieldMin + event.dailyYieldMax) / 2;
  
  // Add some randomness based on risk
  const volatility = event.riskLevel * 0.3;
  const randomFactor = 1 + (Math.random() - 0.5) * volatility;
  
  const grossYield = position.capitalInvested * avgDailyYield * elapsedTicks * randomFactor;
  
  return Math.max(0, grossYield);
};

// Check if position can be exited without penalty
export const canExitWithoutPenalty = (position: DeFiPosition, currentTick: number): boolean => {
  return currentTick >= position.maturityTick;
};

// Calculate early exit penalty
export const calculateEarlyExitPenalty = (
  position: DeFiPosition,
  event: DeFiEvent,
  currentTick: number
): { penaltyAmount: number; receiveAmount: number; lostYield: number } => {
  if (canExitWithoutPenalty(position, currentTick)) {
    return {
      penaltyAmount: 0,
      receiveAmount: position.capitalInvested,
      lostYield: 0,
    };
  }
  
  const capitalPenalty = position.capitalInvested * event.earlyExitPenalty;
  const lostYield = position.accumulatedYield * 0.5; // Lose 50% of unclaimed yield
  
  return {
    penaltyAmount: capitalPenalty,
    receiveAmount: position.capitalInvested - capitalPenalty,
    lostYield,
  };
};

// Exit a position
export const exitPosition = (
  position: DeFiPosition,
  event: DeFiEvent,
  currentTick: number
): { success: boolean; capitalReturned: number; yieldClaimed: number; penalty: number; message: string } => {
  if (position.status !== 'active') {
    return {
      success: false,
      capitalReturned: 0,
      yieldClaimed: 0,
      penalty: 0,
      message: '头寸不在活跃状态',
    };
  }
  
  if (!event.allowsEarlyExit && currentTick < position.maturityTick) {
    return {
      success: false,
      capitalReturned: 0,
      yieldClaimed: 0,
      penalty: 0,
      message: `${event.name} 在锁仓期内不允许提前退出`,
    };
  }
  
  const { penaltyAmount, receiveAmount, lostYield } = calculateEarlyExitPenalty(position, event, currentTick);
  const canExitClean = currentTick >= position.maturityTick;
  
  position.status = 'exiting';
  position.exitTick = currentTick;
  position.availableAfterTick = currentTick + event.settlementDelayTicks;
  
  // Claim accumulated yield (minus penalty)
  const yieldToClaim = canExitClean 
    ? position.accumulatedYield 
    : position.accumulatedYield - lostYield;
  
  position.claimedYield += yieldToClaim;
  
  const totalReturned = receiveAmount + yieldToClaim;
  
  let message = '';
  if (canExitClean) {
    message = `${event.name} 已退出，收回本金 $${receiveAmount.toFixed(2)}，收益 $${yieldToClaim.toFixed(2)}`;
  } else {
    message = `${event.name} 提前退出，扣除罚金 $${penaltyAmount.toFixed(2)}，损失收益 $${lostYield.toFixed(2)}，实际收回 $${totalReturned.toFixed(2)}`;
  }
  
  if (event.settlementDelayTicks > 0) {
    message += `，资金将在 ${event.settlementDelayTicks} 天后可用`;
  }
  
  return {
    success: true,
    capitalReturned: receiveAmount,
    yieldClaimed: yieldToClaim,
    penalty: penaltyAmount + lostYield,
    message,
  };
};

// Process all positions for a tick (accrue yield, handle settlements)
export const processPortfolioTick = (
  portfolio: DeFiPortfolio,
  currentTick: number
): { maturedPositions: DeFiPosition[]; settledPositions: DeFiPosition[]; accruedYield: number; messages: string[] } => {
  const messages: string[] = [];
  let totalAccrued = 0;
  const maturedPositions: DeFiPosition[] = [];
  const settledPositions: DeFiPosition[] = [];
  
  for (const position of portfolio.positions) {
    const event = DEFI_EVENTS.find(e => e.id === position.eventId);
    if (!event || position.status !== 'active') continue;
    
    // Accrue yield based on payout schedule
    const newYield = calculatePositionYield(position, event, currentTick) - position.accumulatedYield;
    position.accumulatedYield += newYield;
    totalAccrued += newYield;
    
    // Check if matured
    if (currentTick >= position.maturityTick && position.status === 'active') {
      maturedPositions.push(position);
      if (event.lockupPeriodTicks > 0) {
        messages.push(`🔓 ${event.name} 锁仓期已满，可随时退出`);
      }
    }
    
    // Handle settlements
    if (position.status === 'exiting' && position.availableAfterTick && currentTick >= position.availableAfterTick) {
      position.status = 'completed';
      settledPositions.push(position);
      messages.push(`✅ ${event.name} 资金已结算并可用`);
    }
    
    // Auto-compound if enabled
    if (event.autoCompounds && position.accumulatedYield > 1) {
      const compoundAmount = position.accumulatedYield;
      position.capitalInvested += compoundAmount;
      position.accumulatedYield = 0;
      messages.push(`🔄 ${event.name} 自动复利 $${compoundAmount.toFixed(2)}`);
    }
  }
  
  // Update portfolio totals
  portfolio.totalLockedCapital = portfolio.positions
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + p.capitalInvested, 0);
  
  portfolio.totalAccumulatedYield = portfolio.positions
    .reduce((sum, p) => sum + p.accumulatedYield, 0);
  
  portfolio.totalClaimedYield = portfolio.positions
    .reduce((sum, p) => sum + p.claimedYield, 0);
  
  return { maturedPositions, settledPositions, accruedYield: totalAccrued, messages };
};

// Calculate return for a NEW position (legacy function, kept for compatibility)
export const calculateDeFiReturn = (
  event: DeFiEvent,
  capital: number,
  expression: ExpressionResult
): { grossReturn: number; gasCost: number; netReturn: number; success: boolean; message: string } => {
  if (capital < event.minCapital) {
    return {
      grossReturn: 0,
      gasCost: 0,
      netReturn: 0,
      success: false,
      message: `资本不足，需要至少 $${event.minCapital} 参与 ${event.name}`,
    };
  }
  
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
  
  const actualCapital = Math.min(capital * 0.8, event.maxCapital);
  
  const yieldRange = event.dailyYieldMax - event.dailyYieldMin;
  const randomYield = event.dailyYieldMin + Math.random() * yieldRange;
  
  let adjustedYield = randomYield;
  const riskRoll = Math.random();
  
  if (riskRoll < event.riskLevel) {
    const lossSeverity = event.riskLevel * (1 + expression.riskAppetite * 0.5);
    adjustedYield = -randomYield * lossSeverity * 2;
  } else if (expression.analyticalAbility > 0.7) {
    adjustedYield *= (1 + (expression.analyticalAbility - 0.7) * 0.3);
  }
  
  const grossReturn = actualCapital * adjustedYield;
  const gasCost = event.gasCost;
  const netReturn = grossReturn - gasCost;
  
  const lockupMsg = event.lockupPeriodTicks > 0 
    ? ` (锁仓 ${event.lockupPeriodTicks} 天)` 
    : '';
  
  let message = '';
  if (netReturn > 0) {
    message = `${event.name}${lockupMsg} 获利 $${netReturn.toFixed(2)} (${(adjustedYield * 100).toFixed(3)}% 日收益)`;
  } else if (netReturn < 0) {
    message = `${event.name}${lockupMsg} 亏损 $${Math.abs(netReturn).toFixed(2)} (无常损失/滑点)`;
  } else {
    message = `${event.name}${lockupMsg} 收支平衡`;
  }
  
  return {
    grossReturn,
    gasCost,
    netReturn,
    success: netReturn > 0,
    message,
  };
};

// Get available events based on capital
export const getAvailableDeFiEvents = (capital: number): DeFiEvent[] => {
  return DEFI_EVENTS.filter(event => 
    capital >= event.minCapital && Math.random() < event.dailyProbability
  );
};

// Format APY
export const formatAPY = (dailyYield: number): string => {
  const apy = (Math.pow(1 + dailyYield, 365) - 1) * 100;
  if (apy < 10) return `${apy.toFixed(1)}%`;
  if (apy < 100) return `${apy.toFixed(0)}%`;
  return `${apy.toFixed(0)}%+`;
};

// Format lockup period
export const formatLockup = (ticks: number): string => {
  if (ticks === 0) return '无锁仓';
  if (ticks === 1) return '即时';
  if (ticks < 7) return `${ticks}天`;
  if (ticks === 7) return '7天';
  if (ticks === 30) return '30天';
  if (ticks < 90) return `${Math.floor(ticks / 7)}周`;
  return `${Math.floor(ticks / 30)}月`;
};

// Event summary for frontend
export const getDeFiEventSummary = (): Array<{ 
  name: string; 
  apy: string; 
  risk: string;
  lockup: string;
  earlyExit: string;
}> => {
  return DEFI_EVENTS.map(event => ({
    name: event.name,
    apy: formatAPY((event.dailyYieldMin + event.dailyYieldMax) / 2),
    risk: event.riskLevel < 0.2 ? '低风险' : event.riskLevel < 0.5 ? '中风险' : '高风险',
    lockup: formatLockup(event.lockupPeriodTicks),
    earlyExit: event.allowsEarlyExit 
      ? event.earlyExitPenalty > 0 
        ? `可提前退出 (${(event.earlyExitPenalty * 100).toFixed(0)}%罚金)` 
        : '可随时退出'
      : '锁仓期内不可退出',
  }));
};
