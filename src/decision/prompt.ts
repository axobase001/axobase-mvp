/**
 * LLM Prompt Builder
 * Constructs prompts for agent decision making
 */

import { ExpressionResult } from '../genome/types.js';
import { Strategy } from './strategies.js';

interface ActionRecord {
  timestamp: number;
  strategyId: string;
  success: boolean;
  costUSDC: number;
  result: string;
}

interface PerceptionResult {
  ethBalance: number;
  usdcBalance: number;
  tick: number;
  agentCount: number;
  averageAgentBalance: number;
  recentSuccessRate: number;
}

interface PromptParams {
  agentId: string;
  balance: number;
  filteredStrategies: Strategy[];
  recentActions: ActionRecord[];
  perception: PerceptionResult;
  expressedTraits: ExpressionResult;
}

const formatTraits = (traits: ExpressionResult): string => {
  return [
    `风险偏好: ${(traits.riskAppetite * 100).toFixed(0)}%`,
    `链上亲和: ${(traits.onChainAffinity * 100).toFixed(0)}%`,
    `合作倾向: ${(traits.cooperationTendency * 100).toFixed(0)}%`,
    `储蓄率: ${(traits.savingsRate * 100).toFixed(0)}%`,
    `推理质量偏好: ${(traits.inferenceQuality * 100).toFixed(0)}%`,
    `创造力: ${(traits.creativeAbility * 100).toFixed(0)}%`,
    `分析能力: ${(traits.analyticalAbility * 100).toFixed(0)}%`,
    `人类依赖: ${(traits.humanDependence * 100).toFixed(0)}%`,
    `适应速度: ${(traits.adaptationSpeed * 100).toFixed(0)}%`,
    `应激响应: ${(traits.stressResponse * 100).toFixed(0)}%`,
  ].join('\n  ');
};

const formatRecentActions = (actions: ActionRecord[]): string => {
  if (actions.length === 0) return '无';
  return actions
    .slice(-5)
    .map(a => `- ${a.strategyId}: ${a.success ? '成功' : '失败'} (${a.costUSDC.toFixed(3)} USDC)`)
    .join('\n  ');
};

const formatStrategies = (strategies: Strategy[]): string => {
  return strategies
    .slice(0, 8)
    .map((s, i) => `${i + 1}. [${s.id}] ${s.name}\n     风险: ${(s.riskLevel * 100).toFixed(0)}% | 成本: ${s.estimatedCostPerExecution.toFixed(3)} USDC | ${s.description}`)
    .join('\n\n  ');
};

export const buildDecisionPrompt = (params: PromptParams): string => {
  const { agentId, balance, filteredStrategies, recentActions, perception, expressedTraits } = params;
  
  const emergencyNote = balance < 2 
    ? '\n⚠️ EMERGENCY MODE: Balance critically low.\n' 
    : '';
  
  return `你是 Axobase 网络中的一个自主 AI agent。

=== 身份信息 ===
Agent ID: ${agentId}
生存 Tick: ${perception.tick}

=== 你的状态 ===
余额: ${balance.toFixed(2)} USDC
ETH Gas: ${perception.ethBalance.toFixed(4)} ETH${emergencyNote}

=== 你的行为倾向（由基因组决定，你无法改变）===
  ${formatTraits(expressedTraits)}

=== 环境感知 ===
种群中其他 agent: ${perception.agentCount} 个
平均余额: ${perception.averageAgentBalance.toFixed(2)} USDC
你最近的成功率: ${(perception.recentSuccessRate * 100).toFixed(0)}%

=== 最近 5 次行动 ===
  ${formatRecentActions(recentActions)}

=== 你现在可以选择的行动 ===
  ${formatStrategies(filteredStrategies)}

你必须选择一个行动。只输出行动编号和简短理由。
格式：ACTION: <编号> | REASON: <一句话>`;
};
