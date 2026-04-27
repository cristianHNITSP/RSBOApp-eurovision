import { ref, watch, computed } from 'vue';
import { useDebounceFn } from '@vueuse/core';

/**
 * useSheetExplorer
 * Maneja la lógica de búsqueda, scroll infinito y estado del explorador de planillas.
 * 
 * @param {Object} api - Instancia de useSheetApi
 */
export function useSheetExplorer(api) {
  const sheets = ref([]);
  const q = ref("");
  const isLoading = ref(false);
  const isEnd = ref(false);
  const total = ref(0);
  const limit = 30;

  // R9: Paginación basada en cursor (usamos el id normalizado)
  const lastId = computed(() => {
    if (!sheets.value.length) return null;
    return sheets.value[sheets.value.length - 1].id;
  });

  const search = async (reset = true) => {
    if (isLoading.value) return;
    if (reset) {
      sheets.value = [];
      isEnd.value = false;
    }

    if (isEnd.value && !reset) return;

    isLoading.value = true;
    try {
      const params = {
        q: q.value,
        limit,
        page: reset ? 1 : undefined, // Fallback a página si el backend no maneja cursor 100% bien
        cursor: reset ? null : lastId.value
      };

      const res = await api.listSheets(params);
      if (res.data?.ok) {
        // R9: Normalizar items al recibirlos para que RecycleScroller y filtros funcionen con 'id'
        const rawItems = res.data.data || [];
        const normalized = rawItems.map(s => ({ ...s, id: String(s.id || s._id) }));

        if (reset) {
          sheets.value = normalized;
        } else {
          sheets.value.push(...normalized);
        }
        total.value = res.data.meta?.total || sheets.value.length;
        
        // Si no vienen más elementos de los que pedimos, es el fin
        if (newSheets.length < limit) {
          isEnd.value = true;
        }
      }
    } catch (err) {
      console.error("[useSheetExplorer] search error:", err);
    } finally {
      isLoading.value = false;
    }
  };

  // R3: Eliminamos el watch automático para evitar dobles peticiones concurrentes
  // El componente Sidebar ahora dispara search() explícitamente vía debounce local

  return {
    sheets,
    q,
    isLoading,
    isEnd,
    total,
    search,
    loadMore: () => search(false),
  };
}
