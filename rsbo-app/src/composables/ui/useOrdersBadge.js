import { ref, onMounted, onBeforeUnmount } from "vue";
import { getOrderCounts } from "@/services/laboratorio";

export const pendingOrdersCount = ref(0);

export function updatePendingCount(count) {
  pendingOrdersCount.value = Math.max(0, Number(count) || 0);
}

export async function fetchPendingOrdersCount() {
  try {
    const { data } = await getOrderCounts();
    if (data?.ok) {
      const counts = data.data;
      updatePendingCount((counts.pendiente || 0) + (counts.parcial || 0));
    }
  } catch (e) {
    console.warn("[Badge] Failed to fetch pending orders count", e);
  }
}

/**
 * Composable para manejar el badge de pedidos pendientes de forma global.
 */
export function useOrdersBadge() {
  function onWs(e) {
    const type = e?.detail?.type;
    // Tipos de eventos que afectan el conteo de pedidos pendientes
    const TRIGGERS = ["LAB_ORDER_CREATE", "LAB_ORDER_SCAN", "LAB_ORDER_CLOSE", "LAB_ORDER_CANCEL", "LAB_ORDER_RESET"];
    if (TRIGGERS.includes(type)) {
      fetchPendingOrdersCount();
    }
  }

  onMounted(() => {
    fetchPendingOrdersCount();
    window.addEventListener("lab:ws", onWs);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("lab:ws", onWs);
  });

  return {
    pendingOrdersCount,
    fetchPendingOrdersCount
  };
}
