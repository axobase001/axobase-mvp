/**
 * LLM Inference
 * Supports: OpenRouter (multi-model), Kimi Official API, Local Ollama
 * 
 * Integrated with Umbilical Monitor for maternal health tracking
 */

import { umbilicalMonitor } from '../monitoring/umbilical-monitor.js';

export interface InferenceOptions {
  model?: 'local' | 'api' | 'kimi';
  maxTokens?: number;
  temperature?: number;
}

export interface InferenceResult {
  text: string;
  model: string;
  costUSD: number;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const KIMI_URL = 'https://api.moonshot.cn/v1/chat/completions';

// Model pricing per million tokens
const MODEL_PRICING: Record<string, { input: number; output: number; name: string }> = {
  'qwen/qwen-2.5-7b-instruct': { input: 0.05, output: 0.05, name: 'Qwen 2.5 7B' },
  'kimi/kimi-k2-5': { input: 0.50, output: 0.50, name: 'Kimi K2.5' },
  'kimi/kimi-k1-5': { input: 0.50, output: 0.50, name: 'Kimi K1.5' },
  'deepseek/deepseek-chat': { input: 0.50, output: 0.50, name: 'DeepSeek V3' },
  'deepseek/deepseek-r1': { input: 0.55, output: 2.19, name: 'DeepSeek R1' },
  'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0, name: 'Claude 3.5 Sonnet' },
};

// Kimi official pricing (RMB per 1M tokens) - ¥0.5 per 1M tokens
const KIMI_PRICING = { input: 0.5, output: 0.5, name: 'Kimi K2.5 (Official)' };

// USD to RMB exchange rate (approximate)
const USD_TO_RMB = 7.2;

// Get configured provider
const getProvider = (): 'openrouter' | 'kimi' => {
  return (process.env.LLM_PROVIDER as 'openrouter' | 'kimi') || 'openrouter';
};

// Get configured model from env
const getConfiguredModel = (): string => {
  return process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct';
};

// Estimate cost based on actual model pricing
const estimateCost = (prompt: string, maxTokens: number, model: string): number => {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['qwen/qwen-2.5-7b-instruct'];
  const promptTokens = prompt.length / 4;
  const outputTokens = maxTokens;
  
  const inputCost = (promptTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  
  return inputCost + outputCost;
};

// Estimate cost for Kimi official API (returns USD equivalent)
const estimateKimiCost = (prompt: string, maxTokens: number): number => {
  const promptTokens = prompt.length / 4;
  const outputTokens = maxTokens;
  
  // Price in RMB, convert to USD
  const inputCostRMB = (promptTokens / 1000000) * KIMI_PRICING.input;
  const outputCostRMB = (outputTokens / 1000000) * KIMI_PRICING.output;
  
  return (inputCostRMB + outputCostRMB) / USD_TO_RMB;
};

// Get model name for display
const getModelName = (model: string): string => {
  return MODEL_PRICING[model]?.name || model;
};

export const callLLM = async (
  prompt: string,
  options: InferenceOptions = {}
): Promise<InferenceResult> => {
  const { model = 'api', maxTokens = 100, temperature = 0.7 } = options;
  
  if (model === 'local') {
    return callLocalOllama(prompt, maxTokens, temperature);
  }
  
  // Check if using Kimi official API
  const provider = getProvider();
  if (provider === 'kimi') {
    return callKimiOfficial(prompt, maxTokens, temperature);
  }
  
  return callOpenRouter(prompt, maxTokens, temperature);
};

const callOpenRouter = async (
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<InferenceResult> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }
  
  const configuredModel = getConfiguredModel();
  const startTime = Date.now();
  
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://axobase.io',
      'X-Title': 'Axobase MVP',
    },
    body: JSON.stringify({
      model: configuredModel,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });
  
  const latency = Date.now() - startTime;
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;
  const text = data.choices?.[0]?.message?.content || '';
  const actualModel = data.model || configuredModel;
  
  // Record to umbilical monitor (estimate 1600 tokens per call)
  umbilicalMonitor.recordApiCall(latency, 1600);
  
  return {
    text: text.trim(),
    model: getModelName(actualModel),
    costUSD: estimateCost(prompt, maxTokens, actualModel),
  };
};

const callKimiOfficial = async (
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<InferenceResult> => {
  const apiKey = process.env.KIMI_API_KEY;
  
  if (!apiKey) {
    throw new Error('KIMI_API_KEY not configured');
  }
  
  const startTime = Date.now();
  
  const response = await fetch(KIMI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kimi-k2-5',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });
  
  const latency = Date.now() - startTime;
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${response.status} - ${error}`);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;
  const text = data.choices?.[0]?.message?.content || '';
  
  // Record to umbilical monitor
  umbilicalMonitor.recordApiCall(latency, 1600);
  
  return {
    text: text.trim(),
    model: KIMI_PRICING.name,
    costUSD: estimateKimiCost(prompt, maxTokens),
  };
};

const callLocalOllama = async (
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<InferenceResult> => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:8b',
      prompt,
      stream: false,
      options: {
        num_predict: maxTokens,
        temperature,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;
  
  return {
    text: (data.response || '').trim(),
    model: 'llama3:8b',
    costUSD: 0,
  };
};

// Get cost estimate for a single inference call
export const getInferenceCostEstimate = (model?: string): number => {
  const provider = getProvider();
  if (provider === 'kimi') {
    // Typical call: ~1,600 tokens (1,300 input + 300 output)
    return estimateKimiCost('a'.repeat(5200), 300);
  }
  
  const m = model || getConfiguredModel();
  return estimateCost('a'.repeat(5200), 300, m);
};

// Get pricing info for display
export const getModelPricingInfo = (): Array<{ model: string; name: string; costPerCall: string }> => {
  const openRouterModels = Object.entries(MODEL_PRICING).map(([model, pricing]) => ({
    model,
    name: pricing.name,
    costPerCall: `~$${((1600 / 1000000) * (pricing.input + pricing.output * 0.2)).toFixed(4)}`,
  }));
  
  // Add Kimi official
  const kimiCost = estimateKimiCost('a'.repeat(5200), 300);
  openRouterModels.push({
    model: 'kimi-official',
    name: 'Kimi K2.5 (Official API)',
    costPerCall: `~$${kimiCost.toFixed(4)} (~¥${(kimiCost * USD_TO_RMB).toFixed(4)})`,
  });
  
  return openRouterModels;
};
