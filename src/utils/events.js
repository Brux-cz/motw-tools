/**
 * Event System Utilities
 */

/**
 * Event delegation - attach single listener to parent
 */
export function on(selector, eventType, handler) {
  document.addEventListener(eventType, (e) => {
    const target = e.target.closest(selector);
    if (target) {
      handler.call(target, e);
    }
  });
}

/**
 * Emit custom event
 */
export function emit(eventName, data = {}) {
  const event = new CustomEvent(eventName, {
    detail: data,
    bubbles: true,
    cancelable: true
  });

  document.dispatchEvent(event);
  console.log('Event emitted:', eventName, data);
}

/**
 * Listen to custom event
 */
export function listen(eventName, handler) {
  document.addEventListener(eventName, handler);

  // Return unsubscribe function
  return () => {
    document.removeEventListener(eventName, handler);
  };
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
