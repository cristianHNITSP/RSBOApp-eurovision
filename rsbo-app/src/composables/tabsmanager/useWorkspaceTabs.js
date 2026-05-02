import { ref } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import * as prefsService from "@/services/preferencesService";

// Global state Map to store state for different contexts (e.g., 'inventory', 'contactlenses')
const contexts = {};

const MAX_ACTIVE_TABS = 6;

const nowIso = () => new Date().toISOString();

// -- Debounce Logic for Preferences Sync --
const syncQueue = {
  activeId: null,
  pendingSync: null,
  contextTimers: new Map()
};

const debounceSync = (contextKey, fn, delay = 1000) => {
  if (syncQueue.contextTimers.has(contextKey)) {
    clearTimeout(syncQueue.contextTimers.get(contextKey));
  }
  const timer = setTimeout(() => {
    fn();
    syncQueue.contextTimers.delete(contextKey);
  }, delay);
  syncQueue.contextTimers.set(contextKey, timer);
};

const normalizeId = (t) => String(t?.id ?? t?._id ?? "");

// -- Global Listeners for Sheet Status Sync --
if (typeof window !== "undefined") {
  window.addEventListener("sheet-deleted-externally", (e) => {
    const { sheetId } = e.detail;
    Object.values(contexts).forEach(state => {
      const t = state.recentTemplates.value.find(x => x.id === sheetId);
      if (t) t.isDeleted = true;
    });
  });
  window.addEventListener("sheet-restored-externally", (e) => {
    const { sheetId } = e.detail;
    Object.values(contexts).forEach(state => {
      const t = state.recentTemplates.value.find(x => x.id === sheetId);
      if (t) t.isDeleted = false;
    });
  });
  window.addEventListener("sheet-purged-externally", (e) => {
    const { sheetId } = e.detail;
    Object.values(contexts).forEach(state => {
      const idx = state.recentTemplates.value.findIndex(x => x.id === sheetId);
      if (idx !== -1) state.recentTemplates.value.splice(idx, 1);
    });
  });
}

const normalizeTemplateBase = (t) => ({
  id: normalizeId(t),
  name: t?.name ?? t?.nombre ?? "",
  sku: t?.sku ?? null,
  tipo_matriz: t?.tipo_matriz
});

const toOpenTab = (t) => ({
  ...normalizeTemplateBase(t),
  opened_at: t?.opened_at ? new Date(t.opened_at).toISOString() : nowIso(),
  isPinned: Boolean(t?.is_pinned),
  pinnedAt: t?.pinned_at ? new Date(t.pinned_at).toISOString() : null
});

const toPinnedTab = (t) => ({
  ...normalizeTemplateBase(t),
  opened_at: t?.opened_at ? new Date(t.opened_at).toISOString() : nowIso(),
  isPinned: true,
  pinnedAt: t?.pinnedAt ? new Date(t.pinnedAt).toISOString() : nowIso()
});

const sortByDateDesc = (field) => (a, b) => {
  const aa = a?.[field] ? new Date(a[field]).getTime() : 0;
  const bb = b?.[field] ? new Date(b[field]).getTime() : 0;
  return bb - aa;
};

const buildNuevaTab = (existing = null) => ({
  id: "nueva",
  name: existing?.name ?? "+ Agregar"
});

const insertNuevaAt = (tabs, nuevaTab, index) => {
  const next = [...tabs];
  const target = index >= 0 ? Math.min(index, next.length) : 0;
  next.splice(target, 0, nuevaTab);
  return next;
};

const pickActiveId = (prefs, tabs) => {
  const candidate = prefs?.active_tab_id;
  if (candidate === "nueva") return "nueva";
  if (candidate && tabs.some((t) => t.id === candidate)) return candidate;

  const pinned = tabs.filter((t) => t.isPinned);
  const orderedPinned = pinned.sort(sortByDateDesc("pinnedAt"));
  if (orderedPinned[0]?.id) return orderedPinned[0].id;

  const orderedOpen = [...tabs].sort(sortByDateDesc("opened_at"));
  if (orderedOpen[0]?.id) return orderedOpen[0].id;

  return "nueva";
};

