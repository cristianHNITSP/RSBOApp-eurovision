import { useRouter } from "vue-router";
import { labToast } from "@/composables/shared/useLabToast.js";
import { useNotifications } from "@/composables/notifi/useNotificationsState.js";
import { getSheet } from "@/services/inventory.js";
import { getContactLensSheet } from "@/services/contactlenses.js";
import { categoriasService, getProduct } from "@/services/optica.js";

/**
 * useNotificationNavigate — convierte una notificación de stock en navegación accionable.
 *
 * - Planilla (mica/CL): abre la sheet (?sheetId). Con `cell` → añade ?focusCell para enfocar la dioptría.
 * - Óptica: va a /l/inventario/optica?categoria&sku (la vista aísla el producto por SKU).
 * - Pre-valida que el destino NO esté eliminado; si lo está, muestra toast y NO navega.
 */
export function useNotificationNavigate() {
  const router = useRouter();
  const { closePanel } = useNotifications();

  const unwrap = (res) => res?.data?.data ?? res?.data ?? null;

  async function goToNotification(notif, { cell } = {}) {
    const meta = notif?.metadata || {};
    const sheetId = String(meta.sheetId || "");
    if (!sheetId) return;

    try {
      // ── ÓPTICA ───────────────────────────────────────────────────────────
      if (sheetId.startsWith("optica:")) {
        const categoria = meta.sheet?.categoria;
        const sku = meta.sheet?.sku;
        const id = sheetId.slice("optica:".length);
        if (!categoria || !sku) return;

        // Categoría activa
        const cats = unwrap(await categoriasService.list()) || [];
        if (!cats.some((c) => c.key === categoria)) {
          return labToast.warning("No se puede abrir: la categoría fue eliminada.");
        }
        // Producto no borrado
        const prod = unwrap(await getProduct(categoria, id).catch(() => null));
        if (!prod || prod.isDeleted) {
          return labToast.warning("No se puede abrir: el producto fue eliminado.");
        }

        closePanel();
        return router.push({ path: "/l/inventario/optica", query: { categoria, sku } });
      }

      // ── PLANILLA (mica / lente de contacto) ──────────────────────────────
      const isCL = !!meta.isCL;
      const res = await (isCL ? getContactLensSheet(sheetId) : getSheet(sheetId)).catch(() => null);
      const sheet = unwrap(res);
      if (!sheet || sheet.isDeleted) {
        return labToast.warning("No se puede abrir: la planilla fue eliminada.");
      }

      const path = isCL ? "/l/inventario/lentes-contacto" : "/l/inventario/bases-micas";
      const query = { sheetId };
      if (cell?.coords) {
        query.focusCell = encodeURIComponent(
          JSON.stringify({ ...cell.coords, tipo_matriz: meta.tipo_matriz })
        );
      }
      closePanel();
      return router.push({ path, query });
    } catch (e) {
      console.error("[notif-nav] error:", e?.message);
      labToast.danger("No se pudo abrir la notificación.");
    }
  }

  return { goToNotification };
}
