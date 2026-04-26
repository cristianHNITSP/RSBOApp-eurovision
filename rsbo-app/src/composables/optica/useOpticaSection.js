import { reactive, ref } from "vue";
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
  async function load(key) {
    const s = sec[key];
    s.loading = true;
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

  return {
    sec,
    loadingAll,
    load,
    loadAll,
    selectRow,
    toggleTrash
  };
}
