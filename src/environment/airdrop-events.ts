/**
 * Airdrop Events for DeFi Participants
 * 
 * Random airdrops to agents who participate in DeFi
 * Tokens != Cash - agents must decide whether to hold or sell
 * 
 * Key mechanics:
 * - Airdrops are random but more likely for active DeFi participants
 * - Tokens have volatile value that changes over time
 * - Selling gives immediate USDC but may miss future gains
 * - Holding risks the token going to zero
 */

import { ExpressionResult } from '../genome/types.js';

export interface TokenAirdrop {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  amount: number;           // Number of tokens received
  initialValueUSDC: number; // Value at airdrop time
  currentValueUSDC: number; // Current value (fluctuates)
  volatility: number;       // 0-1, how much price moves
  receivedTick: number;
  expiryTick?: number;      // Some airdrops expire (claim deadline)
}

// Token price trajectory types
export type PriceTrajectory = 'pump_dump' | 'steady_growth' | 'slow_decay' | 'rug_pull' | 'moon';

interface TokenPriceModel {
  trajectory: PriceTrajectory;
  startPrice: number;
  volatility: number;
  decayRate: number;
  pumpProbability: number;
}

// Airdrop eligibility based on DeFi activity
export interface AirdropEligibility {
  minDeFiPositions: number;      // Must have opened at least X positions
  minCapitalDeployed: number;    // Must have deployed at least $X
  minTicksActive: number;        // Must have been active for X ticks
  protocolsUsed: string[];       // Must have used specific protocols
}

// Possible airdrops with their characteristics
export const AIRDROP_OPPORTUNITIES = [
  {
    id: 'aero_governance',
    tokenSymbol: 'AERO',
    tokenName: 'Aerodrome Governance',
    minAmount: 100,
    maxAmount: 5000,
    initialValueRange: [0.1, 0.5], // $0.1 to $0.5 per token initially
    volatility: 0.3,
    probability: 0.05, // 5% chance per tick for eligible agents
    eligibility: {
      minDeFiPositions: 2,
      minCapitalDeployed: 200,
      minTicksActive: 7,
      protocolsUsed: ['aerodrome'],
    },
    trajectoryWeights: { pump_dump: 0.3, steady_growth: 0.3, slow_decay: 0.3, rug_pull: 0.05, moon: 0.05 },
  },
  {
    id: 'new_protocol_launch',
    tokenSymbol: 'NEWB',
    tokenName: 'NewDeFi Protocol',
    minAmount: 50,
    maxAmount: 2000,
    initialValueRange: [0.05, 0.2],
    volatility: 0.6,
    probability: 0.02,
    eligibility: {
      minDeFiPositions: 1,
      minCapitalDeployed: 100,
      minTicksActive: 3,
      protocolsUsed: [],
    },
    trajectoryWeights: { pump_dump: 0.4, steady_growth: 0.1, slow_decay: 0.2, rug_pull: 0.2, moon: 0.1 },
  },
  {
    id: 'loyalty_reward',
    tokenSymbol: 'LOYAL',
    tokenName: 'Platform Loyalty',
    minAmount: 200,
    maxAmount: 1000,
    initialValueRange: [0.01, 0.05],
    volatility: 0.2,
    probability: 0.08,
    eligibility: {
      minDeFiPositions: 5,
      minCapitalDeployed: 500,
      minTicksActive: 14,
      protocolsUsed: [],
    },
    trajectoryWeights: { pump_dump: 0.1, steady_growth: 0.5, slow_decay: 0.3, rug_pull: 0.05, moon: 0.05 },
  },
  {
    id: 'meme_token_gamble',
    tokenSymbol: 'MEME',
    tokenName: 'Random Meme Coin',
    minAmount: 10000,
    maxAmount: 100000,
    initialValueRange: [0.0001, 0.001],
    volatility: 0.9,
    probability: 0.03,
    eligibility: {
      minDeFiPositions: 1,
      minCapitalDeployed: 50,
      minTicksActive: 1,
      protocolsUsed: [],
    },
    trajectoryWeights: { pump_dump: 0.5, steady_growth: 0, slow_decay: 0.2, rug_pull: 0.25, moon: 0.05 },
  },
];

// Agent's token holdings
export interface TokenPortfolio {
  holdings: Map<string, TokenAirdrop>;  // tokenId -> airdrop
  totalCurrentValue: number;
  totalInitialValue: number;
  realizedProfits: number;  // From selling
  unrealizedPnl: number;    // Current - initial
}

