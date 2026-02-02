/**
 * DOM Utilities
 */

/**
 * Query selector with optional context
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Query selector all with optional context
 */
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * Create element with attributes and children
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        el.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on')) {
      const eventName = key.substring(2).toLowerCase();
      el.addEventListener(eventName, value);
    } else {
      el.setAttribute(key, value);
    }
  });

  // Append children
  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });

  return el;
}

/**
 * Set HTML content safely
 */
export function setHTML(element, html) {
  if (!element) return;
  element.innerHTML = html;
}

/**
 * Toggle class on element
 */
export function toggleClass(element, className, force) {
  if (!element) return;
  element.classList.toggle(className, force);
}

/**
 * Add class to element
 */
export function addClass(element, ...classNames) {
  if (!element) return;
  element.classList.add(...classNames);
}

/**
 * Remove class from element
 */
export function removeClass(element, ...classNames) {
  if (!element) return;
  element.classList.remove(...classNames);
}

/**
 * Show element
 */
export function show(element) {
  if (!element) return;
  element.classList.remove('hidden');
}

/**
 * Hide element
 */
export function hide(element) {
  if (!element) return;
  element.classList.add('hidden');
}

/**
 * Remove element from DOM
 */
export function remove(element) {
  if (!element) return;
  element.remove();
}

/**
 * Empty element (remove all children)
 */
export function empty(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Scroll element to view
 */
export function scrollIntoView(element, options = { behavior: 'smooth', block: 'nearest' }) {
  if (!element) return;
  element.scrollIntoView(options);
}
