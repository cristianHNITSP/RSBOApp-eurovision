// rsbo-app/src/composables/lab/useLabItems.js
import { ref, computed } from "vue";
import { fetchItems as invFetchItems } from "@/services/inventory";
import { normTxt, buildRowTitle, buildRowParams } from "./useLabMappers";

export function useLabItems(sheets) {
  const itemsDB = ref([]);
  const itemQuery = ref("");
  const stockFilter = ref("withStock");
  const loadingItems = ref(false);
  const _itemsLimit = ref(5000);
  const catalogQuery = ref("");
  const catalogFilter = ref("withStock");
  const catalogPage = ref(1);
  const catalogPageSize = ref(18);

  const _inFlight = { items: null };
  // We'll need to pass an AbortController or similar if we want to handle it here
  let _ac = new AbortController();

  async function loadItems(forceSheetId) {
    const sid = forceSheetId || sheets.selectedSheetId.value;
    const sheet = sheets.sheetById(sid);
    if (!sheet?.id) {
      itemsDB.value = [];
      return;
    }

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

  const filteredCatalogRows = computed(() => {
    const rows = Array.isArray(itemsDB.value) ? itemsDB.value : [];
    const q = normTxt(catalogQuery.value);
    let out = rows;

    if (catalogFilter.value === "withStock") out = out.filter((r) => r.codebar && r.existencias > 0);
    else if (catalogFilter.value === "allCodes") out = out.filter((r) => !!r.codebar);

    if (q) {
      out = out.filter((r) =>
        (r._normTitle || "").includes(q) ||
        (r._normParams || "").includes(q) ||
        (r._normCode || "").includes(q)
      );
    }

    return out.map((r, idx) => ({
      ...r,
      _k: String(r.codebar || "") ? `${r.codebar}__${idx}` : `row_${idx}`
    }));
  });

  const catalogPages = computed(() =>
    Math.max(1, Math.ceil(filteredCatalogRows.value.length / Number(catalogPageSize.value || 18)))
  );

  const paginatedCatalog = computed(() => {
    const page = Math.min(Math.max(1, Number(catalogPage.value || 1)), catalogPages.value);
    const per = Number(catalogPageSize.value || 18);
    return filteredCatalogRows.value.slice((page - 1) * per, (page - 1) * per + per);
  });

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