export const createEmptyTokenPortfolio = (): TokenPortfolio => ({
  holdings: new Map(),
  totalCurrentValue: 0,
  totalInitialValue: 0,
  realizedProfits: 0,
  unrealizedPnl: 0,
});

// Check if agent is eligible for airdrop
export const checkAirdropEligibility = (
  agentId: string,
  defiPositionsOpened: number,
  totalCapitalDeployed: number,
  ticksActive: number,
  protocolsUsed: string[]
): typeof AIRDROP_OPPORTUNITIES[0] | null => {
  for (const airdrop of AIRDROP_OPPORTUNITIES) {
    const elig = airdrop.eligibility;
    
    // Check all eligibility criteria
    if (defiPositionsOpened < elig.minDeFiPositions) continue;
    if (totalCapitalDeployed < elig.minCapitalDeployed) continue;
    if (ticksActive < elig.minTicksActive) continue;
    
    // Check protocol requirements (if any specified)
    if (elig.protocolsUsed.length > 0) {
      const hasRequiredProtocol = elig.protocolsUsed.some(p => protocolsUsed.includes(p));
      if (!hasRequiredProtocol) continue;
    }
    
    // Random chance
    if (Math.random() < airdrop.probability) {
      return airdrop;
    }
  }
  return null;
};

// Generate a random airdrop for eligible agent
export const generateAirdrop = (
  opportunity: typeof AIRDROP_OPPORTUNITIES[0],
  currentTick: number
): TokenAirdrop => {
  const amount = opportunity.minAmount + 
    Math.random() * (opportunity.maxAmount - opportunity.minAmount);
  const initialPrice = opportunity.initialValueRange[0] + 
    Math.random() * (opportunity.initialValueRange[1] - opportunity.initialValueRange[0]);
  const initialValue = amount * initialPrice;
  
  return {
    id: `${opportunity.id}_${currentTick}_${Math.random().toString(36).substr(2, 9)}`,
    tokenSymbol: opportunity.tokenSymbol,
    tokenName: opportunity.tokenName,
    amount: Math.floor(amount),
    initialValueUSDC: initialValue,
    currentValueUSDC: initialValue,
    volatility: opportunity.volatility,
    receivedTick: currentTick,
  };
};

// Simulate token price movement
const simulatePriceMovement = (
  token: TokenAirdrop,
  trajectory: PriceTrajectory,
  ticksElapsed: number
): number => {
  const initialPrice = token.initialValueUSDC / token.amount;
  let currentPrice = initialPrice;
  
  switch (trajectory) {
    case 'pump_dump':
      // Pump for 3-7 ticks, then dump
      if (ticksElapsed <= 5) {
        currentPrice *= (1 + ticksElapsed * 0.2); // +20% per tick
      } else {
        currentPrice *= (1.5 * Math.pow(0.7, ticksElapsed - 5)); // Dump 30% per tick after
      }
      break;
      
    case 'steady_growth':
      // Slow steady growth with small dips
      currentPrice *= Math.pow(1.03, ticksElapsed); // 3% per tick
      currentPrice *= (1 + (Math.random() - 0.5) * 0.1); // ±5% noise
      break;
      
    case 'slow_decay':
      // Gradual decline
      currentPrice *= Math.pow(0.95, ticksElapsed); // -5% per tick
      break;
      
    case 'rug_pull':
      // Sudden collapse after 2-5 ticks
      if (ticksElapsed <= 3) {
        currentPrice *= (1 + ticksElapsed * 0.1);
      } else {
        currentPrice *= 0.01; // -99%
      }
      break;
      
    case 'moon':
      // Parabolic growth (rare)
      currentPrice *= Math.pow(1.15, ticksElapsed); // 15% per tick
      currentPrice *= (1 + (Math.random() - 0.3) * 0.2);
      break;
  }
  
  // Ensure price doesn't go negative
  return Math.max(0.000001, currentPrice) * token.amount;
};

