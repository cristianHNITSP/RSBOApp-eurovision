import { ref } from "vue";

export const pendingOrdersCount = ref(0);

export function updatePendingCount(count) {
  pendingOrdersCount.value = Math.max(0, Number(count) || 0);
}
