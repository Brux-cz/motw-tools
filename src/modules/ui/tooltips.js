/**
 * Tooltip System
 *
 * Generic tooltip component with positioning logic
 * Usage: Add data-tooltip="Description" attribute to any element
 */

let activeTooltip = null;
let tooltipTimeout = null;
const TOOLTIP_DELAY = 300; // ms

/**
 * Initialize tooltip system
 */
export function initTooltips() {
  document.addEventListener('mouseover', handleTooltipTrigger);
  document.addEventListener('mouseout', handleTooltipHide);
  document.addEventListener('scroll', hideTooltip, true); // Use capture for all scroll events

  console.log('✓ Tooltips initialized');
}

/**
 * Handle tooltip trigger on mouseover
 */
function handleTooltipTrigger(event) {
  const trigger = event.target.closest('[data-tooltip]');
  if (!trigger) return;

  clearTimeout(tooltipTimeout);
  tooltipTimeout = setTimeout(() => {
    showTooltip(trigger);
  }, TOOLTIP_DELAY);
}

/**
 * Handle tooltip hide on mouseout
 */
function handleTooltipHide(event) {
  const trigger = event.target.closest('[data-tooltip]');
  if (!trigger) return;

  clearTimeout(tooltipTimeout);
  hideTooltip();
}

/**
 * Show tooltip for element
 */
function showTooltip(element) {
  hideTooltip(); // Remove existing tooltip first

  const content = element.dataset.tooltip;
  if (!content || content.trim().length === 0) return;

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip fixed z-[9999] px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-2xl text-sm max-w-md pointer-events-none';
  tooltip.style.opacity = '0';
  tooltip.style.transition = 'opacity 150ms ease-in';

  // Support for multiline content (split by \n)
  const lines = content.split('\\n');
  if (lines.length > 1) {
    tooltip.innerHTML = lines.map(line => `<div>${escapeHtml(line.trim())}</div>`).join('');
  } else {
    tooltip.textContent = content;
  }

  document.body.appendChild(tooltip);

  // Position tooltip
  positionTooltip(tooltip, element);

  // Fade in
  setTimeout(() => {
    tooltip.style.opacity = '1';
  }, 10);

  activeTooltip = tooltip;
}

/**
 * Position tooltip relative to trigger element
 */
function positionTooltip(tooltip, trigger) {
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const padding = 8;
  const arrowSize = 6;

  let top = triggerRect.top - tooltipRect.height - padding - arrowSize;
  let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
  let arrowPosition = 'bottom'; // Arrow points down (tooltip above)

  // Check if tooltip would go off top of screen
  if (top < padding) {
    // Show below instead
    top = triggerRect.bottom + padding + arrowSize;
    arrowPosition = 'top'; // Arrow points up (tooltip below)
  }

  // Check if tooltip would go off left of screen
  if (left < padding) {
    left = padding;
  }

  // Check if tooltip would go off right of screen
  if (left + tooltipRect.width > window.innerWidth - padding) {
    left = window.innerWidth - tooltipRect.width - padding;
  }

  // Check if tooltip would go off bottom of screen (when showing below)
  if (top + tooltipRect.height > window.innerHeight - padding) {
    top = triggerRect.top - tooltipRect.height - padding - arrowSize;
    arrowPosition = 'bottom';
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;

  // Add arrow
  addArrow(tooltip, triggerRect, arrowPosition);
}

/**
 * Add arrow to tooltip
 */
function addArrow(tooltip, triggerRect, position) {
  const arrow = document.createElement('div');
  arrow.className = 'tooltip-arrow absolute w-2 h-2 bg-gray-900 border border-gray-700 transform rotate-45';

  if (position === 'bottom') {
    // Tooltip is above trigger, arrow points down
    arrow.style.bottom = '-5px';
    arrow.style.borderTop = 'none';
    arrow.style.borderLeft = 'none';
  } else {
    // Tooltip is below trigger, arrow points up
    arrow.style.top = '-5px';
    arrow.style.borderBottom = 'none';
    arrow.style.borderRight = 'none';
  }

  // Center arrow horizontally relative to trigger
  const tooltipRect = tooltip.getBoundingClientRect();
  const triggerCenter = triggerRect.left + (triggerRect.width / 2);
  const arrowLeft = triggerCenter - tooltipRect.left - 4; // 4px = half arrow width

  // Clamp arrow position within tooltip bounds
  const minArrowLeft = 8;
  const maxArrowLeft = tooltipRect.width - 8;
  arrow.style.left = `${Math.max(minArrowLeft, Math.min(maxArrowLeft, arrowLeft))}px`;

  tooltip.appendChild(arrow);
}

/**
 * Hide active tooltip
 */
export function hideTooltip() {
  clearTimeout(tooltipTimeout);

  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

/**
 * Simple HTML escape utility
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
