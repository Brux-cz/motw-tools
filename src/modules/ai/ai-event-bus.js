/**
 * AI Event Bus - Coordination between keeper, agent, and thinking logger
 *
 * Řeší circular dependency tím, že umožňuje loosely coupled komunikaci
 * přes event system místo přímých importů.
 */
import { emit, listen } from '../../utils/events.js';

// Event types
export const AI_EVENTS = {
  KEEPER_DELEGATE: 'keeper:delegate-to-agent',
  AGENT_THINKING: 'agent:thinking',
  AGENT_COMPLETE: 'agent:complete',
  AGENT_ERROR: 'agent:error'
};

/**
 * Emit keeper delegation request
 * @param {Object} context - Delegation context (decision, plan, mysteryId, reason)
 */
export function delegateToAgent(context) {
  emit(AI_EVENTS.KEEPER_DELEGATE, context);
}

/**
 * Emit thinking log entry
 * @param {Object} thinkingData - Thinking entry data
 */
export function logAIThinking(thinkingData) {
  emit(AI_EVENTS.AGENT_THINKING, thinkingData);
}

/**
 * Emit agent completion
 * @param {Object} result - Completion result
 */
export function emitAgentComplete(result) {
  emit(AI_EVENTS.AGENT_COMPLETE, result);
}

/**
 * Emit agent error
 * @param {Error} error - Error object
 */
export function emitAgentError(error) {
  emit(AI_EVENTS.AGENT_ERROR, { error: error.message, stack: error.stack });
}

/**
 * Listen for keeper delegations
 * @param {Function} handler - Handler function (receives context)
 * @returns {Function} Unsubscribe function
 */
export function onDelegateToAgent(handler) {
  return listen(AI_EVENTS.KEEPER_DELEGATE, (e) => handler(e.detail));
}

/**
 * Listen for thinking logs
 * @param {Function} handler - Handler function (receives thinking data)
 * @returns {Function} Unsubscribe function
 */
export function onAIThinking(handler) {
  return listen(AI_EVENTS.AGENT_THINKING, (e) => handler(e.detail));
}

/**
 * Listen for agent completion
 * @param {Function} handler - Handler function (receives result)
 * @returns {Function} Unsubscribe function
 */
export function onAgentComplete(handler) {
  return listen(AI_EVENTS.AGENT_COMPLETE, (e) => handler(e.detail));
}

/**
 * Listen for agent errors
 * @param {Function} handler - Handler function (receives error)
 * @returns {Function} Unsubscribe function
 */
export function onAgentError(handler) {
  return listen(AI_EVENTS.AGENT_ERROR, (e) => handler(e.detail));
}
