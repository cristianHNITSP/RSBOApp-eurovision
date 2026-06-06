import { reactive, ref, watch } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import { categoriasService } from "@/services/optica.js";
import { getPreferences, setActiveTab, setViewState } from "@/services/preferencesService.js";
import { OPTICA_TABS } from "@/constants/optica.js";
import { opticaStockState } from "./useOpticaHelpers";

/**
 * useOpticaSection.js — SINGLETON de la sección de Óptica.
 *
 * El estado vive a nivel de módulo: al salir y volver a la vista dentro de la
 * misma sesión, todo se conserva (boot sólo la 1ª vez). Replica la metodología de
 * BasesMicas (boot en 2 etapas + restauración de sesión persistida en MongoDB).
 *
 * Boot (Etapa 1): loading general → categorías de las tabs + preferencias del usuario.
 * Etapa 2: se carga la data de la tab activa (con su propio loading, paginada 6/pág).
 *
 * Persistencia (contexto "optica" en UserWorkspacePreferences):
 *   - categoría activa  → active_tab_id (endpoint /active-tab existente)
 *   - page/filtro/búsqueda/papelera por categoría → view_state (endpoint /view-state)
 */

const CONTEXT = "optica";
const PER_PAGE = 6;

// Categorías que tienen sección renderizada en la vista.
const SECTIONS_WITH_UI = ["armazones", "soluciones", "accesorios", "estuches", "equipos"];

// Campo por el que filtra el dropdown de cada categoría (server-side).
const FILTER_FIELD = {
  armazones: "material",
  soluciones: "tipo",
  accesorios: "categoria",
  estuches: "tipo",
  equipos: "estado",
};

// ── debounce simple ──
function debounce(fn, ms) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Estado singleton (módulo)
// ─────────────────────────────────────────────────────────────────────────────
let _store = null;

