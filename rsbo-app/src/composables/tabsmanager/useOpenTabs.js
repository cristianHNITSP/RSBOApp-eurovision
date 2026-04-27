/**
 * rsbo-app/src/composables/tabsmanager/useOpenTabs.js
 * Gestiona el pool de máximo 8 slots (Workspace) con persistencia y lógica LRU.
 */
import { ref, watch } from "vue";

export function useOpenTabs(apiType, getSheetsByIds) {
  const MAX_TABS = 8;
  const STORAGE_KEY = `rsbo:tabs:${apiType}`;

  // Estado reactivo
  const openSheets = ref([]); // [{ id, name, sku, ... }]
  const activeId = ref(null);
  const lastUsedIds = ref([]); // Cola LRU: [nuevo, ..., viejo]

  // Cargar desde localStorage al iniciar
  async function hydrate() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      activeId.value = 'nueva';
      return;
    }
    try {
      const saved = JSON.parse(raw);
      const ids = saved.tabs?.map(t => t.id) || [];
      
      if (ids.length > 0 && typeof getSheetsByIds === 'function') {
        const res = await getSheetsByIds(ids);
        if (res.ok) {
          openSheets.value = res.data || [];
        } else {
          openSheets.value = saved.tabs || [];
        }
      } else {
        openSheets.value = saved.tabs || [];
      }

      activeId.value = saved.activeId || 'nueva';
      lastUsedIds.value = saved.lastUsedIds || [];
    } catch (e) {
      console.error("[useOpenTabs] Error hydrating:", e);
      activeId.value = 'nueva';
    }
  }

  // Persistir cambios
  watch([openSheets, activeId, lastUsedIds], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tabs: openSheets.value,
      activeId: activeId.value,
      lastUsedIds: lastUsedIds.value
    }));
  }, { deep: true });

  function setActiveTab(id) {
    if (!id) return;
    activeId.value = id;
    // Actualizar LRU: mover al frente
    const idx = lastUsedIds.value.indexOf(id);
    if (idx !== -1) lastUsedIds.value.splice(idx, 1);
    lastUsedIds.value.unshift(id);
  }

  function openTab(sheet) {
    if (!sheet?.id && !sheet?._id) return;
    const id = sheet.id || sheet._id;

    const existingIdx = openSheets.value.findIndex(t => t.id === id);
    
    if (existingIdx !== -1) {
      setActiveTab(id);
      return { status: 'already_open' };
    }

    if (openSheets.value.length >= MAX_TABS) {
      // Evict oldest
      const oldestId = lastUsedIds.value[lastUsedIds.value.length - 1];
      closeTab(oldestId);
    }

    openSheets.value.push({
      id,
      name: sheet.nombre || sheet.name,
      sku: sheet.sku,
      tipo_matriz: sheet.tipo_matriz
    });
    setActiveTab(id);
    return { status: 'opened' };
  }

  function closeTab(id) {
    const idx = openSheets.value.findIndex(t => t.id === id);
    if (idx === -1) return;

    openSheets.value.splice(idx, 1);
    
    const lruIdx = lastUsedIds.value.indexOf(id);
    if (lruIdx !== -1) lastUsedIds.value.splice(lruIdx, 1);

    if (activeId.value === id) {
      activeId.value = lastUsedIds.value[0] || 'nueva';
    }
  }

  function reorderTabs(oldIndex, newIndex) {
    const moved = openSheets.value.splice(oldIndex, 1)[0];
    openSheets.value.splice(newIndex, 0, moved);
  }

  function addCreatedSheet(sheet) {
    const id = sheet.id || sheet._id;
    openSheets.value.push({
      id,
      name: sheet.nombre || sheet.name,
      sku: sheet.sku,
      tipo_matriz: sheet.tipo_matriz
    });
    setActiveTab(id);
  }

  // Auto-hydrate
  hydrate();

  return {
    openSheets,
    activeId,
    openTab,
    closeTab,
    setActiveTab,
    reorderTabs,
    addCreatedSheet,
    hydrate
  };
}
