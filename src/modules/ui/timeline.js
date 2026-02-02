/**
 * Timeline/Countdown Management
 */

import { getState } from '../state/store.js';

let currentCountdown = 0;

/**
 * Initialize countdown timeline
 */
export function initTimeline() {
  const nodes = document.querySelectorAll('[data-countdown-phase]');

  nodes.forEach((node, index) => {
    node.addEventListener('click', () => {
      setCountdown(index);
    });
  });

  // Set initial state
  setCountdown(0);

  console.log('Timeline initialized');
}

/**
 * Set countdown to specific phase
 */
export function setCountdown(phase) {
  currentCountdown = phase;

  const nodes = document.querySelectorAll('[data-countdown-phase]');
  nodes.forEach((node, idx) => {
    const isActive = idx <= phase;
    const isPast = idx < phase;

    node.classList.toggle('timeline-node-active', isActive);

    // Update background color
    if (isPast) {
      node.style.background = '#b91c1c'; // Red for completed
    } else if (idx === phase) {
      node.style.background = '#1e1e1e'; // Dark for current
    } else {
      node.style.background = '#1e1e1e'; // Dark for future
    }
  });

  console.log('Countdown set to phase:', phase);
}

/**
 * Get current countdown phase
 */
export function getCurrentCountdown() {
  return currentCountdown;
}

/**
 * Render countdown timeline
 */
export function renderCountdown(countdown) {
  if (!countdown || !countdown.phases) {
    console.warn('No countdown data');
    return;
  }

  const container = document.getElementById('countdown-container');
  if (!container) return;

  const phasesHTML = countdown.phases.map((phase, index) => `
    <div class="flex items-center gap-4 timeline-item group cursor-pointer" data-countdown-phase="${index}">
      <div class="timeline-node z-10" id="countdown-node-${index}"></div>
      <div class="flex-1">
        <div class="text-xs font-bold text-gray-300">${phase.day}</div>
        <div class="text-[10px] text-gray-500">${phase.description}</div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="space-y-4 relative">
      <div class="absolute left-[9px] top-2 bottom-2 w-px bg-white/10"></div>
      ${phasesHTML}
    </div>
  `;

  // Re-initialize after rendering
  initTimeline();
}
