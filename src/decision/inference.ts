/**
 * LLM Inference
 * Calls OpenRouter for agent decision making
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
const OPENROUTER_MODEL = 'qwen/qwen-2.5-7b-instruct';

// DECISION: Using Qwen 2.5 7B via OpenRouter as specified in CLAUDE.md
// Cost is approximately $0.10-0.30 per 1M tokens depending on pricing tier

const estimateCost = (prompt: string, maxTokens: number): number => {
  const promptTokens = prompt.length / 4;
  const totalTokens = promptTokens + maxTokens;
  return (totalTokens / 1000000) * 0.2;
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
  
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://axobase.io',
      'X-Title': 'Axobase MVP',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
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
  
  return {
    text: text.trim(),
    model: OPENROUTER_MODEL,
    costUSD: estimateCost(prompt, maxTokens),
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
