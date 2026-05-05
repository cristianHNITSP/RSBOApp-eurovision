import { ref } from 'vue';
import api from '@/api/axios';

export function useCashClosures() {
  const closures = ref([]);
  const loading  = ref(false);
  const total    = ref(0);

  async function fetchClosures(page = 1, limit = 10) {
    loading.value = true;
    try {
      const res = await api.get('/inventory/cash-closures', { params: { page, limit } });
      if (res.data && res.data.ok) {
        closures.value = res.data.data;
        total.value    = res.data.total;
      }
    } catch (err) {
      console.error('[CASH-CLOSURES] Error fetching:', err);
    } finally {
      loading.value = false;
    }
  }

  async function getSummary() {
    try {
      const res = await api.get('/inventory/cash-closures/current-summary');
      return res.data?.ok ? res.data.data : null;
    } catch (err) {
      console.error('[CASH-CLOSURES] Error summary:', err);
      return null;
    }
  }

  async function performClosure(observations = '') {
    try {
      const res = await api.post('/inventory/cash-closures', { observations });
      return res.data?.ok ? res.data.data : null;
    } catch (err) {
      console.error('[CASH-CLOSURES] Error creating:', err);
      throw err;
    }
  }

  return {
    closures,
    loading,
    total,
    fetchClosures,
    getSummary,
    performClosure
  };
}
