// src/composables/api/useMermas.js
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import { 
  listMermas, createMerma, getMermaStats,
  listOpticaMermas, createOpticaMerma 
} from "@/services/mermas";

/**
 * Composable para listar/crear mermas y reaccionar al evento WS `mermas:refresh`.
 */
export function useMermas(initialFilters = {}) {
  const items   = ref([]);
  const meta    = ref({ page: 1, limit: 7, total: 0, pages: 0 });
  const loading = ref(false);
  const saving  = ref(false);
  const error   = ref(null);
  const stats   = ref(null);
  const filters = reactive({
    service:  initialFilters.service  || 'inventory', // 'inventory' | 'optica'
    origin:   initialFilters.origin   || null,
    sheet:    initialFilters.sheet    || null,
    dateFrom: initialFilters.dateFrom || null,
    dateTo:   initialFilters.dateTo   || null,
    search:   initialFilters.search   || "",
    page:     1,
    limit:    initialFilters.limit    || 7,
  });

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const params = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v !== null && v !== "" && k !== 'service') {
          params[k] = v;
        }
      }
      
      const res = filters.service === 'optica' 
        ? await listOpticaMermas(params)
        : await listMermas(params);

      const data = res.data;
      items.value = data?.items || data?.data || [];
      meta.value  = data?.meta  || { ...meta.value, total: items.value.length };
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
      // 1. Registro en el servicio primario
      const isOptica = filters.service === 'optica';
      const res = isOptica
        ? await createOpticaMerma(payload)
        : await createMerma(payload);
      
      const createdData = res.data?.data || res.data;

      // 2. 🧠 Orquestación Espejo (Frontend Brain)
      // Intentamos replicar en el servicio hermano
      try {
        if (isOptica) {
          // Óptica -> Inventario
          await createMerma({
            ...payload,
            isReplica: true,
            skipMutation: true,
            actor: payload.actor || {}
          });
          console.log("[BRAIN][REPLICA] Espejo de merma creado en Inventario");
        } else {
          // Inventario -> Óptica
          await createOpticaMerma({
            ...payload,
            isReplica: true,
            skipMutation: true,
            actor: payload.actor || {}
          });
          console.log("[BRAIN][REPLICA] Espejo de merma creado en Óptica");
        }
      } catch (replicaErr) {
        console.warn("[BRAIN][REPLICA] No se pudo crear el espejo de merma:", replicaErr.message);
      }

      await load();
      return createdData;
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
