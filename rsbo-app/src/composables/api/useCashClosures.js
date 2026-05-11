import { ref } from 'vue';
import api from '@/api/axios';

export function useCashClosures() {
  const closures = ref([]);
  const loading  = ref(false);
  const total    = ref(0);

  /**
   * Obtiene el listado de cierres (por defecto de inventario, 
   * ya que ambos guardan lo mismo en el snapshot global)
   */
  async function fetchClosures(page = 1, limit = 7) {
    loading.value = true;
    try {
      const res = await api.get('/inventory/cash-closures', { params: { page, limit } });
      if (res.data && res.data.ok) {
        closures.value = res.data.data;
        total.value    = res.data.total;
      }
    } catch (err) {
      console.error('[CASH-CLOSURES] Error fetching:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Obtiene un resumen consolidado de ambos microservicios.
   */
  async function getGlobalSummary() {
    loading.value = true;
    try {
      const [invRes, optRes] = await Promise.all([
        api.get('/inventory/cash-closures/current-summary'),
        api.get('/optica/cash-closures/current-summary')
      ]);

      const invData = invRes.data.data;
      const optData = optRes.data.data;

      return {
        ok: true,
        startDate: invData.startDate || optData.startDate,
        endDate: invData.endDate || optData.endDate,
        micas: invData,
        optica: optData,
        combined: {
          salesTotal: (invData.sales?.total || 0) + (optData.sales?.total || 0),
          salesCount: (invData.sales?.count || 0) + (optData.sales?.count || 0),
          mermaTotal: (invData.merma?.totalValue || 0) + (optData.merma?.totalValue || 0),
          mermaCount: (invData.merma?.count || 0) + (optData.merma?.count || 0),
          mermaByReason: {
            ROTURA:    (invData.merma?.byReason?.ROTURA || 0)    + (optData.merma?.byReason?.ROTURA || 0),
            DEFECTO:   (invData.merma?.byReason?.DEFECTO || 0)   + (optData.merma?.byReason?.DEFECTO || 0),
            CADUCIDAD: (invData.merma?.byReason?.CADUCIDAD || 0) + (optData.merma?.byReason?.CADUCIDAD || 0),
            EXTRAVIO:  (invData.merma?.byReason?.EXTRAVIO || 0)  + (optData.merma?.byReason?.EXTRAVIO || 0),
            OTRO:      (invData.merma?.byReason?.OTRO || 0)      + (optData.merma?.byReason?.OTRO || 0),
          },
          byMethod: {
            efec: (invData.sales?.byMethod?.efec || 0) + (optData.sales?.byMethod?.efec || 0),
            tarjeta: (invData.sales?.byMethod?.tarjeta || 0) + (optData.sales?.byMethod?.tarjeta || 0),
            trans: (invData.sales?.byMethod?.trans || 0) + (optData.sales?.byMethod?.trans || 0),
            credito: (invData.sales?.byMethod?.credito || 0) + (optData.sales?.byMethod?.credito || 0)
          }
        }
      };
    } catch (err) {
      console.error('[CASH-CLOSURES] Error global summary:', err);
      return { ok: false, error: "Uno o más servicios no están disponibles para el resumen." };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Realiza el cierre en ambos servicios.
   */
  async function performGlobalClosure(summary, observations = '') {
    loading.value = true;
    try {
      const globalSnapshot = {
        micas: { total: summary.micas.sales.total, count: summary.micas.sales.count },
        optica: { total: summary.optica.sales.total, count: summary.optica.sales.count },
        grandTotal: summary.combined.salesTotal
      };

      const [invRes, optRes] = await Promise.all([
        api.post('/inventory/cash-closures', { observations, globalSummary: globalSnapshot }),
        api.post('/optica/cash-closures', { observations, globalSummary: globalSnapshot })
      ]);

      return {
        ok: true,
        inv: invRes.data?.data,
        opt: optRes.data?.data
      };
    } catch (err) {
      console.error('[CASH-CLOSURES] Error creating global closure:', err);
      return { ok: false, error: "Error al realizar el cierre en uno de los servicios." };
    } finally {
      loading.value = false;
    }
  }

  return {
    closures,
    loading,
    total,
    fetchClosures,
    getGlobalSummary,
    performGlobalClosure
  };
}
