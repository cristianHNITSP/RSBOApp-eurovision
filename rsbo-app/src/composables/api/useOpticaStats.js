// src/composables/api/useOpticaStats.js
import { ref, computed } from "vue";
import { fetchOpticaStockSummary } from "@/services/opticaStats";

const sharedStats = ref(null);
const sharedLoading = ref(false);
const sharedError = ref(null);
let lastFetchPromise = null;

export function useOpticaStats() {
  async function load(force = false) {
    if (sharedLoading.value && !force) return lastFetchPromise;
    if (sharedStats.value && !force) return Promise.resolve(sharedStats.value);

    sharedLoading.value = true;
    sharedError.value = null;

    lastFetchPromise = (async () => {
      try {
        const { data } = await fetchOpticaStockSummary();
        if (data?.ok) {
          sharedStats.value = data.data;
          return data.data;
        }
      } catch (e) {
        sharedError.value = e?.response?.data?.message || e.message;
        throw e;
      } finally {
        sharedLoading.value = false;
        lastFetchPromise = null;
      }
    })();

    return lastFetchPromise;
  }

  return {
    opticaSummary: sharedStats,
    loading: sharedLoading,
    error: sharedError,
    load,
  };
}
