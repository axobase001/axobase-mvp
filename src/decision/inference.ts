/**
 * LLM Inference
 * Calls OpenRouter for agent decision making
 * Supports: Qwen (cheap), Kimi (better Chinese), DeepSeek (good reasoning)
 */

interface InferenceOptions {
  model?: 'local' | 'api';
  maxTokens?: number;
  temperature?: number;
}

interface InferenceResult {
  text: string;
  model: string;
  costUSD: number;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model pricing per million tokens (from cost analysis)
const MODEL_PRICING: Record<string, { input: number; output: number; name: string }> = {
  'qwen/qwen-2.5-7b-instruct': { input: 0.05, output: 0.05, name: 'Qwen 2.5 7B' },
  'kimi/kimi-k2-5': { input: 0.50, output: 0.50, name: 'Kimi K2.5' },
  'kimi/kimi-k1-5': { input: 0.50, output: 0.50, name: 'Kimi K1.5' },
  'deepseek/deepseek-chat': { input: 0.50, output: 0.50, name: 'DeepSeek V3' },
  'deepseek/deepseek-r1': { input: 0.55, output: 2.19, name: 'DeepSeek R1' },
  'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0, name: 'Claude 3.5 Sonnet' },
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
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  const actualModel = data.model || configuredModel;
  
  return {
    text: text.trim(),
    model: getModelName(actualModel),
    costUSD: estimateCost(prompt, maxTokens, actualModel),
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
  
  const data = await response.json();
  
  return {
    text: (data.response || '').trim(),
    model: 'llama3:8b',
    costUSD: 0,
  };
};

// Get cost estimate for a single inference call
export const getInferenceCostEstimate = (model?: string): number => {
  const m = model || getConfiguredModel();
  // Typical call: ~1,600 tokens (1,300 input + 300 output)
  return estimateCost('a'.repeat(5200), 300, m); // 5200 chars ≈ 1300 tokens
};

// Get pricing info for display
export const getModelPricingInfo = (): Array<{ model: string; name: string; costPerCall: string }> => {
  return Object.entries(MODEL_PRICING).map(([model, pricing]) => ({
    model,
    name: pricing.name,
    costPerCall: `~$${((1600 / 1000000) * (pricing.input + pricing.output * 0.2)).toFixed(4)}`,
  }));
};
