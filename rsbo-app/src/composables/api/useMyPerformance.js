import { ref } from "vue";
import { fetchMyPerformance } from "@/services/myPerformance";

export function useMyPerformance() {
  const loading = ref(false);
  const data = ref(null);
  const error = ref(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetchMyPerformance();
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
