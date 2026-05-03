import { ref, watch, onMounted } from 'vue';
import { listTransactions } from "@/services/transactions";

/**
 * Composable for unified sales history.
 */
export function useVentasHistory(getUser) {
  const category = ref('all'); // 'all' | 'bases-micas' | 'optica' | 'lentes-contacto'
  const rows     = ref([]);
  const loading  = ref(false);

  const CATEGORY_MAP = {
    'LAB': 'bases-micas',
    'VNT': 'optica' // Por ahora mapeamos ventas directas a optica
  };

  async function reload() {
    loading.value = true;
    try {
      // Usar el nuevo endpoint unificado
      const res = await listTransactions(200);
      const data = Array.isArray(res?.data) ? res.data : [];
      
      const PAGO_LABELS = { trans: "TRANS", efec: "EFEC", credito: "CRÉDITO", tarjeta: "TARJETA C|D" };
      
      let mapped = data.map(tx => {
        const lines = (tx.items || []).map(l => ({
          title: l.title || l.sku || 'Producto',
          qty: l.qty || 0,
          precio: l.precio || 0
        }));

        const pagoArr = Array.isArray(tx.pago) ? tx.pago : [];
        const pagoDisplay = pagoArr.map(p => PAGO_LABELS[p] || p).join(" / ") || "—";

        // Determinar categoría para el filtro
        // LAB -> bases-micas
        // VNT -> Prioridad: Si tiene armazones -> optica. Si solo tiene lentes -> lentes-contacto.
        let cat = 'optica';
        if (tx.type === 'LAB') {
          cat = 'bases-micas';
        } else if (tx.type === 'VNT') {
          const hasFrames = (tx.items || []).some(it => it.collection === 'armazones');
          const hasLenses = (tx.items || []).some(it => it.collection === 'lentes');
          
          if (hasFrames) {
            cat = 'optica';
          } else if (hasLenses) {
            cat = 'lentes-contacto';
          } else {
            cat = 'optica'; // Otros (soluciones, etc)
          }
        }

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
          note:             tx.note || '',
          totalMonto:       tx.total || 0,
          totalPiezas:      lines.reduce((s, l) => s + (l.qty || 0), 0),
          actor:            tx.actor || 'Sistema',
          pagoDisplay:      pagoDisplay,
          lineas:           lines,
          category:         cat
        };
      });

      if (category.value !== 'all') {
        mapped = mapped.filter(f => f.category === category.value);
      }

      rows.value = mapped;
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
