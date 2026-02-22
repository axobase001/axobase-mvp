/**
 * Decision Engine
 * Main orchestrator for agent decision making
 */

import { ExpressionResult, DynamicGenome, expressGenome } from '../genome/index.js';
import { Strategy } from './strategies.js';
import { filterStrategies, isEmergencyMode, getEmergencyStrategies } from './framework.js';
import { buildDecisionPrompt } from './prompt.js';
import { callLLM, InferenceResult } from './inference.js';
import { perceive, PerceptionResult } from './perceive.js';

export interface Decision {
  selectedStrategy: Strategy;
  selectedAction: {
    type: string;
    params: Record<string, unknown>;
  };
  reasoning: string;
  confidence: number;
  costEstimate: number;
}

export interface DecisionEngineConfig {
  agentId: string;
  llmProvider: 'local' | 'api';
  logDecisions?: boolean;
}

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private decisionHistory: Array<{ tick: number; decision: Decision; result: string }> = [];

  constructor(config: DecisionEngineConfig) {
    this.config = config;
  }

  async decide(
    perception: PerceptionResult,
    genome: DynamicGenome
  ): Promise<Decision> {
    const expression = expressGenome(genome);
    const balance = perception.balance.usdc;
    
    const availableStrategies = isEmergencyMode(balance)
      ? getEmergencyStrategies(balance)
      : filterStrategies(expression, balance);
    
    if (availableStrategies.length === 0) {
      return this.createFallbackDecision();
    }
    
    const prompt = buildDecisionPrompt({
      agentId: this.config.agentId,
      balance,
      filteredStrategies: availableStrategies,
      recentActions: [],
      perception: {
        ethBalance: perception.balance.eth,
        usdcBalance: perception.balance.usdc,
        tick: perception.tick,
        agentCount: perception.agents.count,
        averageAgentBalance: perception.agents.averageBalance,
        recentSuccessRate: perception.memory.lastActionSuccess ? 1 : 0,
      },
      expressedTraits: expression,
    });
    
    let llmResult: InferenceResult;
    try {
      llmResult = await callLLM(prompt, { model: this.config.llmProvider });
    } catch (error) {
      return this.createFallbackDecision();
    }
    
    return this.parseDecision(llmResult.text, availableStrategies, expression);
  }

  private parseDecision(
    llmText: string,
    availableStrategies: Strategy[],
    expression: ExpressionResult
  ): Decision {
    const match = llmText.match(/ACTION:\s*(\d+)/i);
    const actionIndex = match ? parseInt(match[1], 10) - 1 : 0;
    
    const strategy = availableStrategies[Math.min(actionIndex, availableStrategies.length - 1)]
      || availableStrategies[0];
    
    const reasonMatch = llmText.match(/REASON:\s*(.+)/i);
    const reasoning = reasonMatch ? reasonMatch[1].trim() : 'No reasoning provided';
    
    return {
      selectedStrategy: strategy,
      selectedAction: {
        type: strategy.id,
        params: {},
      },
      reasoning,
      confidence: this.calculateConfidence(strategy, expression),
      costEstimate: strategy.estimatedCostPerExecution,
    };
  }

  private calculateConfidence(strategy: Strategy, expression: ExpressionResult): number {
    let confidence = 0.5;
    
    if (strategy.riskLevel <= expression.riskAppetite) {
      confidence += 0.2;
    }
    
    if (strategy.requiresHuman && expression.humanDependence > 0.5) {
      confidence += 0.15;
    }
    
    return Math.min(1, confidence);
  }

  private createFallbackDecision(): Decision {
    const idleStrategy = getEmergencyStrategies(0)[0];
    
    return {
      selectedStrategy: idleStrategy,
      selectedAction: {
        type: 'idle_conservation',
        params: { reason: 'fallback' },
      },
      reasoning: 'Decision engine failed or no strategies available',
      confidence: 0.3,
      costEstimate: 0.001,
    };
  }

  recordDecision(tick: number, decision: Decision, result: string): void {
    this.decisionHistory.push({ tick, decision, result });
    
    if (this.decisionHistory.length > 100) {
      this.decisionHistory.shift();
    }
  }

  getDecisionHistory(): typeof this.decisionHistory {
    return [...this.decisionHistory];
  }
}
