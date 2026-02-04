/**
 * ID Generation Utility
 * Centralized unique ID generation with higher entropy
 */

/**
 * Generate unique ID with higher entropy
 * @returns {string} Unique identifier
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 5)}`;
}
