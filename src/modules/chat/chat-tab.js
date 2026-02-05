/**
 * Chat Tab - Main chat interface component
 */

import { getState, setState, subscribe, getSettings } from '../state/store.js';
import {
  getConversation,
  addMessage,
  clearConversation,
  getConversationStats
} from '../ai/conversation.js';
import { buildGameContext, buildConversationContext } from '../ai/context-builder.js';
import { getKeeperSystemPrompt } from '../ai/prompts.js';
import { sendMessage } from '../ai/client.js';
import { parseActions, executeActions } from '../ai/action-executor.js';
import {
  renderMessage,
  renderTypingIndicator,
  renderEmptyState,
  renderError
} from './message-renderer.js';

let unsubscribe = null;

/**
 * Render chat tab
 */
export function renderChatTab() {
  const container = document.getElementById('tab-chat');
  if (!container) return;

  const { campaign, currentMysteryId } = getState();

  if (!campaign) {
    container.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="text-center text-gray-400">
          <span class="material-symbols-outlined text-6xl mb-4 block">campaign</span>
          <p>Nejprve načti nebo vytvoř kampaň</p>
        </div>
      </div>
    `;
    return;
  }

  if (!currentMysteryId) {
    container.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="text-center text-gray-400">
          <span class="material-symbols-outlined text-6xl mb-4 block">mystery</span>
          <p>Nejprve vytvoř nebo vyber záhadu</p>
        </div>
      </div>
    `;
    return;
  }

  const settings = getSettings();
  if (!settings.ai?.apiKey) {
    container.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="text-center text-gray-400 max-w-md">
          <span class="material-symbols-outlined text-6xl mb-4 block text-yellow-600">key</span>
          <h3 class="text-xl font-bold text-gray-300 mb-2">Chybí API klíč</h3>
          <p class="mb-6">Pro použití AI Keeper musíš nastavit Anthropic API klíč v nastavení.</p>
          <button id="btn-open-settings" class="bg-red-900/40 hover:bg-red-800/60 px-4 py-2 rounded transition font-semibold border border-red-700/50">
            Otevřít nastavení
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      import('../ui/settings-modal.js').then(({ showSettingsModal }) => {
        showSettingsModal('ai');
      });
    });
    return;
  }

  // Render main chat interface
  container.innerHTML = `
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="border-b border-white/5 bg-black/20 p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-purple-900/50 border border-purple-700/50 flex items-center justify-center">
            <span class="material-symbols-outlined text-purple-300">smart_toy</span>
          </div>
          <div>
            <h3 class="font-bold text-white">AI Keeper</h3>
            <p class="text-xs text-gray-400" id="chat-mystery-name">Načítání...</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div id="chat-stats" class="text-xs text-gray-500"></div>
          <button id="btn-clear-chat" class="text-gray-400 hover:text-white transition p-1" title="Vymazat konverzaci">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div id="chat-messages" class="flex-1 overflow-y-auto p-6 space-y-4">
        <!-- Messages will be rendered here -->
      </div>

      <!-- Input -->
      <div class="border-t border-white/5 bg-black/20 p-4">
        <div class="flex gap-2">
          <textarea
            id="chat-input"
            placeholder="Napiš zprávu AI Keeper..."
            rows="1"
            class="flex-1 bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
            style="max-height: 120px;"
          ></textarea>
          <button
            id="btn-send-message"
            class="bg-purple-900/50 hover:bg-purple-800/60 border border-purple-700/50 px-4 rounded-lg transition flex items-center justify-center"
            title="Odeslat (Enter)"
          >
            <span class="material-symbols-outlined">send</span>
          </button>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="quick-action-btn" data-prompt="Co se děje? Popiš aktuální situaci.">
            🎬 Začít scénu
          </button>
          <button class="quick-action-btn" data-prompt="Vytvoř nové NPC.">
            👤 Nové NPC
          </button>
          <button class="quick-action-btn" data-prompt="Co příšera dělá?">
            👹 Příšera
          </button>
        </div>
      </div>
    </div>
  `;

  // Update mystery name
  const mystery = campaign.mysteries.find(m => m.id === currentMysteryId);
  if (mystery) {
    document.getElementById('chat-mystery-name').textContent = mystery.name || 'Bez názvu';
  }

  // Render messages
  renderMessages();

  // Update stats
  updateChatStats();

  // Init events
  initChatEvents();

  // Subscribe to state changes
  if (unsubscribe) {
    unsubscribe();
  }
  unsubscribe = subscribe(() => {
    renderMessages();
    updateChatStats();
  });
}

