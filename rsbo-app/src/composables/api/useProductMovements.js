import { ref } from "vue";
import { fetchProductMovements } from "@/services/productMovements";

export function useProductMovements() {
  const loading = ref(false);
  const data = ref(null);
  const error = ref(null);

  async function load(period = "30d") {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetchProductMovements({ period });
      if (res.data?.ok) {
        data.value = res.data.data;
      }
    } catch (err) {
      error.value = err?.response?.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    data,
    error,
    load
  };
}
