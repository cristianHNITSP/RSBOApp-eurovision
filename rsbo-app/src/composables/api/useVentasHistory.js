import { ref, watch, onMounted } from 'vue';
import { listOrders } from "@/services/laboratorio";

/**
 * Composable for unified sales history.
 */
export function useVentasHistory(getUser) {
  const category = ref('all'); // 'all' | 'bases-micas' | 'optica' | 'lentes-contacto'
  const rows     = ref([]);
  const loading  = ref(false);

  async function reload() {
    loading.value = true;
    try {
      // For now, we only have orders from laboratorio
      // In the future, we would call an aggregated endpoint or multiple services
      const { data } = await listOrders({ limit: 200, status: 'all' });
      const orders = Array.isArray(data?.data) ? data.data : [];
      const PAGO_LABELS = { trans: "TRANS", efec: "EFEC", credito: "CRÉDITO", tarjeta: "TARJETA C|D" };
      
      let filtered = orders.map(order => {
        const lines = (order.lines || []).map(l => ({
          title: l.micaType && l.sheetNombre ? `${l.micaType} | ${l.sheetNombre}` : (l.title || l.codebar || 'Producto'),
          qty: l.qty || 0,
          precio: l.precio || 0
        }));

        const pagoArr = Array.isArray(order.pago) ? order.pago : [];
        const pagoDisplay = pagoArr.map(p => PAGO_LABELS[p] || p).join(" / ") || "—";

        return {
          id:               String(order._id),
          labOrderId:       String(order._id),
          ventaFolio:       order.ventaFolio || (order.folio ? order.folio.replace("LAB-", "VTA-") : null),
          labFolio:         order.folio,
          labStatus:        order.status,
          fecha:            order.createdAt,
          cliente:          order.cliente,
          clienteDisplay:   order.clienteDisplay || order.cliente,
          note:             order.note || '',
          totalMonto:       order.totalMonto || 0,
          totalPiezas:      lines.reduce((s, l) => s + (l.qty || 0), 0),
          actor:            order.createdBy?.name || 'Sistema',
          pagoDisplay:      pagoDisplay,
          lineas:           lines,
          category:         'bases-micas' 
        };
      });

      if (category.value !== 'all') {
        filtered = filtered.filter(f => f.category === category.value);
      }

      rows.value = filtered;
    } catch (e) {
      console.error('[VENTAS-HISTORY] reload', e);
    } finally {
      loading.value = false;
    }
  }

  watch(category, reload);

  onMounted(() => {
    reload();
  });

  return { category, rows, loading, reload };
}
