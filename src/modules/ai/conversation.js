/**
 * Conversation Management - CRUD for AI conversations
 */

import { getState, updateCampaign } from '../state/store.js';
import { generateId } from '../../utils/id.js';

/**
 * Get conversation for a mystery
 * @param {string} mysteryId - Mystery ID
 * @returns {Object|null} Conversation object or null
 */
export function getConversation(mysteryId) {
  const { campaign } = getState();

  if (!campaign || !campaign.aiConversations) {
    return null;
  }

  return campaign.aiConversations[mysteryId] || null;
}

/**
 * Create new conversation for a mystery
 * @param {string} mysteryId - Mystery ID
 * @returns {Object} New conversation
 */
export function createConversation(mysteryId) {
  const { campaign } = getState();

  if (!campaign) {
    throw new Error('No active campaign');
  }

  const mystery = campaign.mysteries?.find(m => m.id === mysteryId);
  if (!mystery) {
    throw new Error('Mystery not found');
  }

  const newConversation = {
    id: generateId(),
    mysteryId,
    messages: [],
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
    contextSnapshot: {
      lastSyncedAt: Date.now(),
      mysteryVersion: mystery.lastModified || Date.now(),
      huntersVersion: Date.now()
    }
  };

  // Update campaign with new conversation
  const aiConversations = campaign.aiConversations || {};
  aiConversations[mysteryId] = newConversation;

  updateCampaign({ aiConversations });

  return newConversation;
}

/**
 * Add message to conversation
 * @param {string} mysteryId - Mystery ID
 * @param {Object} messageData - Message data
 * @returns {Object} Added message
 */
export function addMessage(mysteryId, messageData) {
  const { campaign } = getState();

  if (!campaign) {
    throw new Error('No active campaign');
  }

  // Get or create conversation
  let conversation = getConversation(mysteryId);
  if (!conversation) {
    conversation = createConversation(mysteryId);
  }

  // Create message object
  const message = {
    id: generateId(),
    timestamp: Date.now(),
    speaker: messageData.speaker,
    content: messageData.content,
    role: messageData.role,
    metadata: messageData.metadata || {}
  };

  // Add to messages
  const updatedMessages = [...conversation.messages, message];

  // Update conversation
  const updatedConversation = {
    ...conversation,
    messages: updatedMessages,
    lastMessageAt: Date.now()
  };

  // Update campaign
  const aiConversations = { ...campaign.aiConversations };
  aiConversations[mysteryId] = updatedConversation;

  updateCampaign({ aiConversations });

  return message;
}

/**
 * Update existing message (e.g., to add action results)
 * @param {string} mysteryId - Mystery ID
 * @param {string} messageId - Message ID
 * @param {Object} updates - Updates to apply
 */
export function updateMessage(mysteryId, messageId, updates) {
  const { campaign } = getState();

  if (!campaign) {
    throw new Error('No active campaign');
  }

  const conversation = getConversation(mysteryId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const updatedMessages = conversation.messages.map(msg =>
    msg.id === messageId ? { ...msg, ...updates } : msg
  );

  const updatedConversation = {
    ...conversation,
    messages: updatedMessages
  };

  const aiConversations = { ...campaign.aiConversations };
  aiConversations[mysteryId] = updatedConversation;

  updateCampaign({ aiConversations });
}

/**
 * Clear conversation history
 * @param {string} mysteryId - Mystery ID
 */
export function clearConversation(mysteryId) {
  const { campaign } = getState();

  if (!campaign) {
    throw new Error('No active campaign');
  }

  const conversation = getConversation(mysteryId);
  if (!conversation) {
    return;
  }

  const clearedConversation = {
    ...conversation,
    messages: [],
    lastMessageAt: Date.now()
  };

  const aiConversations = { ...campaign.aiConversations };
  aiConversations[mysteryId] = clearedConversation;

  updateCampaign({ aiConversations });
}

/**
 * Delete entire conversation
 * @param {string} mysteryId - Mystery ID
 */
export function deleteConversation(mysteryId) {
  const { campaign } = getState();

  if (!campaign || !campaign.aiConversations) {
    return;
  }

  const aiConversations = { ...campaign.aiConversations };
  delete aiConversations[mysteryId];

  updateCampaign({ aiConversations });
}

/**
 * Get conversation statistics
 * @param {string} mysteryId - Mystery ID
 * @returns {Object} Statistics
 */
export function getConversationStats(mysteryId) {
  const conversation = getConversation(mysteryId);

  if (!conversation) {
    return {
      messageCount: 0,
      userMessages: 0,
      aiMessages: 0,
      totalTokens: 0,
      estimatedCost: 0
    };
  }

  const userMessages = conversation.messages.filter(m => m.role === 'user').length;
  const aiMessages = conversation.messages.filter(m => m.role === 'assistant').length;

  // Calculate total tokens from metadata
  const totalTokens = conversation.messages.reduce((sum, msg) => {
    const tokens = msg.metadata?.tokens;
    if (tokens) {
      return sum + (tokens.input || 0) + (tokens.output || 0);
    }
    return sum;
  }, 0);

  // Rough cost estimate (Claude 3.5 Sonnet pricing)
  const estimatedCost = (totalTokens / 1_000_000) * 9; // Average of input/output

  return {
    messageCount: conversation.messages.length,
    userMessages,
    aiMessages,
    totalTokens,
    estimatedCost
  };
}

/**
 * Export conversation to JSON
 * @param {string} mysteryId - Mystery ID
 * @returns {string} JSON string
 */
export function exportConversation(mysteryId) {
  const conversation = getConversation(mysteryId);

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  return JSON.stringify(conversation, null, 2);
}

/**
 * Get all conversations for campaign
 * @returns {Array} Array of conversation summaries
 */
export function getAllConversations() {
  const { campaign } = getState();

  if (!campaign || !campaign.aiConversations) {
    return [];
  }

  return Object.values(campaign.aiConversations).map(conv => ({
    mysteryId: conv.mysteryId,
    messageCount: conv.messages.length,
    createdAt: conv.createdAt,
    lastMessageAt: conv.lastMessageAt
  }));
}
