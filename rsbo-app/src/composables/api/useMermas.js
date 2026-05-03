// src/composables/api/useMermas.js
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import { listMermas, createMerma, getMermaStats } from "@/services/mermas";

/**
 * Composable para listar/crear mermas y reaccionar al evento WS `mermas:refresh`.
 */
export function useMermas(initialFilters = {}) {
  const items   = ref([]);
  const meta    = ref({ page: 1, limit: 20, total: 0, pages: 0 });
  const loading = ref(false);
  const saving  = ref(false);
  const error   = ref(null);
  const stats   = ref(null);
  const filters = reactive({
    origin:   initialFilters.origin   || null,
    sheet:    initialFilters.sheet    || null,
    dateFrom: initialFilters.dateFrom || null,
    dateTo:   initialFilters.dateTo   || null,
    search:   initialFilters.search   || "",
    page:     1,
    limit:    initialFilters.limit    || 20,
  });

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const params = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v !== null && v !== "") params[k] = v;
      }
      const { data } = await listMermas(params);
      items.value = data?.items || [];
      meta.value  = data?.meta  || meta.value;
    } catch (e) {
      error.value = e?.response?.data?.error || e.message || "Error al cargar mermas";
    } finally {
      loading.value = false;
    }
  }

  async function loadStats() {
    try {
      const params = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo)   params.dateTo   = filters.dateTo;
      const { data } = await getMermaStats(params);
      stats.value = data?.data || null;
    } catch (e) { /* noop */ }
  }

  async function create(payload) {
    saving.value = true;
    try {
      const { data } = await createMerma(payload);
      await load();
      return data?.data || null;
    } finally {
      saving.value = false;
    }
  }

  function setFilter(patch) {
    Object.assign(filters, patch);
    if (!("page" in patch)) filters.page = 1;
    return load();
  }

  // WebSocket refresh hook
  function onWsRefresh() { load(); }
  onMounted(() => {
    window.addEventListener("mermas:refresh", onWsRefresh);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("mermas:refresh", onWsRefresh);
  });

  return { items, meta, loading, saving, error, stats, filters, load, loadStats, create, setFilter };
}
