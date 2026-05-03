// rsbo-app/src/composables/lab/useLabOrders.js
import { ref, computed } from "vue";
import { listOrders, getOrderCounts } from "@/services/laboratorio";
import { normalizeOrder } from "./useLabMappers";
import { statusHuman, statusTagClass } from "@/utils/statusHelpers";
import { updatePendingCount } from "../ui/useOrdersBadge.js";

export function useLabOrders() {
  const ordersDB = ref([]);
  const selectedOrderId = ref("");
  const orderStatusFilter = ref("open");
  const orderQuery = ref("");
  const orderCounts = ref({ pendiente: 0, parcial: 0, cerrado: 0, cancelado: 0 });
  const loadingOrders = ref(false);

  const _inFlight = { orders: null };

  const filteredOrders = computed(() => {
    const all = ordersDB.value || [];
    const f = orderStatusFilter.value || "open";
    if (f === "all") return all;
    if (f === "open") return all.filter(o => o.status === "pendiente" || o.status === "parcial");
    return all.filter(o => o.status === f);
  });

  const selectedOrder = computed(() => ordersDB.value.find((o) => o.id === selectedOrderId.value) || null);

  async function loadOrders() {
    if (_inFlight.orders) return _inFlight.orders;
    loadingOrders.value = true;
    _inFlight.orders = (async () => {
      try {
        const params = {
          status: "all",
          q: String(orderQuery.value || "").trim() || undefined,
          limit: 200,
          _t: Date.now() // Cache buster
        };
        const { data } = await listOrders(params);
        const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        let mapped = arr.map(normalizeOrder);
        updatePendingCount(arr.filter((o) => o.status === "pendiente" || o.status === "parcial").length);
        mapped.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        ordersDB.value = mapped;

        // Prefer selecting an open order by default
        const firstOpen = mapped.find(o => o.status === "pendiente" || o.status === "parcial");
        
        if (!selectedOrderId.value) {
          if (firstOpen) selectedOrderId.value = firstOpen.id;
          else if (mapped.length) selectedOrderId.value = mapped[0].id;
        } else {
          // If the selected order is no longer in the list (e.g. deleted), pick a new one
          if (!mapped.find((x) => x.id === selectedOrderId.value) && mapped.length) {
            selectedOrderId.value = firstOpen ? firstOpen.id : mapped[0].id;
          }
        }
        loadOrderCounts();
      } catch (e) {
        console.error("[LAB] loadOrders", e?.response?.data || e);
        ordersDB.value = [];
      } finally {
        loadingOrders.value = false;
        _inFlight.orders = null;
      }
    })();
    return _inFlight.orders;
  }

  function updateOrderInLocalDB(updated) {
    if (!updated?.id) return;
    const idx = ordersDB.value.findIndex((x) => x.id === updated.id);
    if (idx >= 0) {
      ordersDB.value[idx] = updated;
    } else {
      ordersDB.value.unshift(updated);
    }
    // Refresh badge
    updatePendingCount(ordersDB.value.filter((o) => o.status === "pendiente" || o.status === "parcial").length);
  }

  async function loadOrderCounts() {
    try {
      const { data } = await getOrderCounts();
      if (data?.ok) Object.assign(orderCounts.value, data.data);
    } catch { /* silent */ }
  }

  const orderTotalCount = (o) => (o?.lines || []).reduce((acc, l) => acc + Number(l.qty || 0), 0);
  const orderPickedCount = (o) => (o?.lines || []).reduce((acc, l) => acc + Math.min(Number(l.picked || 0), Number(l.qty || 0)), 0);
  const orderProgressPct = (o) => {
    const t = orderTotalCount(o);
    return t <= 0 ? 0 : Math.round((orderPickedCount(o) / t) * 100);
  };
  const isOrderComplete = (o) => (o?.lines || []).every((l) => Number(l.picked || 0) >= Number(l.qty || 0));

  return {
    ordersDB,
    selectedOrderId,
    selectedOrder,
    orderStatusFilter,
    orderQuery,
    orderCounts,
    loadingOrders,
    filteredOrders,
    loadOrders,
    loadOrderCounts,
    updateOrderInLocalDB,
    statusHuman,
    statusTagClass,
    orderTotalCount,
    orderPickedCount,
    orderProgressPct,
    isOrderComplete
  };
}