function createStore(SVC) {
  function makeSection() {
    return reactive({
      items: [],
      loading: false,
      showTrash: false,
      searchQ: "",
      filterField: "all", // VALOR seleccionado del filtro ("all" = sin filtro)
      selected: null,
      bannerPulse: false,
      page: 1,
      total: 0,
      limit: PER_PAGE,
      loaded: false,
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
  const categorias = ref(OPTICA_TABS); // fallback estático hasta el boot
  const activeTab = ref(SECTIONS_WITH_UI[0]);
  const booting = ref(true);
  let booted = false;

  // ── Persistencia (debounced) ──
  const persistActive = debounce((key) => {
    setActiveTab(key, CONTEXT).catch(() => {});
  }, 800);

  const persistViewState = debounce(() => {
    const vs = {};
    for (const key of Object.keys(sec)) {
      vs[key] = {
        page: sec[key].page,
        filterField: sec[key].filterField,
        searchQ: sec[key].searchQ,
        showTrash: sec[key].showTrash,
      };
    }
    setViewState(vs, CONTEXT).catch(() => {});
  }, 1000);

  /** Carga la página actual de una sección. */
  async function load(key, silent = false) {
    const s = sec[key];
    if (!s) return;
    if (!silent) s.loading = true;
    s.selected = null;
    try {
      const params = { page: s.page, limit: s.limit };
      if (s.searchQ) params.q = s.searchQ;
      if (s.filterField && s.filterField !== "all" && FILTER_FIELD[key]) {
        params.filterField = FILTER_FIELD[key];
        params.filterValue = s.filterField;
      }
      const res = s.showTrash
        ? await SVC[key].listTrash(params)
        : await SVC[key].list(params);
      s.items = res?.data?.data || [];
      s.total = Number.isFinite(res?.data?.total) ? res.data.total : s.items.length;
      s.loaded = true;
    } catch {
      labToast.danger("Error al cargar datos. Verifica la conexión.");
    } finally {
      s.loading = false;
    }
  }

  /** Recarga desde la página 1 (tras buscar, filtrar o cambiar de vista) + persiste. */
  function reloadSection(key) {
    sec[key].page = 1;
    persistViewState();
    return load(key);
  }

  /** Salta a una página concreta (clamp) + persiste. */
  function goToPage(key, page) {
    const s = sec[key];
    const maxPage = Math.max(1, Math.ceil((s.total || 0) / s.limit));
    s.page = Math.min(Math.max(1, page), maxPage);
    persistViewState();
    return load(key);
  }

  /** Carga la sección sólo si aún no se ha cargado (lazy al entrar a la tab). */
  function ensureLoaded(key) {
    if (sec[key] && !sec[key].loaded) return load(key);
  }

  /** Recarga todas las secciones YA cargadas (fallback de WS). */
  async function loadAll() {
    loadingAll.value = true;
    try {
      await Promise.all(
        Object.keys(sec).filter((k) => sec[k].loaded).map((k) => load(k, true))
      );
    } finally {
      loadingAll.value = false;
    }
  }

  function selectRow(key, row) {
    const s = sec[key];
    s.selected = row;
    s.bannerPulse = true;
    setTimeout(() => { s.bannerPulse = false; }, 400);
  }

  function toggleTrash(key) {
    sec[key].showTrash = !sec[key].showTrash;
    reloadSection(key);
  }

  /** Cambia de categoría activa (carga perezosa + persiste). */
  function setActive(key) {
    if (!key || activeTab.value === key) return;
    activeTab.value = key;
  }

  /** Diccionarios de opciones (select/autocomplete) de una categoría. */
  function dictFor(key) {
    return categorias.value.find((c) => c.key === key)?.dictionaries || {};
  }

  /** Opciones del dropdown de filtro de una categoría (campo en FILTER_FIELD). */
  function filterOptionsFor(key) {
    const field = FILTER_FIELD[key];
    return dictFor(key)?.[field]?.options || [];
  }

  /** Umbrales de stock de una categoría (o null → el helper usa el default). */
  function thresholdsFor(key) {
    return categorias.value.find((c) => c.key === key)?.stockThresholds || null;
  }

  /** Clase del badge de stock (4 estados) según los umbrales de la categoría. */
  function stockBadgeClass(key, stock) {
    return "stock-badge--" + opticaStockState(stock, thresholdsFor(key)).badge;
  }

  /**
   * Enfoca un producto por SKU (deep-link de notificación): cambia a su categoría,
   * lo aísla con el buscador (página 1) y lo resalta en el banner.
   */
  async function focusBySku(key, sku) {
    const s = sec[key];
    if (!s || !sku) return;
    activeTab.value = key;
    s.searchQ = sku;
    s.filterField = "all";
    s.showTrash = false;
    s.page = 1;
    await load(key);
    const item = s.items.find((i) => i.sku === sku);
    if (item) selectRow(key, item);
  }

  // Cambio de tab → carga perezosa + persiste categoría activa.
  watch(activeTab, (key) => {
    ensureLoaded(key);
    if (booted) persistActive(key);
  });

  /**
   * Boot (Etapa 1): carga categorías + restaura preferencias. Idempotente:
   * sólo corre una vez por sesión (singleton). Luego dispara la Etapa 2.
   */
  async function boot() {
    if (booted) { booting.value = false; return; }
    booting.value = true;

    const [catsRes, prefsRes] = await Promise.allSettled([
      categoriasService.list(),
      getPreferences(CONTEXT),
    ]);

    // Categorías → tabs (sólo las que tienen sección); conserva dictionaries/skuPrefix
    if (catsRes.status === "fulfilled") {
      const cats = (catsRes.value?.data?.data || [])
        .filter((c) => SECTIONS_WITH_UI.includes(c.key))
        .map((c) => ({
          key: c.key,
          label: c.label,
          icon: c.icon,
          skuPrefix: c.skuPrefix,
          dictionaries: c.dictionaries || {},
          stockThresholds: c.stockThresholds || null,
        }));
      if (cats.length) categorias.value = cats;
    }

    // Preferencias → hidratar estado por categoría + tab activa
    const prefs = prefsRes.status === "fulfilled" ? prefsRes.value?.data : null;
    const vs = prefs?.view_state || {};
    for (const key of Object.keys(sec)) {
      const st = vs[key];
      if (st && typeof st === "object") {
        sec[key].page = Number(st.page) > 0 ? Number(st.page) : 1;
        sec[key].filterField = st.filterField || "all";
        sec[key].searchQ = st.searchQ || "";
        sec[key].showTrash = !!st.showTrash;
      }
    }

    const validKeys = categorias.value.map((c) => c.key);
    const saved = prefs?.active_tab_id;
    activeTab.value = validKeys.includes(saved) ? saved : (validKeys[0] || SECTIONS_WITH_UI[0]);

    booted = true;
    booting.value = false;

    // Etapa 2: data de la tab activa (con su propio loading)
    await ensureLoaded(activeTab.value);
  }

  // ── WebSocket (registrado una sola vez para el singleton) ──
  // Identidad del usuario actual: para NO mostrarse a sí mismo el toast global.
  let currentUserId = null;
  const setCurrentUser = (id) => { currentUserId = id != null ? String(id) : null; };

  const catLabel = (key) => categorias.value.find((c) => c.key === key)?.label || key;
  const toast = (variant, msg) => (labToast[variant] || labToast.info)(msg);

  function _onWs(e) {
    const type = e?.detail?.type;
    if (type !== "INV_CHANGE") return;
    const payload = e?.detail?.payload || {};
    const col = payload.collection;
    const s = sec[col];
    if (!s) return;

    // 1) Stock/Update → actualización quirúrgica del número, sin recargar (cualquier página).
    if (payload.id && typeof payload.newStock === "number") {
      const item = s.items.find((i) => String(i._id || i.id || "") === String(payload.id));
      if (item) item.stock = payload.newStock;
      return;
    }

    // 2) Alta/Baja/Restauración. El autor ya refrescó su vista (reloadSection) → ignorar.
    if (!payload.action) return;
    const isSelf = payload.actorId && currentUserId && String(payload.actorId) === currentUserId;
    if (isSelf) return;

    const who = payload.actorName || "Alguien";
    const where = catLabel(col);
    // Vista "limpia" = activos, sin búsqueda ni filtro → es seguro tocar contador/filas.
    // Con búsqueda/filtro activos no sabemos si el item entra en el subconjunto → solo toast.
    const cleanActive = !s.showTrash && !s.searchQ && (!s.filterField || s.filterField === "all");

    if (payload.action === "create") {
      if (cleanActive) {
        s.total += 1; // se anexa al paginado aunque no se vea la fila
        if (s.page === 1 && payload.item) {
          s.items.unshift(payload.item);            // pág.1: insertar al vuelo
          if (s.items.length > s.limit) s.items.pop(); // y empujar la última
        }
      }
      toast("info", `${who} agregó "${payload.label}" en ${where}`);
    } else if (payload.action === "delete") {
      // Si la fila borrada está visible (en cualquier vista), quitarla y descontar.
      const idx = s.items.findIndex((i) => String(i._id || i.id || "") === String(payload.id));
      if (idx >= 0) { s.items.splice(idx, 1); s.total = Math.max(0, s.total - 1); }
      toast("warning", `${who} eliminó "${payload.label}" en ${where}`);
    } else if (payload.action === "restore") {
      if (cleanActive) s.total += 1;
      toast("info", `${who} restauró "${payload.label}" en ${where}`);
    }
  }
  window.addEventListener("lab:ws", _onWs);

  return {
    sec, loadingAll, categorias, activeTab, booting,
    boot, setActive, setCurrentUser, dictFor, filterOptionsFor, thresholdsFor, stockBadgeClass, focusBySku,
    load, loadAll, reloadSection, goToPage, ensureLoaded,
    selectRow, toggleTrash,
  };
}

/**
 * Devuelve el singleton de la sección de óptica (lo crea en la 1ª llamada).
 * @param {object} SVC - mapa de servicios por categoría (sólo se usa en la 1ª llamada)
 */
export function useOpticaSection(SVC) {
  if (!_store) _store = createStore(SVC);
  return _store;
}
