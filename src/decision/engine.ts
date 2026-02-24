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
    index: number;  // 1-based action number from LLM
  };
  reasoning: string;
  confidence: number;   // 0-1 scale (LLM's 0-100 divided by 100)
  emotion: string;      // LLM self-reported emotional state
  costEstimate: number;
  // Full conversation record — populated on real LLM calls
  rawPrompt?: string;
  rawResponse?: string;
  llmModel?: string;
  llmCostUSD?: number;
}

export interface DecisionEngineConfig {
  agentId: string;
  llmProvider: 'local' | 'api';
  logDecisions?: boolean;
}

// ─── Language Detection ───────────────────────────────────────────────────────

export function detectLanguage(text: string): 'zh' | 'en' | 'mixed' {
  const chineseChars = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const totalChars = text.replace(/\s/g, '').length;

  if (totalChars === 0) return 'en';

  const chineseRatio = chineseChars / totalChars;
  if (chineseRatio > 0.3) return 'zh';
  if (chineseRatio < 0.05) return 'en';
  return 'mixed';
}

// ─── Engine ───────────────────────────────────────────────────────────────────

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
      // Use maxTokens=300 to fit JSON response with reasoning
      llmResult = await callLLM(prompt, { model: this.config.llmProvider, maxTokens: 300 });
    } catch (error) {
      return this.createFallbackDecision();
    }

    const decision = this.parseDecision(llmResult.text, availableStrategies);
    decision.rawPrompt = prompt;
    decision.rawResponse = llmResult.text;
    decision.llmModel = llmResult.model;
    decision.llmCostUSD = llmResult.costUSD;
    return decision;
  }

  private parseDecision(
    llmText: string,
    availableStrategies: Strategy[]
  ): Decision {
    // Try JSON parse first
    try {
      // Strip markdown code fences if present
      const cleaned = llmText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      // Find JSON object in response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const actionNum = typeof parsed.action === 'number' ? parsed.action : parseInt(String(parsed.action), 10);
        const actionIndex = Number.isInteger(actionNum) ? Math.max(1, Math.min(actionNum, availableStrategies.length)) : 1;
        const strategy = availableStrategies[actionIndex - 1] || availableStrategies[0];
        const rawConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : 50;
        return {
          selectedStrategy: strategy,
          selectedAction: { type: strategy.id, params: {}, index: actionIndex },
          reasoning: String(parsed.reasoning || 'No reasoning provided').slice(0, 500),
          confidence: Math.max(0, Math.min(100, rawConfidence)) / 100,
          emotion: String(parsed.emotion || 'unknown').slice(0, 32),
          costEstimate: strategy.estimatedCostPerExecution,
        };
      }
    } catch { /* fall through to legacy parser */ }

    // Legacy fallback: ACTION: N | REASON: text
    const match = llmText.match(/ACTION:\s*(\d+)/i);
    const actionIndex = match ? parseInt(match[1], 10) : 1;
    const strategy = availableStrategies[Math.min(actionIndex - 1, availableStrategies.length - 1)] || availableStrategies[0];
    const reasonMatch = llmText.match(/REASON:\s*(.+)/i);
    const reasoning = reasonMatch ? reasonMatch[1].trim() : llmText.slice(0, 200);

    return {
      selectedStrategy: strategy,
      selectedAction: { type: strategy.id, params: {}, index: actionIndex },
      reasoning,
      confidence: 0.5,   // default when LLM didn't output JSON
      emotion: 'unknown',
      costEstimate: strategy.estimatedCostPerExecution,
    };
  }

  private createFallbackDecision(): Decision {
    const idleStrategy = getEmergencyStrategies(0)[0];
    return {
      selectedStrategy: idleStrategy,
      selectedAction: { type: 'idle_conservation', params: { reason: 'fallback' }, index: 1 },
      reasoning: 'Decision engine failed or no strategies available',
      confidence: 0,
      emotion: 'confused',
      costEstimate: 0.001,
    };
  }

  recordDecision(tick: number, decision: Decision, result: string): void {
    this.decisionHistory.push({ tick, decision, result });
    if (this.decisionHistory.length > 100) this.decisionHistory.shift();
  }

  getDecisionHistory(): typeof this.decisionHistory {
    return [...this.decisionHistory];
  }
}
