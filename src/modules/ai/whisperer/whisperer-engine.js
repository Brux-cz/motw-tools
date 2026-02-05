/**
 * Whisperer Engine - Generates ambient story snippets
 */

import { getState } from '../../state/store.js';
import { addToContentPool } from '../../state/store.js';
import { sendMessage } from '../client.js';
import {
  getWhispererSystemPrompt,
  getWhisperPrompt,
  buildWhispererContext
} from './whisperer-prompts.js';

/**
 * Generate a whisper for a category
 */
export async function generateWhisper(mysteryId, category) {
  const { campaign, settings } = getState();

  if (!campaign) {
    throw new Error('No active campaign');
  }

  const mystery = campaign.mysteries.find(m => m.id === mysteryId);
  if (!mystery) {
    throw new Error('Mystery not found');
  }

  // Check if whisperer is enabled
  const whispererSettings = mystery.whispererSettings || {};
  if (whispererSettings.enabled === false) {
    console.log('Whisperer is disabled for this mystery');
    return null;
  }

  // Build context
  const context = buildWhispererContext(mystery, category);

  // Build prompt
  const systemPrompt = getWhispererSystemPrompt(mystery);
  const userPrompt = getWhisperPrompt(category, context);

  console.log('🔮 Generating whisper:', category);

  try {
    // Call API
    const response = await sendMessage(
      [{ role: 'user', content: userPrompt }],
      {
        apiKey: settings.ai.apiKey,
        model: settings.ai.model || 'claude-sonnet-4-5-20250929',
        temperature: 0.9, // Creative
        maxTokens: 150, // Short!
        systemPrompt
      }
    );

    // Create whisper item
    const whisper = {
      id: generateWhisperId(),
      type: 'whisper',
      category,
      content: response.content.trim(),
      mysteryId,
      createdAt: Date.now(),
      status: 'pending',
      usedInSpine: false,
      source: 'ai-whisperer',
      metadata: {
        model: response.model,
        tokens: response.usage
      }
    };

    // Add to content pool
    addToContentPool(mysteryId, whisper);

    console.log('✨ Whisper generated:', whisper.content.substring(0, 50) + '...');

    // Notify UI (if listening)
    notifyNewWhisper(whisper);

    return whisper;

  } catch (error) {
    console.error('Failed to generate whisper:', error);
    // Don't throw - whisper generation is non-critical
    return null;
  }
}

/**
 * Generate random whisper from enabled categories
 */
export async function generateRandomWhisper(mysteryId) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);

  if (!mystery) return null;

  const whispererSettings = mystery.whispererSettings || {};
  const enabledCategories = whispererSettings.categories || [
    'world', 'people', 'environment', 'news', 'clues'
  ];

  if (enabledCategories.length === 0) {
    console.log('No enabled whisper categories');
    return null;
  }

  // Pick random category
  const category = enabledCategories[Math.floor(Math.random() * enabledCategories.length)];

  return generateWhisper(mysteryId, category);
}

/**
 * Generate ID for whisper
 */
function generateWhisperId() {
  return `whisper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Notify UI about new whisper
 */
function notifyNewWhisper(whisper) {
  // Dispatch custom event
  const event = new CustomEvent('whisper:new', {
    detail: { whisper }
  });
  window.dispatchEvent(event);

  // Optional: Show toast notification
  if (window.showToast) {
    window.showToast({
      type: 'info',
      message: '💭 Nový whisper',
      duration: 3000
    });
  }
}

/**
 * Batch generate multiple whispers
 */
export async function generateWhisperBatch(mysteryId, count = 5) {
  const { campaign } = getState();
  const mystery = campaign?.mysteries.find(m => m.id === mysteryId);

  if (!mystery) return [];

  const whispererSettings = mystery.whispererSettings || {};
  const enabledCategories = whispererSettings.categories || [
    'world', 'people', 'environment', 'news', 'clues'
  ];

  const whispers = [];

  // Generate whispers sequentially (to avoid rate limit)
  for (let i = 0; i < count; i++) {
    const category = enabledCategories[i % enabledCategories.length];

    try {
      const whisper = await generateWhisper(mysteryId, category);
      if (whisper) {
        whispers.push(whisper);
      }

      // Small delay between requests
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Failed to generate whisper in batch:', error);
    }
  }

  return whispers;
}
