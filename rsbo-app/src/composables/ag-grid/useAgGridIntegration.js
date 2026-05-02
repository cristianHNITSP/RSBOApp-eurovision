/**
 * useAgGridIntegration.js
 * Composable central para integrar AgGrid con el sistema de RSBO (WS, Guard, History, Sync).
 */

import { ref, shallowRef, onMounted, onBeforeUnmount, onActivated, onDeactivated, watch } from "vue";
import { useGridHistory } from "@/composables/ag-grid/useGridHistory";
import { useUnsavedGuard } from "@/composables/ag-grid/useUnsavedGuard";

export function useAgGridIntegration({ sheetId, sphType, guardKeyPrefix, onWsRefresh }) {
  const gridApi = shallowRef(null);
  const dirty = ref(false);
  const saving = ref(false);
  const lastSavedAt = ref(null);
  const switchingView = ref(false);
  const pendingChanges = ref(new Map());

  // ─── Grid history & unsaved guard ────────────────────────────────
  const gridHistory = useGridHistory({ maxSize: 300 });

  const unsavedGuard = useUnsavedGuard({
    storageKey: () => `${sheetId.value}:${guardKeyPrefix}:${sphType.value}`,
    isDirty: () => dirty.value,
    getPending: () => Object.fromEntries(pendingChanges.value),
    onRestore(saved) {
      for (const [k, v] of Object.entries(saved)) {
        pendingChanges.value.set(k, v);
      }
      if (pendingChanges.value.size > 0) {
        dirty.value = true;
      }
    },
  });

  // ─── Cross-tab sync (BroadcastChannel) ────────────────────────────
  let _broadcastCh = null;
  let _suppressNextWsRefresh = false;

  function initBroadcast() {
    if (typeof BroadcastChannel === "undefined") return;
    _broadcastCh?.close();
    _broadcastCh = new BroadcastChannel(`rsbo:inv:${sheetId.value}`);
    _broadcastCh.onmessage = () => { onWsRefresh?.(); };
  }

  function closeBroadcast() {
    _broadcastCh?.close();
    _broadcastCh = null;
  }

  function postMessage(msg) {
    _broadcastCh?.postMessage(msg);
  }

  // ─── WebSocket ────────────────────────────────────────────────────
  const _WS_STOCK = new Set(["LAB_ORDER_SCAN", "LAB_ORDER_CANCEL", "LAB_ORDER_RESET", "INVENTORY_CHUNK_SAVED", "INV_CHANGE"]);
  function onLabWs(e) {
    const type = e?.detail?.type;
    if (!_WS_STOCK.has(type)) return;

    const payload = e.detail?.payload || {};
    
    // Caso 1: Array de IDs (Bases y Micas / Laboratorio)
    if (payload.sheetIds && payload.sheetIds.length > 0) {
      if (!payload.sheetIds.includes(sheetId.value)) return;
    } 
    // Caso 2: ID único (Lentes de Contacto)
    else if (payload.sheetId) {
      if (String(payload.sheetId) !== String(sheetId.value)) return;
    }
    // Caso 3: Colección (Óptica - aunque las grillas AG-Grid no se usan para óptica usualmente)
    else if (payload.collection) {
      // Ignorar para grillas AG-Grid por ahora
      return;
    }

    if (_suppressNextWsRefresh) { _suppressNextWsRefresh = false; return; }
    onWsRefresh?.();
  }

  function suppressNextWsRefresh() { _suppressNextWsRefresh = true; }

  // ─── Lifecycle ───────────────────────────────────────────────────
  onMounted(() => {
    window.addEventListener("lab:ws", onLabWs);
    initBroadcast();
  });

  onActivated(() => {
    window.addEventListener("lab:ws", onLabWs);
    initBroadcast();
  });

  onDeactivated(() => {
    window.removeEventListener("lab:ws", onLabWs);
    closeBroadcast();
  });

  onBeforeUnmount(() => {
    window.removeEventListener("lab:ws", onLabWs);
    closeBroadcast();
  });

  watch(sheetId, () => { initBroadcast(); });

  return {
    gridApi,
    dirty,
    saving,
    lastSavedAt,
    switchingView,
    pendingChanges,
    gridHistory,
    unsavedGuard,
    suppressNextWsRefresh,
    postMessage,
  };
}
