// rsbo-app/src/composables/lab/useLabSheets.js
import { ref, computed } from "vue";
import { listSheets as invListSheets } from "@/services/inventory";
import { normalizeSheet, sheetTitle } from "./useLabMappers";
import { debounce } from "@/utils/debounce";

export function useLabSheets() {
  const sheetsDB = ref([]);
  const sheetIndex = new Map();
  const sheetSearchResults = ref([]);
  const sheetSearchLoading = ref(false);
  const selectedSheetId = ref("");
  const sheetQuery = ref("");
  const loadingSheets = ref(false);
  const includeDeleted = ref(false);
  const lastUpdatedAt = ref(Date.now());

  const sheetById = (id) => {
    if (!id) return null;
    const key = String(id);
    if (sheetIndex.has(key)) return sheetIndex.get(key);
    return sheetsDB.value.find((s) => String(s.id) === key) || null;
  };

  const sheetNameById = (id) => sheetById(id)?.nombre || sheetById(id)?.name || "—";

  const selectedSheet = computed(() => sheetById(selectedSheetId.value));
  const selectedSheetLabel = computed(() =>
    selectedSheet.value ? sheetTitle(selectedSheet.value) : "Sin planilla"
  );

  const _inFlight = { sheets: null };

  async function loadSheets() {
    if (_inFlight.sheets) return _inFlight.sheets;
    loadingSheets.value = true;
    _inFlight.sheets = (async () => {
      try {
        const params = {
          includeDeleted: includeDeleted.value ? "true" : "false",
          q: String(sheetQuery.value || "").trim() || undefined
        };
        const { data } = await invListSheets(params);
        const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const mapped = arr.map(normalizeSheet);
        mapped.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
        sheetsDB.value = mapped;
        for (const s of mapped) sheetIndex.set(String(s.id), s);
        sheetSearchResults.value = mapped;

        if (!selectedSheetId.value && mapped.length) selectedSheetId.value = mapped[0].id;
        if (selectedSheetId.value && !sheetById(selectedSheetId.value) && mapped.length) selectedSheetId.value = mapped[0].id;
        lastUpdatedAt.value = Date.now();
      } catch (e) {
        console.error("[LAB] loadSheets", e?.response?.data || e);
        sheetsDB.value = [];
      } finally {
        loadingSheets.value = false;
        _inFlight.sheets = null;
      }
    })();
    return _inFlight.sheets;
  }

  const _searchSheetsCore = async (q = "") => {
    const query = String(q || "").trim();
    
    // Si la búsqueda es vacía y ya tenemos datos, evitamos el flash y la llamada API
    if (!query && sheetsDB.value.length) {
      sheetSearchResults.value = [...sheetsDB.value];
      return;
    }

    sheetSearchLoading.value = true;
    try {
      const { data } = await invListSheets({
        q: query || undefined,
        limit: 50,
        includeDeleted: String(includeDeleted.value),
      });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const mapped = arr.map(normalizeSheet);
      sheetSearchResults.value = mapped;
      for (const s of mapped) sheetIndex.set(String(s.id), s);
    } catch {
      sheetSearchResults.value = [];
    } finally {
      sheetSearchLoading.value = false;
    }
  };
  const searchSheets = debounce(_searchSheetsCore, 300);

  const lastUpdatedHuman = computed(() => {
    const diff = Math.floor((Date.now() - lastUpdatedAt.value) / 1000);
    if (diff < 60) return "Ahora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  });

  return {
    sheetsDB,
    sheetIndex,
    sheetSearchResults,
    sheetSearchLoading,
    selectedSheetId,
    sheetQuery,
    loadingSheets,
    includeDeleted,
    lastUpdatedAt,
    lastUpdatedHuman,
    sheetById,
    sheetNameById,
    selectedSheet,
    selectedSheetLabel,
    loadSheets,
    searchSheets
  };
}