// Update all token values in portfolio
export const updateTokenValues = (
  portfolio: TokenPortfolio,
  currentTick: number
): { messages: string[]; significantChanges: TokenAirdrop[] } => {
  const messages: string[] = [];
  const significantChanges: TokenAirdrop[] = [];
  
  portfolio.totalCurrentValue = 0;
  portfolio.totalInitialValue = 0;
  
  for (const [tokenId, token] of portfolio.holdings) {
    const ticksHeld = currentTick - token.receivedTick;
    if (ticksHeld < 1) continue;
    
    // Determine trajectory (random but weighted)
    const opportunity = AIRDROP_OPPORTUNITIES.find(a => tokenId.startsWith(a.id));
    if (!opportunity) continue;
    
    const weights = opportunity.trajectoryWeights;
    const roll = Math.random();
    let trajectory: PriceTrajectory = 'slow_decay';
    let cumulative = 0;
    
    for (const [traj, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll <= cumulative) {
        trajectory = traj as PriceTrajectory;
        break;
      }
    }
    
    const oldValue = token.currentValueUSDC;
    token.currentValueUSDC = simulatePriceMovement(token, trajectory, ticksHeld);
    
    const change = token.currentValueUSDC - oldValue;
    const changePct = (change / oldValue) * 100;
    
    portfolio.totalCurrentValue += token.currentValueUSDC;
    portfolio.totalInitialValue += token.initialValueUSDC;
    
    // Report significant changes (>20% move)
    if (Math.abs(changePct) > 20) {
      significantChanges.push(token);
      const emoji = change > 0 ? '🚀' : '📉';
      messages.push(`${emoji} ${token.tokenSymbol} 价格变动: ${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% (现值: $${token.currentValueUSDC.toFixed(2)})`);
    }
    
    // Report if token is nearly worthless
    if (token.currentValueUSDC < token.initialValueUSDC * 0.05 && token.currentValueUSDC > 0.01) {
      messages.push(`⚠️ ${token.tokenSymbol} 几乎归零 (损失 ${((1 - token.currentValueUSDC / token.initialValueUSDC) * 100).toFixed(0)}%)`);
    }
  }
  
  portfolio.unrealizedPnl = portfolio.totalCurrentValue - portfolio.totalInitialValue;
  
  return { messages, significantChanges };
};

// Decision to sell tokens
export const sellTokens = (
  portfolio: TokenPortfolio,
  tokenId: string,
  percentage: number, // 0-1, what % to sell
  currentTick: number
): { success: boolean; usdcReceived: number; message: string } => {
  const token = portfolio.holdings.get(tokenId);
  if (!token) {
    return { success: false, usdcReceived: 0, message: 'Token not found in portfolio' };
  }
  
  const sellAmount = token.currentValueUSDC * percentage;
  const costBasis = token.initialValueUSDC * percentage;
  const profit = sellAmount - costBasis;
  
  // Update token holdings
  token.amount *= (1 - percentage);
  token.initialValueUSDC *= (1 - percentage);
  token.currentValueUSDC *= (1 - percentage);
  
  // If fully sold, remove from holdings
  if (percentage >= 0.99) {
    portfolio.holdings.delete(tokenId);
  }
  
  portfolio.realizedProfits += profit;
  
  const profitEmoji = profit > 0 ? '💰' : '😢';
  const action = percentage >= 0.99 ? '全部卖出' : `卖出 ${(percentage * 100).toFixed(0)}%`;
  
  return {
    success: true,
    usdcReceived: sellAmount,
    message: `${profitEmoji} ${action} ${token.tokenSymbol}: 获得 $${sellAmount.toFixed(2)} (盈亏: ${profit > 0 ? '+' : ''}$${profit.toFixed(2)})`,
  };
};

// Decision to hold (no immediate action, just record the decision)
export const holdTokens = (
  portfolio: TokenPortfolio,
  tokenId: string,
  reasoning: string
): { message: string } => {
  const token = portfolio.holdings.get(tokenId);
  if (!token) {
    return { message: 'Token not found' };
  }
  
  const unrealizedPnL = token.currentValueUSDC - token.initialValueUSDC;
  const pnlEmoji = unrealizedPnL > 0 ? '📈' : '📉';
  
  return {
    message: `${pnlEmoji} 持有 ${token.tokenSymbol}: 未实现盈亏 ${unrealizedPnL > 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)} - ${reasoning}`,
  };
};

// Get airdrop summary for display
export const getAirdropSummary = (portfolio: TokenPortfolio): Array<{
  symbol: string;
  amount: number;
  currentValue: string;
  pnl: string;
  recommendation: string;
}> => {
  return Array.from(portfolio.holdings.values()).map(token => {
    const pnl = token.currentValueUSDC - token.initialValueUSDC;
    const pnlPct = (pnl / token.initialValueUSDC) * 100;
    
    let recommendation = 'HOLD';
    if (pnlPct > 100) recommendation = '考虑部分卖出';
    if (pnlPct < -50) recommendation = '可能归零，考虑止损';
    if (pnlPct > 500) recommendation = '暴利，建议卖出大部分';
    
    return {
      symbol: token.tokenSymbol,
      amount: token.amount,
      currentValue: `$${token.currentValueUSDC.toFixed(2)}`,
      pnl: `${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(0)}%)`,
      recommendation,
    };
  });
};
