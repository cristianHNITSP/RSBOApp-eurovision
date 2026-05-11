// rsbo-app/src/composables/lab/useLabItems.js
import { ref, computed, watch } from "vue";
import { fetchItems as invFetchItems } from "@/services/inventory";
import { normTxt, buildRowTitle, buildRowParams } from "./useLabMappers";
import { useSalesCatalog } from "@/composables/api/useSalesCatalog";

export function useLabItems(sheets) {
  // Catálogo paginado por servidor
  const catalog = useSalesCatalog({ category: 'inventory', pageSize: 7 });
  
  // Sincronizar sheetId del catálogo con el del composable principal
  watch(() => sheets.selectedSheetId.value, (newId) => {
    catalog.selectedSheetId.value = newId;
  });

  // Estado para la "Bandeja" (Vista de matriz completa)
  const itemsDB = ref([]);
  const itemQuery = ref("");
  const stockFilter = ref("withStock");
  const loadingItems = ref(false);
  const _itemsLimit = ref(5000);

  const _inFlight = { items: null };
  let _ac = new AbortController();

  async function loadItems(forceSheetId) {
    const sid = forceSheetId || sheets.selectedSheetId.value;
    const sheet = sheets.sheetById(sid);
    if (!sheet?.id) {
      itemsDB.value = [];
      return;
    }

    // El catálogo se carga solo si sid cambia o si se solicita explícitamente
    catalog.selectedSheetId.value = sid;

    if (_inFlight.items) return _inFlight.items;
    loadingItems.value = true;
    _inFlight.items = (async () => {
      try {
        const params = {
          limit: Number(_itemsLimit.value || 500),
          q: String(itemQuery.value || "").trim() || undefined,
          signal: _ac.signal
        };
        const { data } = await invFetchItems(sheet.id, params);
        const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        itemsDB.value = rows.map((r, idx) => ({
          ...r,
          _k: String(r.codebar || "") ? `${r.codebar}` : `row_${idx}`,
          existencias: Number(r.existencias || 0),
          _normTitle: normTxt(buildRowTitle(r, sheet)),
          _normParams: normTxt(buildRowParams(r, sheet)),
          _normCode: normTxt(r.codebar || "")
        }));
      } catch (e) {
        if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
          console.error("[LAB] loadItems", e?.response?.data || e);
          itemsDB.value = [];
        }
      } finally {
        loadingItems.value = false;
        _inFlight.items = null;
      }
    })();
    return _inFlight.items;
  }

  const filteredItems = computed(() => {
    const rows = Array.isArray(itemsDB.value) ? itemsDB.value : [];
    const q = normTxt(itemQuery.value);
    const filter = String(stockFilter.value || "all");
    let out = rows;

    if (filter === "withStock") out = out.filter((r) => r.existencias > 0);
    else if (filter === "zero") out = out.filter((r) => r.existencias === 0);

    if (q) {
      out = out.filter((r) =>
        (r._normTitle || "").includes(q) ||
        (r._normParams || "").includes(q) ||
        (r._normCode || "").includes(q)
      );
    }
    return out;
  });

  // Alias para retrocompatibilidad en la UI de Laboratorio
  const catalogQuery = catalog.searchQuery;
  const catalogFilter = catalog.stockFilter;
  const catalogPage = catalog.currentPage;
  const catalogPageSize = catalog.pageSize;
  const filteredCatalogRows = catalog.items;
  const catalogPages = catalog.totalPages;
  const paginatedCatalog = catalog.items; // Ya vienen paginados del servidor

  const totalCodes = computed(() =>
    itemsDB.value.filter((r) => !!String(r.codebar || "").trim()).length
  );

  return {
    itemsDB,
    itemQuery,
    stockFilter,
    loadingItems,
    _itemsLimit,
    catalogQuery,
    catalogFilter,
    catalogPage,
    catalogPageSize,
    loadItems,
    filteredItems,
    filteredCatalogRows,
    catalogPages,
    paginatedCatalog,
    totalCodes,
    abortItems: () => _ac.abort(),
    resetAbort: () => { _ac = new AbortController(); }
  };
}
