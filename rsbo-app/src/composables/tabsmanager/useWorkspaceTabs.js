import { ref } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import * as prefsService from "@/services/preferencesService";

// Global state to be shared across components
const activeTabs = ref([]); // [{ id, name, sku, isPinned, opened_at, pinnedAt }]
const recentTemplates = ref([]); // History of used templates
const activeId = ref("nueva");
const showLimitModal = ref(false);
const pendingTemplate = ref(null); // Template that triggered the modal
const catalogDefaultSection = ref("search");

const MAX_ACTIVE_TABS = 6;

// Flag to avoid infinite loops during sync
let isHydrating = false;

const nowIso = () => new Date().toISOString();

const normalizeId = (t) => String(t?.id ?? t?._id ?? "");

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

export function useWorkspaceTabs() {
  // -- Lifecycle / Initial Load --

  async function hydrate() {
    if (isHydrating) return;
    isHydrating = true;
    try {
      const res = await prefsService.getPreferences();
      if (res.ok && res.data) {
        catalogDefaultSection.value = res.data.catalog_default_section || "search";

        const existingNueva = activeTabs.value.find((t) => t.id === "nueva");
        const nuevaIndex = activeTabs.value.findIndex((t) => t.id === "nueva");

        const openTabs = (res.data.open_tabs || []).map(toOpenTab);
        const pinnedTabs = (res.data.pinned_templates || []).map(toPinnedTab);
        const hasPersistedTabs = openTabs.length > 0 || pinnedTabs.length > 0;
        const mergedTabs = mergePersistedTabs(openTabs, pinnedTabs, activeTabs.value);
        const orderedTabs = orderPersistedTabs(mergedTabs);

        if (hasPersistedTabs) {
          activeTabs.value = insertNuevaAt(orderedTabs, buildNuevaTab(existingNueva), nuevaIndex);
        } else {
          activeTabs.value = insertNuevaAt([], buildNuevaTab(existingNueva), nuevaIndex);
        }

        recentTemplates.value = res.data.recent_templates || [];

        if (hasPersistedTabs || res.data.active_tab_id) {
          activeId.value = pickActiveId(res.data, orderedTabs);
        } else {
          activeId.value = "nueva";
        }
      }
    } catch (e) {
      console.error("[useWorkspaceTabs] Hydration failed:", e);
    } finally {
      isHydrating = false;
    }
  }

  // Global hydration state to prevent multiple calls
  if (typeof window !== "undefined" && !window.__tabsHydrated) {
    window.__tabsHydrated = true;
    hydrate();
  }

  // -- Actions --

  function setActiveTab(id, { sync = true, touch = true } = {}) {
    if (!id) return;
    activeId.value = id;

    if (touch && id !== "nueva") {
      const tab = activeTabs.value.find((t) => t.id === id);
      if (tab) {
        tab.opened_at = nowIso();
        _syncOpenTab(tab);
      }
    }

    if (sync && !isHydrating) {
      _syncActiveTab(id);
    }
  }

  function dismissLimitModal() {
    showLimitModal.value = false;
    pendingTemplate.value = null;
  }

  function openTemplate(template) {
    const id = normalizeId(template);
    if (!id) return;

    // Check if already open
    const existing = activeTabs.value.find((t) => t.id === id);
    if (existing) {
      setActiveTab(id);
      _updateRecent(template);
      return;
    }

    const openCount = activeTabs.value.filter((t) => t.id !== "nueva").length;
    if (openCount >= MAX_ACTIVE_TABS) {
      pendingTemplate.value = template;
      showLimitModal.value = true;
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
    const idx = activeTabs.value.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const tab = activeTabs.value[idx];
    if (tab.isPinned) {
      labToast.info("Desfija la pestaña para poder cerrarla.");
      return;
    }

    activeTabs.value.splice(idx, 1);

    if (activeId.value === id) {
      const fallback = _pickFallbackActive();
      setActiveTab(fallback, { touch: fallback !== "nueva" });
    }

    _removeOpenTab(id);
    _syncPinnedWithBackend();
  }

  function togglePinTab(id) {
    const tab = activeTabs.value.find((t) => t.id === id);
    if (!tab) return;

    tab.isPinned = !tab.isPinned;
    tab.pinnedAt = tab.isPinned ? nowIso() : null;

    if (tab.isPinned) {
      labToast.info(`Pestaña "${tab.name}" fijada.`);
    }

    _repositionAfterPinChange(tab);
    _syncPinnedWithBackend();
    _syncOpenTab(tab);
  }

  function reorderTabs(oldIndex, newIndex) {
    const tabs = activeTabs.value;
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
    const candidates = activeTabs.value.filter((t) => t.id !== "nueva" && !t.isPinned);
    if (!candidates.length) return null;
    const mostRecent = candidates.sort(sortByDateDesc("opened_at"))[0];
    closeTab(mostRecent.id);
    return mostRecent;
  }

  // -- Internal Helpers --

  function _insertAfterPinned(tab) {
    const tabs = activeTabs.value;
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
    const tabs = activeTabs.value;
    const idx = tabs.findIndex((t) => t.id === tab.id);
    if (idx === -1) return;

    tabs.splice(idx, 1);
    _insertAfterPinned(tab);
  }

  function _pickFallbackActive() {
    const tabs = activeTabs.value.filter((t) => t.id !== "nueva");
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
      await prefsService.addRecentTemplate(entry);
      const idx = recentTemplates.value.findIndex((t) => t.id === id);
      if (idx !== -1) recentTemplates.value.splice(idx, 1);
      recentTemplates.value.unshift(entry);
      if (recentTemplates.value.length > 20) recentTemplates.value.pop();
    } catch (e) {
      console.warn("[useWorkspaceTabs] Failed to sync recent template", e);
    }
  }

  async function removeRecentTemplate(id) {
    if (!id) return;
    try {
      await prefsService.removeRecentTemplate(id);
      const idx = recentTemplates.value.findIndex((t) => t.id === id);
      if (idx !== -1) {
        recentTemplates.value.splice(idx, 1);
      }
    } catch (e) {
      console.warn("[useWorkspaceTabs] Failed to remove recent template", e);
    }
  }

  async function _syncPinnedWithBackend() {
    if (isHydrating) return;
    try {
      const pinned = activeTabs.value
        .filter((t) => t.isPinned && t.id !== "nueva")
        .map((t) => ({
          id: t.id,
          name: t.name,
          sku: t.sku,
          tipo_matriz: t.tipo_matriz,
          pinnedAt: t.pinnedAt ? new Date(t.pinnedAt) : new Date()
        }));
      await prefsService.updatePinnedTemplates(pinned);
    } catch (e) {
      console.error("[useWorkspaceTabs] Sync pinned failed:", e);
    }
  }

  async function _syncOpenTab(tab) {
    if (isHydrating || !tab?.id || tab.id === "nueva") return;
    try {
      await prefsService.saveOpenTab({
        id: tab.id,
        name: tab.name,
        sku: tab.sku,
        tipo_matriz: tab.tipo_matriz,
        opened_at: tab.opened_at,
        is_pinned: Boolean(tab.isPinned),
        pinned_at: tab.pinnedAt
      });
    } catch (e) {
      console.warn("[useWorkspaceTabs] Failed to sync open tab", e);
    }
  }

  async function _removeOpenTab(id) {
    if (isHydrating || !id || id === "nueva") return;
    try {
      await prefsService.removeOpenTab(id);
    } catch (e) {
      console.warn("[useWorkspaceTabs] Failed to remove open tab", e);
    }
  }

  async function _syncActiveTab(id) {
    if (isHydrating || !id) return;
    try {
      await prefsService.setActiveTab(id);
    } catch (e) {
      console.warn("[useWorkspaceTabs] Failed to sync active tab", e);
    }
  }

  return {
    activeTabs,
    recentTemplates,
    activeId,
    showLimitModal,
    pendingTemplate,
    catalogDefaultSection,
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
