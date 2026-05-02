import { reactive, ref, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";

const _lastLoadedAt = ref(0);
const DATA_STALE_MS = 30_000; // datos frescos por 30 segundos

/**
 * useOpticaSection.js
 * Gestiona el estado reactivo y la carga de datos de las secciones de Óptica.
 */
export function useOpticaSection(SVC) {
  
  function makeSection() {
    return reactive({
      items: [],
      loading: false,
      showTrash: false,
      searchQ: "",
      filterField: "all",
      selected: null,
      bannerPulse: false,
    });
  }

  const sec = reactive({
    armazones: makeSection(),
    soluciones: makeSection(),
    accesorios: makeSection(),
    estuches: makeSection(),
    equipos: makeSection(),
  });

  const loadingAll = ref(false);

  /**
   * Carga una sección específica.
   */
  async function load(key, silent = false) {
    const s = sec[key];
    if (!silent) s.loading = true;
    s.selected = null;
    try {
      const res = s.showTrash
        ? await SVC[key].listTrash()
        : await SVC[key].list(s.searchQ ? { q: s.searchQ } : {});
      s.items = res?.data?.data || [];
    } catch {
      labToast.danger("Error al cargar datos. Verifica la conexión.");
    } finally {
      s.loading = false;
    }
  }

  /**
   * Carga todas las secciones en paralelo.
   */
  async function loadAll({ force = false } = {}) {
    if (!force && _lastLoadedAt.value && (Date.now() - _lastLoadedAt.value) < DATA_STALE_MS) {
      return; // datos frescos — no recargar
    }
    loadingAll.value = true;
    try {
      await Promise.all(Object.keys(sec).map(load));
      _lastLoadedAt.value = Date.now();
    } finally {
      loadingAll.value = false;
    }
  }

  /**
   * Maneja la selección de una fila con efecto de pulso en el banner.
   */
  function selectRow(key, row) {
    const s = sec[key];
    s.selected = row;
    s.bannerPulse = true;
    setTimeout(() => {
      s.bannerPulse = false;
    }, 400);
  }

  /**
   * Alterna entre vista normal y papelera para una sección.
   */
  function toggleTrash(key) {
    sec[key].showTrash = !sec[key].showTrash;
    load(key);
  }

  // ── WebSocket Listener ──
  const WS_REFRESH_TYPES = new Set([
    "INVENTORY_CHUNK_SAVED",
    "INV_CHANGE",
  ]);

  let _wsTimer = null;
  function _onWs(e) {
    const type = e?.detail?.type;
    if (!WS_REFRESH_TYPES.has(type)) return;
    
    const payload = e?.detail?.payload || {};
    const col = payload.collection;
    
    console.log(`[WS][OPTICA-INV] Event: ${type}`, payload);

    if (type === "INV_CHANGE" && payload.id && typeof payload.newStock === "number") {
      const itemId = String(payload.id);
      const item = sec[col]?.items.find(i => String(i._id || i.id || "") === itemId);
      
      if (item) {
        console.log(`[WS][OPTICA-INV] Surgical update: ${itemId} -> ${payload.newStock}`);
        item.stock = payload.newStock;
        return;
      }
    }

    if (col && !sec[col]) return;

    clearTimeout(_wsTimer);
    _wsTimer = setTimeout(() => {
      console.log(`[WS][OPTICA-INV] Fallback reload: ${col || 'all'}`);
      if (col) load(col, true);
      else loadAll({ force: true });
    }, 1500);
  }

  onMounted(() => {
    window.addEventListener("lab:ws", _onWs);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("lab:ws", _onWs);
    clearTimeout(_wsTimer);
  });

  return {
    sec,
    loadingAll,
    load,
    loadAll,
    selectRow,
    toggleTrash
  };
}
