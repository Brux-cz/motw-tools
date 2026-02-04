/**
 * HTML Escape Utility
 * Prevence XSS útoků při zobrazování user input
 */

/**
 * Escape HTML pro prevenci XSS
 * @param {string} text - Text k escapování
 * @returns {string} Escapovaný text
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize HTML atributy
 * @param {string} text - Text k sanitizaci
 * @returns {string} Sanitizovaný text
 */
export function sanitizeAttribute(text) {
  if (!text) return '';
  return text.replace(/[<>"'&]/g, (char) => {
    const entities = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '&': '&amp;'
    };
    return entities[char];
  });
}
