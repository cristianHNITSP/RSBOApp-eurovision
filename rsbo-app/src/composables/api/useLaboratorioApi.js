// rsbo-app/src/composables/api/useLaboratorioApi.js
import { ref, watch, onMounted, onBeforeUnmount, provide } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import { sanitizeUserText } from "@/utils/errorSanitizer";

// Atomic Composables
import { useLabSheets } from "../lab/useLabSheets";
import { useLabItems } from "../lab/useLabItems";
import { useLabOrders } from "../lab/useLabOrders";
import { useLabEvents } from "../lab/useLabEvents";
import { useLabMutations } from "../lab/useLabMutations";
import { useLabExports } from "../lab/useLabExports";
import * as mappers from "../lab/useLabMappers";

// Socket
import { initLabSocket } from "../shared/useLabSocket.js";

export function useLaboratorioApi(getUser) {
  const notify = (message, type = "is-info", duration = 4000) => {
    const clean = sanitizeUserText(String(message ?? ""), { maxLen: 200 }) || "Listo.";
    labToast.show(clean, type, duration);
  };

  // ── Orchestration ──
  const sheets = useLabSheets();
  const items = useLabItems(sheets);
  const orders = useLabOrders();
  const events = useLabEvents();

  // Shared UI state
  const activeMainTab = ref("pedidos");
  const mode = ref("default");

  const mutations = useLabMutations({
    getUser,
    sheets,
    items,
    orders,
    events,
    notify,
    mode
  });

  const exports_ = useLabExports({
    orders,
    items,
    events,
    sheets,
    notify
  });

  // ── WS handler ──
  const LAB_WS_EVENTS = new Set(["LAB_ORDER_CREATE", "LAB_ORDER_CANCEL", "LAB_ORDER_CLOSE", "LAB_ORDER_SCAN", "LAB_ORDER_RESET"]);
  function _onWsEvent(e) {
    const { type, payload } = e?.detail || {};
    if (LAB_WS_EVENTS.has(type)) {
      orders.loadOrders();
      events.loadEvents();
      if (orders.selectedOrderId.value && payload?.orderId === orders.selectedOrderId.value) {
        events.loadOrderEvents(orders.selectedOrderId.value);
      }
    }
  }

  // ── Watchers (Orchestration) ──
  watch([sheets.selectedSheetId], () => { items.loadItems(); });
  watch(orders.selectedOrderId, (id) => {
    events.loadOrderEvents(id);
    const o = orders.ordersDB.value.find((x) => x.id === id);
    if (o && mode.value === "surtir" && o.sheetId) sheets.selectedSheetId.value = o.sheetId;
  });

  onMounted(async () => {
    initLabSocket();
    await Promise.all([sheets.loadSheets(), orders.loadOrders(), events.loadEvents()]);
    await items.loadItems();
    window.addEventListener("lab:ws", _onWsEvent);
  });

  onBeforeUnmount(() => {
    items.abortItems();
    window.removeEventListener("lab:ws", _onWsEvent);
  });

  const loadingRefreshAll = ref(false);
  const refreshAll = async () => {
    loadingRefreshAll.value = true;
    try {
      await Promise.all([sheets.loadSheets(), orders.loadOrders(), items.loadItems(), events.loadEvents()]);
    } finally {
      loadingRefreshAll.value = false;
    }
  };

  const api = {
    activeMainTab,
    mode,
    loadingRefreshAll,
    refreshAll,
    ...sheets,
    ...items,
    ...orders,
    ...events,
    ...mutations,
    ...exports_,
    ...mappers,
  };

  // Provide for deep components if needed
  provide("lab", api);

  return api;
}