/**
 * Anthropic Claude API Client
 */

// Use proxy server in development
const isDevelopment = import.meta.env.DEV;
const ANTHROPIC_API_URL = isDevelopment
  ? 'http://localhost:3001/api/anthropic/messages'  // Node.js proxy server
  : 'https://api.anthropic.com/v1/messages'; // Production (needs backend)

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const API_VERSION = '2023-06-01';

/**
 * Send message to Claude API
 * @param {Array} messages - Array of {role, content} objects
 * @param {Object} options - API options
 * @returns {Promise<Object>} API response
 */
export async function sendMessage(messages, options = {}) {
  const {
    apiKey,
    model = DEFAULT_MODEL,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 4000
  } = options;

  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!messages || messages.length === 0) {
    throw new Error('At least one message is required');
  }

  // Check if online
  if (!navigator.onLine) {
    throw new Error('No internet connection');
  }

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION
      },
      body: JSON.stringify(requestBody)
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new Error('Neplatný API klíč. Zkontrolujte nastavení.');
      } else if (response.status === 429) {
        throw new Error('Rate limit překročen. Zkuste to za chvíli.');
      } else if (response.status === 529) {
        throw new Error('Claude API je přetížené. Zkuste to za chvíli.');
      } else {
        const errorMsg = errorData.error?.message || 'Neznámá chyba API';
        throw new Error(`API Error (${response.status}): ${errorMsg}`);
      }
    }

    const data = await response.json();

    // Validate response structure
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new Error('Invalid API response format');
    }

    // Extract text content from response
    const textContent = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return {
      content: textContent,
      model: data.model,
      usage: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0
      },
      stopReason: data.stop_reason
    };

  } catch (error) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Nepodařilo se připojit k API. Zkontrolujte připojení k internetu.');
    }

    // Re-throw custom errors
    throw error;
  }
}

/**
 * Test API key validity
 * @param {string} apiKey - API key to test
 * @returns {Promise<boolean>} True if valid
 */
export async function testApiKey(apiKey) {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API klíč je prázdný');
  }

  try {
    // Send minimal test message
    await sendMessage(
      [{ role: 'user', content: 'Test' }],
      {
        apiKey,
        model: DEFAULT_MODEL,
        maxTokens: 10
      }
    );
    return true;
  } catch (error) {
    if (error.message.includes('Neplatný API klíč')) {
      return false;
    }
    // Other errors (network, etc.) - re-throw
    throw error;
  }
}

/**
 * Get available models
 */
export function getAvailableModels() {
  return [
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      description: 'Nejnovější smart model pro složité úkoly (doporučeno)',
      maxTokens: 64000
    },
    {
      id: 'claude-haiku-4-5-20251001',
      name: 'Claude Haiku 4.5',
      description: 'Nejrychlejší model s vysokou inteligencí',
      maxTokens: 64000
    },
    {
      id: 'claude-opus-4-5-20251101',
      name: 'Claude Opus 4.5',
      description: 'Premium model s maximální inteligencí',
      maxTokens: 64000
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku (Legacy)',
      description: 'Starší rychlý a levný model',
      maxTokens: 4096
    }
  ];
}

/**
 * Estimate token count (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} Approximate token count
 */
export function estimateTokens(text) {
  // Rough estimate: 1 token ≈ 4 characters for English, ~3 for Czech
  return Math.ceil(text.length / 3);
}

/**
 * Calculate cost estimate
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @param {string} modelId - Model ID
 * @returns {number} Cost in USD
 */
export function calculateCost(inputTokens, outputTokens, modelId = DEFAULT_MODEL) {
  // Pricing per million tokens (as of 2025/2026)
  const pricing = {
    'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
    'claude-haiku-4-5-20251001': { input: 1, output: 5 },
    'claude-opus-4-5-20251101': { input: 5, output: 25 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
  };

  const prices = pricing[modelId] || pricing[DEFAULT_MODEL];

  const inputCost = (inputTokens / 1_000_000) * prices.input;
  const outputCost = (outputTokens / 1_000_000) * prices.output;

  return inputCost + outputCost;
}
