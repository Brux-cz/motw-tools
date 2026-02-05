/**
 * Message Renderer - Renders chat messages and AI actions
 */

import { escapeHtml } from '../../utils/html.js';

/**
 * Render a chat message
 * @param {Object} message - Message object
 * @returns {string} HTML string
 */
export function renderMessage(message) {
  const { speaker, content, timestamp, metadata } = message;

  const isAI = speaker.type === 'ai-keeper';
  const isUser = speaker.type === 'user';

  const time = new Date(timestamp).toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const alignClass = isUser ? 'justify-end' : 'justify-start';
  const bubbleClass = isUser
    ? 'bg-red-900/40 border-red-700/50 text-white'
    : 'bg-neutral-800 border-white/10 text-gray-200';

  const avatar = isAI
    ? `<div class="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-700/50 flex items-center justify-center flex-shrink-0">
         <span class="material-symbols-outlined text-purple-300 text-sm">smart_toy</span>
       </div>`
    : `<div class="w-8 h-8 rounded-full bg-red-900/50 border border-red-700/50 flex items-center justify-center flex-shrink-0">
         <span class="material-symbols-outlined text-red-300 text-sm">person</span>
       </div>`;

  // Format content with markdown
  const formattedContent = formatMarkdown(content);

  // Render action results if present
  const actionsHTML = metadata?.actions && metadata.actions.length > 0
    ? renderActions(metadata.actions)
    : '';

  // Token info (only for AI messages)
  const tokenInfo = metadata?.tokens
    ? `<div class="text-[10px] text-gray-500 mt-1">
         Tokens: ${metadata.tokens.input + metadata.tokens.output}
       </div>`
    : '';

  return `
    <div class="flex gap-3 ${alignClass} mb-4" data-message-id="${message.id}">
      ${isUser ? '' : avatar}
      <div class="flex flex-col max-w-[80%]">
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-xs font-semibold ${isAI ? 'text-purple-400' : 'text-red-400'}">
            ${escapeHtml(speaker.name)}
          </span>
          <span class="text-[10px] text-gray-500">${time}</span>
        </div>
        <div class="border ${bubbleClass} rounded-lg px-4 py-3 shadow-lg">
          <div class="message-content text-sm leading-relaxed">
            ${formattedContent}
          </div>
          ${tokenInfo}
        </div>
        ${actionsHTML}
      </div>
      ${isUser ? avatar : ''}
    </div>
  `;
}

/**
 * Render AI action results
 * @param {Array} actions - Array of action results
 * @returns {string} HTML string
 */
function renderActions(actions) {
  if (!actions || actions.length === 0) {
    return '';
  }

  const actionItems = actions.map(action => {
    const success = action.result?.success;
    const icon = success ? 'check_circle' : 'error';
    const iconColor = success ? 'text-green-400' : 'text-red-400';
    const message = action.result?.message || action.result?.error || 'Neznámý výsledek';

    return `
      <div class="flex items-center gap-2 text-xs">
        <span class="material-symbols-outlined ${iconColor} text-sm">${icon}</span>
        <span class="text-gray-400">${escapeHtml(getActionLabel(action.action))}</span>
        <span class="text-gray-300">${escapeHtml(message)}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="mt-2 p-2 bg-black/30 border border-white/5 rounded text-xs space-y-1">
      <div class="text-gray-500 uppercase tracking-wider text-[10px] mb-1">AI Actions</div>
      ${actionItems}
    </div>
  `;
}

/**
 * Get human-readable action label
 * @param {string} actionType - Action type
 * @returns {string} Label
 */
function getActionLabel(actionType) {
  const labels = {
    'create_npc': 'Vytvoření NPC',
    'update_npc': 'Úprava NPC',
    'create_location': 'Vytvoření lokace',
    'advance_countdown': 'Posun odpočtu',
    'inflict_harm': 'Zranění',
    'give_item': 'Předmět předán',
    'add_tag': 'Story tag přidán',
    'create_custom_move': 'Vlastní tah vytvořen'
  };

  return labels[actionType] || actionType;
}

/**
 * Format markdown in text
 * @param {string} text - Raw text
 * @returns {string} HTML string
 */
export function formatMarkdown(text) {
  let formatted = escapeHtml(text);

  // Bold: **text**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');

  // Italic: *text*
  formatted = formatted.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

  // Code: `code`
  formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-black/40 px-1 py-0.5 rounded text-red-300 font-mono text-xs">$1</code>');

  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

/**
 * Render typing indicator
 * @returns {string} HTML string
 */
export function renderTypingIndicator() {
  return `
    <div class="flex gap-3 justify-start mb-4" id="typing-indicator">
      <div class="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-700/50 flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined text-purple-300 text-sm">smart_toy</span>
      </div>
      <div class="flex flex-col">
        <div class="text-xs font-semibold text-purple-400 mb-1">AI Keeper</div>
        <div class="border bg-neutral-800 border-white/10 text-gray-200 rounded-lg px-4 py-3 shadow-lg">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render empty state
 * @returns {string} HTML string
 */
export function renderEmptyState() {
  return `
    <div class="flex flex-col items-center justify-center h-full text-center p-8">
      <span class="material-symbols-outlined text-6xl text-purple-700 mb-4">chat</span>
      <h3 class="text-xl font-bold text-gray-300 mb-2">Zahájit konverzaci s AI Keeper</h3>
      <p class="text-gray-500 max-w-md mb-6">
        AI Keeper ti pomůže vést hru Monster of the Week.
        Ptej se na rady, popis scén, nebo nech AI řídit příběh.
      </p>
      <div class="flex flex-wrap gap-2 justify-center">
        <button class="quick-action-btn" data-prompt="Co se děje? Popiš aktuální situaci.">
          🎬 Začít scénu
        </button>
        <button class="quick-action-btn" data-prompt="Vytvoř nové NPC které by mohlo lovce kontaktovat.">
          👤 Nové NPC
        </button>
        <button class="quick-action-btn" data-prompt="Co příšera právě dělá?">
          👹 Akce příšery
        </button>
        <button class="quick-action-btn" data-prompt="Posuň odpočet a popiš co se stalo.">
          ⏰ Posun odpočet
        </button>
      </div>
    </div>
  `;
}

/**
 * Render error message
 * @param {string} error - Error message
 * @returns {string} HTML string
 */
export function renderError(error) {
  return `
    <div class="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-sm">
      <div class="flex items-center gap-2 mb-2">
        <span class="material-symbols-outlined text-red-400">error</span>
        <span class="font-semibold text-red-400">Chyba</span>
      </div>
      <p class="text-gray-300">${escapeHtml(error)}</p>
    </div>
  `;
}