const mergePersistedTabs = (openTabs, pinnedTabs, existingTabs) => {
  const existingById = new Map((existingTabs || []).map((t) => [t.id, t]));
  const merged = [...openTabs];

  pinnedTabs.forEach((pinned) => {
    const idx = merged.findIndex((t) => t.id === pinned.id);
    if (idx !== -1) {
      merged[idx] = { ...merged[idx], ...pinned, isPinned: true, pinnedAt: pinned.pinnedAt || merged[idx].pinnedAt };
    } else {
      merged.push(pinned);
    }
  });

  return merged
    .filter((t) => t.id)
    .map((t) => (existingById.has(t.id) ? { ...existingById.get(t.id), ...t } : t));
};

const orderPersistedTabs = (tabs) => {
  const pinned = tabs.filter((t) => t.isPinned).sort(sortByDateDesc("pinnedAt"));
  const unpinned = tabs.filter((t) => !t.isPinned).sort(sortByDateDesc("opened_at"));
  return [...pinned, ...unpinned];
};

/**
 * Main Composable
 * @param {string} contextKey Module context (e.g., 'inventory', 'contactlenses')
 */
export function useWorkspaceTabs(contextKey = 'inventory') {
  // Initialize context state if it doesn't exist
  if (!contexts[contextKey]) {
    contexts[contextKey] = {
      activeTabs: ref([]),
      recentTemplates: ref([]),
      activeId: ref("nueva"),
      showLimitModal: ref(false),
      pendingTemplate: ref(null),
      catalogDefaultSection: ref("search"),
      isHydrating: false,
      isHydrated: false
    };
  }

  const state = contexts[contextKey];

  // -- Lifecycle / Initial Load --

  async function hydrate() {
    if (state.isHydrating) return;
    state.isHydrating = true;
    try {
      const res = await prefsService.getPreferences(contextKey);
      if (res.ok && res.data) {
        state.catalogDefaultSection.value = res.data.catalog_default_section || "search";

        const existingNueva = state.activeTabs.value.find((t) => t.id === "nueva");
        const nuevaIndex = state.activeTabs.value.findIndex((t) => t.id === "nueva");

        const openTabs = (res.data.open_tabs || []).map(toOpenTab);
        const pinnedTabs = (res.data.pinned_templates || []).map(toPinnedTab);
        
        // Filter out tabs that might be marked as deleted in the store (if we have that info)
        // or just ensure they aren't duplicates
        const hasPersistedTabs = openTabs.length > 0 || pinnedTabs.length > 0;
        const mergedTabs = mergePersistedTabs(openTabs, pinnedTabs, state.activeTabs.value);
        
        // CRITICAL: Filter out any tab that has been identified as deleted by the user
        const finalTabs = mergedTabs.filter(t => !t.isDeleted);
        const orderedTabs = orderPersistedTabs(finalTabs);

        if (hasPersistedTabs) {
          state.activeTabs.value = insertNuevaAt(orderedTabs, buildNuevaTab(existingNueva), nuevaIndex);
        } else {
          state.activeTabs.value = insertNuevaAt([], buildNuevaTab(existingNueva), nuevaIndex);
        }

        state.recentTemplates.value = res.data.recent_templates || [];

        if (hasPersistedTabs || res.data.active_tab_id) {
          state.activeId.value = pickActiveId(res.data, orderedTabs);
        } else {
          state.activeId.value = "nueva";
        }
        state.isHydrated = true;
      }
    } catch (e) {
      console.error(`[useWorkspaceTabs][${contextKey}] Hydration failed:`, e);
    } finally {
      state.isHydrating = false;
    }
  }

  // Auto-hydrate once per context
  if (!state.isHydrated && !state.isHydrating) {
    hydrate();
  }

  // -- Actions --

  function setActiveTab(id, { sync = true, touch = true } = {}) {
    if (!id) return;
    state.activeId.value = id;

    if (touch && id !== "nueva") {
      const tab = state.activeTabs.value.find((t) => t.id === id);
      if (tab) {
        tab.opened_at = nowIso();
        _syncOpenTab(tab);
      }
    }

    if (sync && !state.isHydrating) {
      _syncActiveTab(id);
    }
  }

  function dismissLimitModal() {
    state.showLimitModal.value = false;
    state.pendingTemplate.value = null;
  }

  function openTemplate(template) {
    const id = normalizeId(template);
    if (!id) return;

    // Check if already open
    const existing = state.activeTabs.value.find((t) => t.id === id);
    if (existing) {
      setActiveTab(id);
      _updateRecent(template);
      return;
    }

    const openCount = state.activeTabs.value.filter((t) => t.id !== "nueva").length;
    if (openCount >= MAX_ACTIVE_TABS) {
      state.pendingTemplate.value = template;
      state.showLimitModal.value = true;
      return;
    }

    const newTab = {
      ...normalizeTemplateBase(template),
      id,
      isPinned: false,
      opened_at: nowIso(),
      pinnedAt: null
    };

    _insertAfterPinned(newTab);
    _syncOpenTab(newTab);
    setActiveTab(newTab.id, { touch: false });
    _updateRecent(template);
    dismissLimitModal();
  }

  function closeTab(id) {
    const idx = state.activeTabs.value.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const tab = state.activeTabs.value[idx];
    if (tab.isPinned) {
      labToast.info("Desfija la pestaña para poder cerrarla.");
      return;
    }

    state.activeTabs.value.splice(idx, 1);

    if (state.activeId.value === id) {
      const fallback = _pickFallbackActive();
      setActiveTab(fallback, { touch: fallback !== "nueva" });
    }

    _removeOpenTab(id);
    _syncPinnedWithBackend();
  }

  function togglePinTab(id) {
    const tab = state.activeTabs.value.find((t) => t.id === id);
    if (!tab) return;

    tab.isPinned = !tab.isPinned;
    tab.pinnedAt = tab.isPinned ? nowIso() : null;

    _repositionAfterPinChange(tab);
    _syncPinnedWithBackend();
    _syncOpenTab(tab);
  }

  function reorderTabs(oldIndex, newIndex) {
    const tabs = state.activeTabs.value;
    const moved = tabs[oldIndex];
    if (!moved || moved.id === "nueva" || moved.isPinned) return;

    const pinnedCount = tabs.filter((t) => t.isPinned).length;
    const nuevaOffset = tabs.find((t) => t.id === "nueva") ? 1 : 0;
    const unpinnedStart = pinnedCount + nuevaOffset;

    if (newIndex < unpinnedStart) return;

    tabs.splice(oldIndex, 1);
    tabs.splice(newIndex, 0, moved);
  }

  function replaceTab(oldId, newTemplate) {
    closeTab(oldId);
    openTemplate(newTemplate);
    dismissLimitModal();
  }

  function closeMostRecentUnpinned() {
    const candidates = state.activeTabs.value.filter((t) => t.id !== "nueva" && !t.isPinned);
    if (!candidates.length) return null;
    const mostRecent = candidates.sort(sortByDateDesc("opened_at"))[0];
    closeTab(mostRecent.id);
    return mostRecent;
  }

  // -- Internal Helpers --

  function _insertAfterPinned(tab) {
    const tabs = state.activeTabs.value;
    const nuevaIdx = tabs.findIndex((t) => t.id === "nueva");
    const startIdx = nuevaIdx >= 0 ? nuevaIdx + 1 : 0;
    let insertIdx = startIdx;

    for (let i = startIdx; i < tabs.length; i += 1) {
      if (tabs[i].isPinned) insertIdx = i + 1;
      else break;
    }

    tabs.splice(insertIdx, 0, tab);
  }

  function _repositionAfterPinChange(tab) {
    const tabs = state.activeTabs.value;
    const idx = tabs.findIndex((t) => t.id === tab.id);
    if (idx === -1) return;

    tabs.splice(idx, 1);
    _insertAfterPinned(tab);
  }

  function _pickFallbackActive() {
    const tabs = state.activeTabs.value.filter((t) => t.id !== "nueva");
    if (!tabs.length) return "nueva";

    const pinned = tabs.filter((t) => t.isPinned).sort(sortByDateDesc("pinnedAt"));
    if (pinned[0]?.id) return pinned[0].id;

    const opened = tabs.sort(sortByDateDesc("opened_at"));
    return opened[0]?.id || "nueva";
  }

  async function _updateRecent(template) {
    const id = normalizeId(template);
    if (!id) return;

    const entry = {
      ...normalizeTemplateBase(template),
      id,
      lastModified: nowIso()
    };

    try {
      await prefsService.addRecentTemplate(entry, contextKey);
      const idx = state.recentTemplates.value.findIndex((t) => t.id === id);
      if (idx !== -1) state.recentTemplates.value.splice(idx, 1);
      state.recentTemplates.value.unshift(entry);
      if (state.recentTemplates.value.length > 20) state.recentTemplates.value.pop();
    } catch (e) {
      console.warn(`[useWorkspaceTabs][${contextKey}] Failed to sync recent template`, e);
    }
  }

  async function removeRecentTemplate(id) {
    if (!id) return;
    try {
      await prefsService.removeRecentTemplate(id, contextKey);
      const idx = state.recentTemplates.value.findIndex((t) => t.id === id);
      if (idx !== -1) {
        state.recentTemplates.value.splice(idx, 1);
      }
    } catch (e) {
      console.warn(`[useWorkspaceTabs][${contextKey}] Failed to remove recent template`, e);
    }
  }

  async function _syncPinnedWithBackend() {
    if (state.isHydrating) return;
    try {
      const pinned = state.activeTabs.value
        .filter((t) => t.isPinned && t.id !== "nueva")
        .map((t) => ({
          id: t.id,
          name: t.name,
          sku: t.sku,
          tipo_matriz: t.tipo_matriz,
          pinnedAt: t.pinnedAt ? new Date(t.pinnedAt) : new Date()
        }));
      await prefsService.updatePinnedTemplates(pinned, contextKey);
    } catch (e) {
      console.error(`[useWorkspaceTabs][${contextKey}] Sync pinned failed:`, e);
    }
  }

  async function _syncOpenTab(tab) {
    if (state.isHydrating || !tab?.id || tab.id === "nueva") return;
    try {
      await prefsService.saveOpenTab({
        id: tab.id,
        name: tab.name,
        sku: tab.sku,
        tipo_matriz: tab.tipo_matriz,
        opened_at: tab.opened_at,
        is_pinned: Boolean(tab.isPinned),
        pinned_at: tab.pinnedAt
      }, contextKey);
    } catch (e) {
      console.warn(`[useWorkspaceTabs][${contextKey}] Failed to sync open tab`, e);
    }
  }

  async function _removeOpenTab(id) {
    if (state.isHydrating || !id || id === "nueva") return;
    try {
      await prefsService.removeOpenTab(id, contextKey);
    } catch (e) {
      console.warn(`[useWorkspaceTabs][${contextKey}] Failed to remove open tab`, e);
    }
  }

  async function _syncActiveTab(id) {
    if (state.isHydrating || !id) return;
    debounceSync(`${contextKey}:activeTab`, async () => {
      try {
        await prefsService.setActiveTab(id, contextKey);
      } catch (e) {
        console.warn(`[useWorkspaceTabs][${contextKey}] Failed to sync active tab`, e);
      }
    }, 1500);
  }

  return {
    activeTabs: state.activeTabs,
    recentTemplates: state.recentTemplates,
    activeId: state.activeId,
    showLimitModal: state.showLimitModal,
    pendingTemplate: state.pendingTemplate,
    catalogDefaultSection: state.catalogDefaultSection,
    openTemplate,
    closeTab,
    closeMostRecentUnpinned,
    removeRecentTemplate,
    togglePinTab,
    reorderTabs,
    replaceTab,
    setActiveTab,
    dismissLimitModal,
    hydrate,
    MAX_ACTIVE_TABS
  };
}
