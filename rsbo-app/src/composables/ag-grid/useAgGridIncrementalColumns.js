/**
 * useAgGridIncrementalColumns.js
 * Carga incremental de columnas para AG Grid.
 *
 * ESTRATEGIA:
 * ──────────────────────────────────────────────────────────────────────────
 *  1. Se arranca con COL_CHUNK_SIZE columnas (muy pocas, configurable).
 *  2. En `init()`:
 *     a. Se agrega el primer bloque.
 *     b. Si NO hay barra horizontal → seguir agregando bloques hasta que aparezca
 *        o se agoten todas las columnas.
 *  3. Listener de scroll horizontal: cuando el usuario se acerca al borde derecho
 *     (dentro de SCROLL_THRESHOLD px), se agrega el siguiente bloque.
 *  4. Cuando se agregan columnas NO se purga el infinite row cache.
 *     Los datos ya están en cada row (fetch completo por página), sólo AG Grid
 *     necesita renderizar nuevas celdas con datos existentes.
 *
 * ANTI-COLISIÓN con carga vertical infinita:
 * ──────────────────────────────────────────────────────────────────────────
 *  - Este composable NUNCA llama a gridApi.purgeInfiniteCache() ni
 *    gridApi.refreshInfiniteCache().
 *  - Solo actualiza columnDefs (vía el ref `activeValues`).
 *  - El datasource de filas NO es re-invocado por cambios de columnDefs.
 *
 * @param {object} opts
 * @param {import('vue').Ref<number[]>}  opts.allValues      — todos los valores del eje (ej: cylValues)
 * @param {import('vue').Ref<object>}    opts.gridApiRef     — ref al gridApi de AG Grid
 * @param {number}                        opts.colChunkSize   — columnas por bloque (default 6)
 * @param {number}                        opts.scrollThreshold — px antes del borde para cargar (default 120)
 * @param {boolean}                       opts.devMode        — activa logs detallados
 * @param {Function}                      opts.getScrollViewport — () => HTMLElement|null (override para test)
 */
import { ref, nextTick } from "vue";

const PREFIX = "[ColChunk]";

