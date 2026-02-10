/**
 * Campaign Tab — campaign list, create, switch, rename, delete, import/export
 */

import { getState, setState, createNewCampaign, loadCampaignIntoState, updateCampaign } from '../state/store.js';
import { getAllCampaigns, deleteCampaign, exportCampaignJSON, importCampaignJSON, saveCampaign, loadCampaign } from '../state/storage.js';
import { showModal, hideModal, showConfirmDialog } from '../ui/modals.js';
import { $ } from '../../utils/dom.js';
import { escapeHtml } from '../../utils/html.js';

/**
 * Render the campaign tab
 */
export async function renderCampaignTab() {
  const container = $('#tab-campaign');
  if (!container) return;

  const campaigns = await getAllCampaigns();
  const { campaign: activeCampaign } = getState();

  container.innerHTML = renderCampaignList(campaigns, activeCampaign);
  attachCampaignListeners(container, campaigns);
}

/**
 * Render campaign list HTML
 */
function renderCampaignList(campaigns, activeCampaign) {
  const count = campaigns.length;

  return `
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-white">Kampane</h2>
          <span class="text-sm text-gray-500">(${count})</span>
        </div>
        <div class="flex items-center gap-2">
          <label class="px-4 py-2 rounded border cursor-pointer transition font-semibold text-sm bg-gray-700/40 hover:bg-gray-600/60 border-gray-600/50 text-gray-300">
            <span class="flex items-center gap-2">
              <span class="material-symbols-outlined text-base">upload</span>
              Import
            </span>
            <input type="file" accept=".json" id="campaign-import-input" class="hidden">
          </label>
          <button id="btn-new-campaign" class="px-4 py-2 rounded border transition font-semibold text-sm bg-red-900/40 hover:bg-red-800/60 border-red-700/50 text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-base">add</span>
            Nova kampan
          </button>
        </div>
      </div>

      <!-- Campaign cards -->
      ${count === 0 ? renderEmptyState() : campaigns.map(c => renderCampaignCard(c, activeCampaign)).join('')}
    </div>
  `;
}

/**
 * Render empty state
 */
function renderEmptyState() {
  return `
    <div class="text-center text-gray-400 py-20">
      <span class="material-symbols-outlined text-6xl mb-4 block">folder_off</span>
      <p class="text-lg mb-2">Zadne kampane</p>
      <p class="text-sm text-gray-500">Vytvorte novou kampan nebo importujte existujici.</p>
    </div>
  `;
}

/**
 * Render a single campaign card
 */
