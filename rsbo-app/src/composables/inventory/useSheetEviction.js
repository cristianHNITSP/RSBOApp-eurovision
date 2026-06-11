import { onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";

/**
 * useSheetEviction — limpia de la sesión viva una planilla que otro usuario borró.
 *
 * Escucha `lab:ws` y, ante `SHEET_DELETED` (papelera o permanente), evicta la
 * planilla: la quita de la barra (pager), cierra su pestaña (workspace), reubica
 * la pestaña activa si era esa, y avisa con un toast. También expone `evict(...)`
 * para el respaldo 410 (guardado contra una planilla ya eliminada).
 *
 * Reutiliza infraestructura existente: `pager.sheets`, `ws.closeTab`/`ws.activeId`,
 * `labToast`. Mismo patrón que el `_onWs` de óptica.
 *
 * @param {object}  o
 * @param {object}  o.pager        useSheetPagination (con `.sheets` reactivo)
 * @param {object}  o.ws           useWorkspaceTabs (con `.closeTab` y `.activeId`)
 * @param {import('vue').Ref} o.activeSheet  ref de la pestaña activa de la vista
 * @param {boolean} o.isCL         true en lentes de contacto, false en bases/micas
 * @param {string}  [o.newTabId="nueva"]
 */
export function useSheetEviction({ pager, ws, activeSheet, isCL = false, newTabId = "nueva" }) {
  const evicted = new Set(); // idempotencia: una sola vez por id

  /** Evicta una planilla por id. Devuelve true si hizo algo (test-friendly). */
  function evict(sheetId, name = "") {
    const id = String(sheetId || "");
    if (!id || evicted.has(id)) return false;

    const inBar = pager?.sheets?.findIndex?.((s) => String(s.id) === id) ?? -1;
    const wasActive = activeSheet && String(activeSheet.value) === id;

    // 1) Quitar de la barra paginada.
    if (inBar >= 0) pager.sheets.splice(inBar, 1);
    // 2) Cerrar la pestaña del workspace (gestiona persistencia + fallback de activa).
    ws?.closeTab?.(id);
    // 3) Reubicar la pestaña activa si era la eliminada.
    if (wasActive && activeSheet) activeSheet.value = ws?.activeId?.value || newTabId;

    evicted.add(id);
    labToast.danger(`La planilla "${name || "sin nombre"}" ha sido eliminada.`);
    return true;
  }

  function _onWs(e) {
    const d = e?.detail;
    if (d?.type !== "SHEET_DELETED") return;
    const p = d.payload || {};
    if (!!p.isCL !== !!isCL) return; // cada vista solo evicta lo suyo
    evict(p.sheetId, p.name);
  }

  onMounted(() => window.addEventListener("lab:ws", _onWs));
  onBeforeUnmount(() => window.removeEventListener("lab:ws", _onWs));

  return { evict };
}