export function useAgGridIncrementalColumns({
  allValues,
  gridApiRef,
  colChunkSize = 6,
  scrollThreshold = 120,
  devMode = false,
  getScrollViewport = null,
} = {}) {
  const log = (...args) => devMode && console.log(PREFIX, ...args);
  const warn = (...args) => console.warn(PREFIX, ...args);

  /** Valores del eje actualmente visibles como columnas */
  const activeValues = ref([]);

  const loading = ref(false);
  let _scrollListener = null;
  let _initDone = false;

  // ── DOM helpers ──────────────────────────────────────────────────────────
  function _getViewport() {
    if (typeof getScrollViewport === "function") return getScrollViewport();
    // AG Grid usa este selector para el scroll horizontal del body
    return document.querySelector(".ag-body-horizontal-scroll-viewport");
  }

  function _hasHorizontalScroll() {
    const vp = _getViewport();
    if (!vp) return false;
    return vp.scrollWidth > vp.clientWidth + 1; // +1 para evitar falsos positivos
  }

  // ── Agregar un bloque de columnas ────────────────────────────────────────
  async function addNextChunk() {
    if (loading.value) {
      log("addNextChunk: ya hay una adición en curso, ignorando.");
      return false;
    }
    const all = allValues.value ?? [];
    const current = activeValues.value.length;

    if (current >= all.length) {
      log(`addNextChunk: todas las columnas ya están activas (${all.length}).`);
      return false; // nada que agregar
    }

    loading.value = true;
    const nextSlice = all.slice(current, current + colChunkSize);
    activeValues.value = all.slice(0, current + nextSlice.length);

    log(
      `addNextChunk: cols ${current} → ${activeValues.value.length} / ${all.length}`,
      `(+${nextSlice.length} nuevas)`
    );

    await nextTick();
    loading.value = false;
    return true; // hubo cambio
  }

  // ── Rellenar hasta que aparezca scrollbar o se agoten columnas ───────────
  async function _fillUntilScrollOrDone() {
    const MAX_ATTEMPTS = 100; // seguridad ante bucle infinito
    let attempts = 0;

    log("_fillUntilScrollOrDone: iniciando auto-fill...");

    while (attempts++ < MAX_ATTEMPTS) {
      if (activeValues.value.length >= (allValues.value ?? []).length) {
        log("_fillUntilScrollOrDone: todas las columnas cargadas.");
        break;
      }

      const added = await addNextChunk();
      if (!added) break;

      // Esperar un frame para que el DOM pinte y el scrollWidth se actualice
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 40));

      if (_hasHorizontalScroll()) {
        log(
          `_fillUntilScrollOrDone: scrollbar detectado en ${activeValues.value.length} cols. Deteniendo auto-fill.`
        );
        break;
      }
    }

    if (attempts >= MAX_ATTEMPTS) {
      warn("_fillUntilScrollOrDone: límite de intentos alcanzado.");
    }

    log(
      `_fillUntilScrollOrDone: final → ${activeValues.value.length} / ${(allValues.value ?? []).length} cols activas.`
    );
  }

  // ── Listener de scroll horizontal ────────────────────────────────────────
  function _onScroll() {
    const vp = _getViewport();
    if (!vp) return;
    const { scrollLeft, scrollWidth, clientWidth } = vp;
    const distanceToEnd = scrollWidth - (scrollLeft + clientWidth);
    if (distanceToEnd <= scrollThreshold) {
      log(
        `scroll: a ${distanceToEnd}px del borde (threshold=${scrollThreshold}). Cargando siguiente bloque...`
      );
      addNextChunk();
    }
  }

  function _attachScrollListener() {
    _detachScrollListener();
    // Necesitamos esperar a que AG Grid monte el viewport
    const tryAttach = (attempt = 0) => {
      const vp = _getViewport();
      if (vp) {
        _scrollListener = _onScroll;
        vp.addEventListener("scroll", _scrollListener, { passive: true });
        log("Listener de scroll horizontal adjuntado.");
      } else if (attempt < 10) {
        // Reintentar hasta que AG Grid monte el viewport
        setTimeout(() => tryAttach(attempt + 1), 150);
      } else {
        warn("No se encontró el viewport de scroll horizontal.");
      }
    };
    tryAttach();
  }

  function _detachScrollListener() {
    const vp = _getViewport();
    if (vp && _scrollListener) {
      vp.removeEventListener("scroll", _scrollListener);
      log("Listener de scroll horizontal removido.");
    }
    _scrollListener = null;
  }

  // ── API pública ──────────────────────────────────────────────────────────

  /**
   * Inicializar: cargar primer bloque, rellenar hasta scrollbar, adjuntar listener.
   * Llamar DESPUÉS de que sphAxis/cylValues estén listos y el grid esté montado.
   */
  async function init() {
    log("init() — comenzando carga incremental de columnas.");
    log(`Total columnas disponibles: ${(allValues.value ?? []).length}`);
    log(`Tamaño de bloque (colChunkSize): ${colChunkSize}`);

    activeValues.value = []; // reset

    // Primer bloque
    await addNextChunk();
    await nextTick();

    // Auto-fill hasta que aparezca scrollbar
    await _fillUntilScrollOrDone();

    // Adjuntar listener para carga bajo demanda
    _attachScrollListener();

    _initDone = true;
    log("init() completo.", {
      activas: activeValues.value.length,
      total: (allValues.value ?? []).length,
      hayScroll: _hasHorizontalScroll(),
    });
  }

  /**
   * Reset completo (cambio de vista, cambio de sheetId).
   * NO toca el infinite row model del grid.
   */
  function reset() {
    _detachScrollListener();
    activeValues.value = [];
    loading.value = false;
    _initDone = false;
    log("reset().");
  }

  /**
   * Reattach listener (útil si el grid se redimensiona o cambia de tab).
   */
  function reattach() {
    if (_initDone) _attachScrollListener();
  }

  return {
    activeValues,
    loading,
    init,
    reset,
    reattach,
    addNextChunk,
    hasHorizontalScroll: _hasHorizontalScroll,
  };
}