function renderCampaignCard(campaign, activeCampaign) {
  const isActive = activeCampaign?.id === campaign.id;
  const mysteryCount = campaign.mysteries?.length || 0;
  const hunterCount = campaign.hunters?.length || 0;
  const lastModified = formatDate(campaign.lastModified);

  return `
    <div class="campaign-card mb-3 p-4 rounded-lg border transition ${isActive
      ? 'bg-red-900/20 border-red-700/40'
      : 'bg-gray-800/40 border-white/5 hover:border-white/10'
    }" data-campaign-id="${campaign.id}">
      <div class="flex items-start justify-between gap-4">
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-lg font-semibold text-white truncate">${escapeHtml(campaign.name)}</h3>
            ${isActive ? '<span class="px-2 py-0.5 text-xs font-bold rounded bg-red-900/50 text-red-300 border border-red-700/30 shrink-0">Aktivni</span>' : ''}
          </div>
          <div class="flex items-center gap-4 text-sm text-gray-400">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-base">mystery</span>
              ${mysteryCount} ${mysteryCount === 1 ? 'zahada' : mysteryCount >= 2 && mysteryCount <= 4 ? 'zahady' : 'zahad'}
            </span>
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-base">group</span>
              ${hunterCount} ${hunterCount === 1 ? 'lovec' : hunterCount >= 2 && hunterCount <= 4 ? 'lovci' : 'lovcu'}
            </span>
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-base">schedule</span>
              ${lastModified}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 shrink-0">
          ${!isActive ? `
            <button class="btn-switch-campaign p-2 rounded hover:bg-white/10 text-gray-400 hover:text-green-400 transition" title="Prepnout na tuto kampan" data-id="${campaign.id}">
              <span class="material-symbols-outlined text-xl">swap_horiz</span>
            </button>
          ` : ''}
          <button class="btn-rename-campaign p-2 rounded hover:bg-white/10 text-gray-400 hover:text-blue-400 transition" title="Prejmenovat" data-id="${campaign.id}" data-name="${escapeHtml(campaign.name)}">
            <span class="material-symbols-outlined text-xl">edit</span>
          </button>
          <button class="btn-export-campaign p-2 rounded hover:bg-white/10 text-gray-400 hover:text-yellow-400 transition" title="Exportovat JSON" data-id="${campaign.id}">
            <span class="material-symbols-outlined text-xl">download</span>
          </button>
          <button class="btn-delete-campaign p-2 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition" title="Smazat" data-id="${campaign.id}" data-name="${escapeHtml(campaign.name)}">
            <span class="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to campaign tab
 */
function attachCampaignListeners(container, campaigns) {
  // New campaign
  const btnNew = $('#btn-new-campaign', container);
  if (btnNew) {
    btnNew.addEventListener('click', handleCreateCampaign);
  }

  // Import
  const importInput = $('#campaign-import-input', container);
  if (importInput) {
    importInput.addEventListener('change', handleImportCampaign);
  }

  // Switch buttons
  container.querySelectorAll('.btn-switch-campaign').forEach(btn => {
    btn.addEventListener('click', () => handleSwitchCampaign(btn.dataset.id));
  });

  // Rename buttons
  container.querySelectorAll('.btn-rename-campaign').forEach(btn => {
    btn.addEventListener('click', () => handleRenameCampaign(btn.dataset.id, btn.dataset.name));
  });

  // Export buttons
  container.querySelectorAll('.btn-export-campaign').forEach(btn => {
    btn.addEventListener('click', () => handleExportCampaign(btn.dataset.id));
  });

  // Delete buttons
  container.querySelectorAll('.btn-delete-campaign').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteCampaign(btn.dataset.id, btn.dataset.name, campaigns.length));
  });
}

// ─── Handlers ─────────────────────────────────────────────────

async function handleCreateCampaign() {
  showModal({
    title: 'Nova kampan',
    content: `
      <label class="block text-sm text-gray-400 mb-2">Nazev kampane</label>
      <input id="new-campaign-name" type="text" class="w-full bg-gray-800 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-red-700/50" placeholder="Moje nova kampan" autofocus>
    `,
    buttons: [
      { id: 'btn-cancel', label: 'Zrusit', primary: false },
      { id: 'btn-create', label: 'Vytvorit', primary: true }
    ]
  });

  const input = $('#new-campaign-name');
  const createBtn = $('#btn-create');
  const cancelBtn = $('#btn-cancel');

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createBtn?.click();
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const name = input?.value?.trim();
      if (!name) {
        window.showToast?.({ message: 'Zadejte nazev kampane', type: 'warning' });
        return;
      }
      hideModal();
      const campaign = createNewCampaign(name);
      setState({ currentMysteryId: null });
      await saveCampaign(campaign);
      window.showToast?.({ message: `Kampan "${name}" vytvorena`, type: 'success' });
      await refreshAfterChange();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideModal);
  }
}

async function handleSwitchCampaign(id) {
  try {
    const campaign = await loadCampaignIntoState(id);
    const firstMystery = campaign.mysteries?.[0]?.id || null;
    setState({ currentMysteryId: firstMystery });
    window.showToast?.({ message: `Prepnuto na "${campaign.name}"`, type: 'success' });
    await refreshAfterChange();
  } catch (error) {
    console.error('Failed to switch campaign:', error);
    window.showToast?.({ message: 'Nepodarilo se prepnout kampan', type: 'error' });
  }
}

async function handleDeleteCampaign(id, name, total) {
  if (total <= 1) {
    window.showToast?.({ message: 'Nelze smazat posledni kampan', type: 'warning' });
    return;
  }

  const { campaign: activeCampaign } = getState();
  const isActive = activeCampaign?.id === id;

  showConfirmDialog({
    title: 'Smazat kampan',
    message: `Opravdu chcete smazat kampan <strong>"${escapeHtml(name)}"</strong>? Tato akce je nevratna.`,
    confirmText: 'Smazat',
    cancelText: 'Zrusit',
    onConfirm: async () => {
      try {
        await deleteCampaign(id);

        if (isActive) {
          const remaining = await getAllCampaigns();
          if (remaining.length > 0) {
            await handleSwitchCampaign(remaining[0].id);
          }
        }

        window.showToast?.({ message: `Kampan "${name}" smazana`, type: 'success' });
        await renderCampaignTab();
      } catch (error) {
        console.error('Failed to delete campaign:', error);
        window.showToast?.({ message: 'Nepodarilo se smazat kampan', type: 'error' });
      }
    }
  });
}

async function handleRenameCampaign(id, currentName) {
  showModal({
    title: 'Prejmenovat kampan',
    content: `
      <label class="block text-sm text-gray-400 mb-2">Novy nazev</label>
      <input id="rename-campaign-input" type="text" class="w-full bg-gray-800 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-red-700/50" value="${escapeHtml(currentName)}">
    `,
    buttons: [
      { id: 'btn-cancel', label: 'Zrusit', primary: false },
      { id: 'btn-rename', label: 'Prejmenovat', primary: true }
    ]
  });

  const input = $('#rename-campaign-input');
  const renameBtn = $('#btn-rename');
  const cancelBtn = $('#btn-cancel');

  if (input) {
    input.select();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') renameBtn?.click();
    });
  }

  if (renameBtn) {
    renameBtn.addEventListener('click', async () => {
      const newName = input?.value?.trim();
      if (!newName) {
        window.showToast?.({ message: 'Zadejte nazev kampane', type: 'warning' });
        return;
      }
      hideModal();

      try {
        const { campaign: activeCampaign } = getState();
        if (activeCampaign?.id === id) {
          updateCampaign({ name: newName });
        } else {
          const campaign = await loadCampaign(id);
          if (campaign) {
            campaign.name = newName;
            campaign.lastModified = Date.now();
            await saveCampaign(campaign);
          }
        }
        window.showToast?.({ message: `Kampan prejmenovana na "${newName}"`, type: 'success' });
        await renderCampaignTab();
      } catch (error) {
        console.error('Failed to rename campaign:', error);
        window.showToast?.({ message: 'Nepodarilo se prejmenovat kampan', type: 'error' });
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideModal);
  }
}

async function handleExportCampaign(id) {
  try {
    await exportCampaignJSON(id);
    window.showToast?.({ message: 'Kampan exportovana', type: 'success' });
  } catch (error) {
    console.error('Failed to export campaign:', error);
    window.showToast?.({ message: 'Nepodarilo se exportovat kampan', type: 'error' });
  }
}

async function handleImportCampaign(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const campaign = await importCampaignJSON(file);
    window.showToast?.({ message: `Kampan "${campaign.name}" importovana`, type: 'success' });
    await renderCampaignTab();
  } catch (error) {
    console.error('Failed to import campaign:', error);
    window.showToast?.({ message: 'Nepodarilo se importovat kampan. Zkontrolujte format souboru.', type: 'error' });
  }

  // Reset input so same file can be imported again
  event.target.value = '';
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Refresh dependent UI after campaign change
 */
async function refreshAfterChange() {
  // Re-render campaign tab
  await renderCampaignTab();

  // Re-render session tab (doesn't auto-refresh via subscriber)
  const { renderSessionTab } = await import('./session.js');
  renderSessionTab();
}

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp) {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
