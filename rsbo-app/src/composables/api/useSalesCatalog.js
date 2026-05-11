import { ref, computed, watch } from 'vue';
import { useLabToast } from '@/composables/shared/useLabToast';
import { fetchSalesCatalogItems, updateSalesCatalogStock } from '@/services/inventory';

/**
 * Composable para manejar el catálogo de ventas paginado desde el servidor.
 */
export function useSalesCatalog(options = {}) {
  const category = options.category || 'inventory';
  const toast = useLabToast();
  
  // Posibilidad de inyectar servicios personalizados (ej: para Óptica)
  const fetcher = options.fetcher || fetchSalesCatalogItems;
  const updater = options.updater || updateSalesCatalogStock;
  
  const items = ref([]);
  const loading = ref(false);
  const isOffline = ref(false);
  const totalItems = ref(0);
  const currentPage = ref(1);
  const totalPages = ref(1);
  const pageSize = ref(options.pageSize || 7);
  
  const selectedSheetId = ref(null);
  const searchQuery = ref('');
  const stockFilter = ref('withStock'); // 'all', 'withStock'
  const extraFilters = ref({}); // Para ejes, etc.
 
  let abortController = null;
 
  const fetchItems = async () => {
    if (!selectedSheetId.value) {
      items.value = [];
      totalItems.value = 0;
      isOffline.value = false;
      return;
    }
 
    if (abortController) abortController.abort();
    abortController = new AbortController();
 
    loading.value = true;
    try {
      const params = {
        category,
        q: searchQuery.value,
        stockFilter: stockFilter.value,
        page: currentPage.value,
        limit: pageSize.value,
        ...extraFilters.value,
        signal: abortController.signal
      };
 
      // Contrato de API: Óptica espera 'collection', Inventario espera 'sheetId'
      if (category === 'optica') {
        params.collection = selectedSheetId.value;
      } else {
        params.sheetId = selectedSheetId.value;
      }
 
      const response = await fetcher(params);
 
      if (response.data && response.data.ok) {
        const payload = response.data;
        const meta = payload.meta || {};
        
        items.value = Array.isArray(payload.data) ? payload.data : [];
        totalItems.value = Number(meta.total || 0);
        totalPages.value = Number(meta.pages || 1);
        currentPage.value = Number(meta.page || 1);
        isOffline.value = false;
      } else {
        console.warn('[useSalesCatalog] Response received but ok is false:', response.data);
        toast.danger(response.data?.message || 'Error en el servidor al cargar productos');
        isOffline.value = true;
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
      console.error('[useSalesCatalog] Critical Error in fetchItems:', err);
      isOffline.value = true;
      toast.danger('Servicio no disponible. Contacte a soporte técnico.');
    } finally {
      if (abortController?.signal.aborted) return;
      loading.value = false;
    }
  };

  const updateStock = async (sku, delta, type = 'VENTA_DIRECTA', extra = {}) => {
    try {
      const response = await updater(sku, {
        category,
        sku,
        delta,
        movementType: type,
        sheetId: selectedSheetId.value,
        ...extra
      });
      
      if (response.data && response.data.ok) {
        // Actualizamos localmente el item si lo encontramos para feedback instantáneo
        const idx = items.value.findIndex(it => it.sku === sku);
        if (idx !== -1) {
          items.value[idx].existencias = response.data.data.stockAfter;
        }
        return response.data.data;
      }
    } catch (err) {
      console.error('[useSalesCatalog] Error updating stock:', err);
      const msg = err.response?.data?.message || 'Error al actualizar stock';
      toast.danger(msg);
      throw err;
    }
  };

  // Observadores para recarga automática
  watch([selectedSheetId, stockFilter, extraFilters], () => {
    currentPage.value = 1;
    fetchItems();
  }, { deep: true });

  // Debounce simple para la búsqueda
  let searchTimeout;
  watch(searchQuery, () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage.value = 1;
      fetchItems();
    }, 500);
  });

  // Recarga al cambiar de página
  watch(currentPage, () => {
    fetchItems();
  });

  return {
    items,
    loading,
    totalItems,
    currentPage,
    totalPages,
    pageSize,
    selectedSheetId,
    isOffline,
    searchQuery,
    stockFilter,
    extraFilters,
    fetchItems,
    updateStock
  };
}
