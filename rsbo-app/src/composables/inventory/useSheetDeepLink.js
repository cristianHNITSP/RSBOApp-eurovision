import { watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSheetFocus, sideFromCoords } from "@/composables/inventory/useSheetFocus.js";

/**
 * useSheetDeepLink — flujo unificado de deep-link (buscador global + notificaciones)
 * para las vistas de planillas (Bases y Micas, Lentes de Contacto).
 *
 * Hace, para un ?sheetId de la URL:
 *   1) carga la planilla (su página) si aún no está,
 *   2) la ABRE como pestaña real y activa vía `ws.openTemplate` (mismo camino que
 *      abrir un reciente → respeta y persiste la vista guardada),
 *   3) fija el lado interno (sph±/base±) y deja una petición de foco para que el
 *      grid enfoque matriz/fila/celda/columna cuando termine de cargar,
 *   4) limpia los parámetros de la URL.
 *
 * Cubre ambos orígenes con la misma query:
 *   - buscador      → ?sheetId&focusRow&focusCol&focusSide
 *   - notificación  → ?sheetId&focusCell (coords JSON)
 *
 * @param {object} o
 * @param {object}            o.pager              useSheetPagination (sheets[], init)
 * @param {object}            o.ws                 useWorkspaceTabs (openTemplate, closeMostRecentUnpinned, MAX_ACTIVE_TABS, activeTabs)
 * @param {import('vue').Ref} o.activeInternalTab  ref del lado interno activo (sph±/base±)
 * @param {Function}          [o.getSheetMeta]     async (id) => respuesta con la planilla (getSheet / getContactLensSheet)
 */
export function useSheetDeepLink({ pager, ws, activeInternalTab, getSheetMeta }) {
  const route = useRoute();
  const router = useRouter();
  const sheetFocus = useSheetFocus();

  /** Asegura que la planilla esté cargada y ABIERTA como pestaña activa. */
  async function ensureSheetOpen(sheetId) {
    if (!sheetId) return false;

    let sheet = pager.sheets.find((s) => s.id === sheetId);
    if (!sheet) {
      await pager.init(sheetId); // el backend devuelve la página que la contiene
      await nextTick();
      sheet = pager.sheets.find((s) => s.id === sheetId);
    }

    // Fallback: metadatos directos por si la planilla no entra en la página.
    if (!sheet && typeof getSheetMeta === "function") {
      try {
        const raw = await getSheetMeta(sheetId);
        const s =
          raw?.data?.data?.sheet || raw?.data?.sheet || raw?.data?.data || raw?.data || raw;
        if (s && (s._id || s.id)) {
          sheet = {
            id: String(s._id ?? s.id),
            name: s.nombre ?? s.name ?? "",
            sku: s.sku ?? null,
            tipo_matriz: s.tipo_matriz,
          };
        }
      } catch {
        /* noop */
      }
    }
    if (!sheet) return false;

    // Hacer sitio si el workspace está al tope y la planilla no está abierta,
    // para que el deep-link siempre abra (sin el modal de límite).
    const open = ws.activeTabs.value.filter((t) => t.id !== "nueva");
    const already = open.some((t) => t.id === sheetId);
    if (!already && open.length >= ws.MAX_ACTIVE_TABS) {
      ws.closeMostRecentUnpinned();
    }

    ws.openTemplate(sheet); // agrega (si hace falta), activa y persiste
    return true;
  }

  /** Deja la petición de foco (lado + fila/celda/columna del buscador, o coords de notificación). */
  function requestCellFocus(sheetId) {
    if (!sheetId) return;

    // Buscador: ?focusRow / ?focusCol (+ ?focusSide). focusDiopter = alias legado de fila.
    const fRow = route.query.focusRow ?? route.query.focusDiopter;
    const fCol = route.query.focusCol;
    const hasRow = fRow != null && fRow !== "";
    const hasCol = fCol != null && fCol !== "";
    if (hasRow || hasCol) {
      const side = route.query.focusSide ? String(route.query.focusSide) : null;
      if (side) activeInternalTab.value = side;
      const row = hasRow ? Number(fRow) : null;
      const col = hasCol ? Number(fCol) : null;
      const mode = row != null && col != null ? "cell" : col != null ? "col" : "row";
      nextTick(() => sheetFocus.request({ sheetId, mode, row, col, side }));
      return;
    }

    // Notificación: ?focusCell con coords JSON.
    const raw = route.query.focusCell;
    if (!raw) return;
    let coords = null;
    try {
      coords = JSON.parse(decodeURIComponent(String(raw)));
    } catch {
      return;
    }
    const side = sideFromCoords(coords);
    if (side) activeInternalTab.value = side;
    nextTick(() => sheetFocus.request({ sheetId, coords, side }));
  }

  /** Quita los parámetros de deep-link de la URL (sin recargar la vista). */
  function stripFocusQuery() {
    const q = { ...route.query };
    let changed = false;
    for (const k of ["sheetId", "focusCell", "focusDiopter", "focusRow", "focusCol", "focusSide"]) {
      if (k in q) {
        delete q[k];
        changed = true;
      }
    }
    if (changed) router.replace({ query: Object.keys(q).length ? q : undefined });
  }

  /** Orquesta el flujo completo para un sheetId (de la query o explícito). */
  async function consumeRouteFocus(sheetId = route.query.sheetId) {
    if (!sheetId) return;
    const id = String(sheetId);
    const ok = await ensureSheetOpen(id);
    if (ok) requestCellFocus(id);
    stripFocusQuery();
  }

  // Cambios EN CALIENTE (ya montado en la sección): nuevo ?sheetId → reenfocar.
  // El arranque en frío lo dispara la vista en onMounted, tras el boot.
  watch(
    () => route.query.sheetId,
    (id) => { if (id) consumeRouteFocus(id); }
  );

  return { ensureSheetOpen, requestCellFocus, consumeRouteFocus, stripFocusQuery };
}
