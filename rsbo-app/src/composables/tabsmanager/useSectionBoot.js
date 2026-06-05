import { ref } from "vue";

/**
 * useSectionBoot — Orquesta el arranque (Etapa 1) de una sección de planillas.
 *
 * Mientras corre el boot se muestra un loading global (SectionLoadingOverlay) y
 * NO se monta el TabsManager, de modo que nunca se ve la pestaña "crear" como
 * default ni hay salto al restaurar la sesión.
 *
 * Secuencia (atada al estado real, sin timers):
 *   1. en paralelo: catálogo + restauración de sesión (whenHydrated) + lista (pager.init)
 *   2. decide la pestaña inicial: focusId (deep-link/búsqueda) gana; si no, la
 *      última sesión resuelta por el store (activeId); si no, "nueva".
 *   3. booting → false: recién aquí se revela el TabsManager ya apuntando al tab correcto.
 *
 * @param {object}   o
 * @param {object}   o.pager        useSheetPagination (con .init y .sheets)
 * @param {object}   o.ws           useWorkspaceTabs (con .whenHydrated y .activeId)
 * @param {Function} o.loadCatalog  async () => void
 * @param {string}   [o.newTabId="nueva"]
 */
export function useSectionBoot({ pager, ws, loadCatalog, newTabId = "nueva" }) {
  const booting = ref(true);
  const activeSheet = ref(newTabId);

  async function boot(focusId = null) {
    booting.value = true;
    await Promise.all([
      loadCatalog ? loadCatalog() : Promise.resolve(),
      ws?.whenHydrated ? ws.whenHydrated() : Promise.resolve(),
      pager.init(focusId || null),
    ]);

    if (focusId && pager.sheets.find((s) => s.id === focusId)) {
      activeSheet.value = focusId;                 // deep-link / búsqueda
    } else {
      activeSheet.value = ws?.activeId?.value || newTabId; // última sesión (o "nueva")
    }

    booting.value = false;
  }

  return { booting, activeSheet, boot };
}
