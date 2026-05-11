import { ref, watch, onMounted } from 'vue';
import { listTransactions } from "@/services/transactions";

/**
 * Composable for unified sales history.
 */
export function useVentasHistory(getUser) {
  const category    = ref('all');
  const searchQuery = ref('');
  const rows        = ref([]);
  const loading     = ref(false);
  const page        = ref(1);
  const totalPages  = ref(1);
  const limit       = 7;

  async function reload() {
    loading.value = true;
    try {
      const params = {
        page: page.value,
        limit,
        category: category.value !== 'all' ? category.value : undefined,
        q: searchQuery.value.trim() || undefined
      };

      const res = await listTransactions(params);
      
      // El backend responde con { data: { docs, meta } } o { docs, meta }
      const responseData = res?.data || res || {};
      const docs = Array.isArray(responseData.docs) ? responseData.docs : (Array.isArray(res?.data) ? res.data : []);
      const meta = responseData.meta || {};

      const PAGO_LABELS = { trans: "TRANS", efec: "EFEC", credito: "CRÉDITO", tarjeta: "TARJETA C|D" };
      
      const mapped = docs.map(tx => {
        const lines = (tx.items || []).map(l => ({
          title: l.title || l.sku || 'Producto',
          sku: l.sku || 'N/A',
          sheetName: l.sheetName || 'N/A',
          features: l.features || [],
          qty: l.qty || 0,
          precio: l.precio || 0
        }));

        const pagoArr = Array.isArray(tx.pago) ? tx.pago : [];
        const pagoDisplay = pagoArr.length > 0 
          ? pagoArr.map(p => PAGO_LABELS[p] || p).join(" / ") 
          : "Sin especificar";

        return {
          id:               String(tx.id),
          type:             tx.type,
          folio:            tx.folio,
          labOrderId:       tx.type === 'LAB' ? String(tx.id) : null,
          ventaFolio:       tx.folio,
          labFolio:         tx.type === 'LAB' ? tx.folio : null,
          labStatus:        tx.status,
          fecha:            tx.fecha,
          cliente:          tx.cliente,
          clienteDisplay:   tx.cliente,
          phone:            tx.phone || '',
          note:             tx.note || '',
          totalMonto:       tx.total || 0,
          totalPiezas:      lines.reduce((s, l) => s + (l.qty || 0), 0),
          actor:            tx.actor || 'Sistema',
          pagoDisplay:      pagoDisplay,
          lineas:           lines,
          category:         tx.category // Asumimos que el backend ya categoriza o devolvemos lo que venga
        };
      });

      rows.value = mapped;
      totalPages.value = meta.pages || 1;
    } catch (e) {
      console.error('[VENTAS-HISTORY] reload', e);
    } finally {
      loading.value = false;
    }
  }

  watch(category, () => {
    page.value = 1;
    reload();
  });

  watch(searchQuery, () => {
    page.value = 1;
    reload();
  });

  watch(page, reload);

  onMounted(() => {
    reload();
  });

  return { category, searchQuery, rows, loading, reload, page, totalPages };
}
