/**
 * Rules Tab - Searchable reference for all game rules
 */

import { escapeHtml } from '../../utils/html.js';

let rulesData = null;
let rulesCache = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let currentSearchQuery = '';

/**
 * Main render function for Rules Tab
 */
export async function renderRulesTab() {
  const container = document.getElementById('tab-rules');
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="text-center text-gray-400 py-20">
      <span class="material-symbols-outlined text-6xl mb-4 block animate-pulse">menu_book</span>
      <p>Načítání pravidel...</p>
    </div>
  `;

  try {
    // Load rules data with cache
    rulesData = await loadRulesData();

    // Render the tab
    container.innerHTML = renderRulesContent();

    // Attach event handlers
    attachEventHandlers();
  } catch (error) {
    console.error('Failed to load rules:', error);
    container.innerHTML = `
      <div class="text-center text-red-400 py-20">
        <span class="material-symbols-outlined text-6xl mb-4 block">error</span>
        <p>Nepodařilo se načíst pravidla</p>
        <p class="text-sm text-gray-500 mt-2">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

/**
 * Load rules data with caching
 */
async function loadRulesData() {
  const now = Date.now();

  // Return cached data if still valid
  if (rulesCache.data && (now - rulesCache.timestamp) < CACHE_TTL) {
    return rulesCache.data;
  }

  // Fetch fresh data
  const response = await fetch(import.meta.env.BASE_URL + 'data/rules.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch rules: ${response.statusText}`);
  }

  const data = await response.json();

  // Update cache
  rulesCache = {
    data,
    timestamp: now
  };

  return data;
}

/**
 * Render the complete rules content
 */
function renderRulesContent() {
  return `
    <!-- Search bar -->
    <div class="sticky top-0 bg-black/95 backdrop-blur-sm z-10 p-4 border-b border-white/10">
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          search
        </span>
        <input
          id="rules-search"
          type="text"
          placeholder="Hledat pravidlo..."
          class="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-red-500/50 transition"
          value="${escapeHtml(currentSearchQuery)}"
        />
        ${currentSearchQuery ? `
          <button
            id="rules-search-clear"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Rules sections -->
    <div id="rules-content" class="p-6 space-y-3">
      ${renderSections()}
    </div>
  `;
}

/**
 * Render all sections with optional filtering
 */
function renderSections() {
  if (!rulesData || !rulesData.sections) {
    return '<p class="text-gray-400">Žádná pravidla k zobrazení.</p>';
  }

  const sections = filterSections(rulesData.sections, currentSearchQuery);

  if (sections.length === 0) {
    return `
      <div class="text-center text-gray-400 py-10">
        <span class="material-symbols-outlined text-5xl mb-3 block">search_off</span>
        <p>Nenalezeny žádné výsledky pro "${escapeHtml(currentSearchQuery)}"</p>
      </div>
    `;
  }

  return sections.map(section => renderSection(section)).join('');
}

/**
 * Render a single section with subsections
 */
function renderSection(section) {
  const hasVisibleSubsections = section.visibleSubsections && section.visibleSubsections.length > 0;
  const subsectionsToRender = section.visibleSubsections || section.subsections;

  return `
    <details class="group bg-black/20 border border-white/5 rounded overflow-hidden hover:border-white/10 transition" ${currentSearchQuery ? 'open' : ''}>
      <summary class="px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-white/5 transition">
        <span class="material-symbols-outlined text-red-500">${section.icon}</span>
        <span class="font-semibold flex-1">${highlightText(section.title, currentSearchQuery)}</span>
        <span class="material-symbols-outlined text-gray-400 group-open:rotate-180 transition-transform">
          expand_more
        </span>
      </summary>
      <div class="border-t border-white/5">
        <div class="p-4 space-y-3">
          ${subsectionsToRender.map(subsection => renderSubsection(subsection)).join('')}
        </div>
      </div>
    </details>
  `;
}

/**
 * Render a subsection
 */
function renderSubsection(subsection) {
  return `
    <details class="bg-black/10 border border-white/5 rounded overflow-hidden hover:border-white/10 transition" ${currentSearchQuery ? 'open' : ''}>
      <summary class="px-3 py-2 cursor-pointer hover:bg-white/5 transition font-medium">
        ${highlightText(subsection.title, currentSearchQuery)}
      </summary>
      <div class="border-t border-white/5 p-3 prose prose-invert prose-sm max-w-none">
        ${highlightText(subsection.content, currentSearchQuery)}
      </div>
    </details>
  `;
}

/**
 * Filter sections based on search query
 */
function filterSections(sections, query) {
  if (!query || query.trim().length === 0) {
    return sections;
  }

  const lowerQuery = query.toLowerCase();
  const filteredSections = [];

  for (const section of sections) {
    // Check if section title matches
    const sectionMatches = section.title.toLowerCase().includes(lowerQuery);

    // Filter subsections
    const matchingSubsections = section.subsections.filter(subsection => {
      const titleMatches = subsection.title.toLowerCase().includes(lowerQuery);
      const contentMatches = subsection.content.toLowerCase().includes(lowerQuery);
      return titleMatches || contentMatches;
    });

    // Include section if it or any subsection matches
    if (sectionMatches || matchingSubsections.length > 0) {
      filteredSections.push({
        ...section,
        visibleSubsections: sectionMatches ? section.subsections : matchingSubsections
      });
    }
  }

  return filteredSections;
}

/**
 * Highlight search matches in text
 */
function highlightText(text, query) {
  if (!query || query.trim().length === 0) {
    return text;
  }

  // Escape special regex characters in query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  return text.replace(regex, '<mark class="bg-amber-500/30 text-amber-200">$1</mark>');
}

/**
 * Attach event handlers
 */
function attachEventHandlers() {
  const searchInput = document.getElementById('rules-search');
  const clearButton = document.getElementById('rules-search-clear');

  if (searchInput) {
    // Debounce search input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        handleSearch(e.target.value);
      }, 300);
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      currentSearchQuery = '';
      renderRulesTab();
    });
  }
}

/**
 * Handle search input
 */
function handleSearch(query) {
  currentSearchQuery = query;

  // Re-render just the content area
  const container = document.getElementById('rules-content');
  if (container) {
    container.innerHTML = renderSections();
  }

  // Also update the search bar to show/hide clear button
  const searchBar = document.querySelector('#tab-rules > div');
  if (searchBar) {
    const clearButtonHTML = query ? `
      <button
        id="rules-search-clear"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
      >
        <span class="material-symbols-outlined text-xl">close</span>
      </button>
    ` : '';

    const clearButton = document.getElementById('rules-search-clear');
    if (query && !clearButton) {
      // Add clear button
      const input = document.getElementById('rules-search');
      if (input && input.parentElement) {
        input.parentElement.insertAdjacentHTML('beforeend', clearButtonHTML);
        // Re-attach event handler
        document.getElementById('rules-search-clear')?.addEventListener('click', () => {
          currentSearchQuery = '';
          renderRulesTab();
        });
      }
    } else if (!query && clearButton) {
      // Remove clear button
      clearButton.remove();
    }
  }
}