/**
 * Render messages in chat
 */
function renderMessages() {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  const { currentMysteryId, aiTyping } = getState();
  const conversation = getConversation(currentMysteryId);

  if (!conversation || conversation.messages.length === 0) {
    if (!aiTyping) {
      messagesContainer.innerHTML = renderEmptyState();
      attachQuickActionListeners();
    }
    return;
  }

  const messagesHTML = conversation.messages.map(msg => renderMessage(msg)).join('');
  const typingHTML = aiTyping ? renderTypingIndicator() : '';

  messagesContainer.innerHTML = messagesHTML + typingHTML;

  // Scroll to bottom
  scrollToBottom();
}

/**
 * Init chat events
 */
function initChatEvents() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send-message');
  const clearBtn = document.getElementById('btn-clear-chat');

  if (input && sendBtn) {
    // Send on button click
    sendBtn.addEventListener('click', handleSendMessage);

    // Send on Enter (Shift+Enter for new line)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', handleClearChat);
  }

  // Quick action buttons
  attachQuickActionListeners();
}

/**
 * Attach quick action listeners
 */
function attachQuickActionListeners() {
  const quickBtns = document.querySelectorAll('.quick-action-btn');
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) {
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = prompt;
          input.focus();
        }
      }
    });
  });
}

/**
 * Handle send message
 */
async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const { currentMysteryId } = getState();
  const settings = getSettings();

  // Clear input
  input.value = '';
  input.style.height = 'auto';

  // Add user message
  addMessage(currentMysteryId, {
    speaker: {
      type: 'user',
      id: 'user',
      name: 'Ty'
    },
    content: text,
    role: 'user'
  });

  // Set typing state
  setState({ aiTyping: true });

  try {
    // Build context
    const gameContext = buildGameContext(currentMysteryId);
    const systemPrompt = getKeeperSystemPrompt();
    const conversation = getConversation(currentMysteryId);

    const conversationMessages = buildConversationContext(
      conversation.messages,
      settings.ai.maxHistoryMessages || 50
    );

    const fullSystemPrompt = `${systemPrompt}\n\n# AKTUÁLNÍ STAV HRY\n\n${gameContext}`;

    // Call API
    const response = await sendMessage(conversationMessages, {
      apiKey: settings.ai.apiKey,
      model: settings.ai.model || 'claude-3-5-sonnet-20241022',
      temperature: settings.ai.temperature || 0.7,
      maxTokens: settings.ai.maxTokens || 4000,
      systemPrompt: fullSystemPrompt
    });

    // Parse actions
    const actions = parseActions(response.content);

    // Execute actions
    const actionResults = await executeActions(actions, currentMysteryId);

    // Add AI message
    addMessage(currentMysteryId, {
      speaker: {
        type: 'ai-keeper',
        id: 'ai-keeper',
        name: 'AI Keeper'
      },
      content: response.content,
      role: 'assistant',
      metadata: {
        actions: actionResults,
        tokens: response.usage,
        model: response.model
      }
    });

  } catch (error) {
    console.error('Chat error:', error);

    // Show error to user
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      const errorHTML = renderError(error.message);
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = errorHTML;
      messagesContainer.appendChild(errorDiv.firstElementChild);
      scrollToBottom();
    }
  } finally {
    setState({ aiTyping: false });
  }
}

/**
 * Handle clear chat
 */
function handleClearChat() {
  const { currentMysteryId } = getState();

  if (confirm('Opravdu chceš smazat celou konverzaci? Tuto akci nelze vrátit zpět.')) {
    clearConversation(currentMysteryId);
    renderMessages();
  }
}

/**
 * Update chat stats
 */
function updateChatStats() {
  const statsEl = document.getElementById('chat-stats');
  if (!statsEl) return;

  const { currentMysteryId } = getState();
  const stats = getConversationStats(currentMysteryId);

  if (stats.messageCount === 0) {
    statsEl.textContent = '';
    return;
  }

  const cost = stats.estimatedCost.toFixed(3);
  statsEl.textContent = `${stats.messageCount} zpráv • ~$${cost}`;
}

/**
 * Scroll to bottom of messages
 */
function scrollToBottom() {
  const messagesContainer = document.getElementById('chat-messages');
  if (messagesContainer) {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }
}

/**
 * Cleanup
 */
export function cleanupChatTab() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
