/**
 * rsbo-app/src/composables/tabsmanager/useVendorAutocomplete.js
 * Extrae las opciones únicas de proveedor y marca desde las planillas existentes.
 */
import { ref, computed } from "vue";
import { getGlobalVendors } from "@/services/inventory";

// Global cache to avoid fetching multiple times during the session
const globalProveedores = ref([]);
const globalMarcas = ref([]);
const hasFetchedGlobal = ref(false);

export function useVendorAutocomplete(sheets) {
  const normTxt = (s) =>
    String(s || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // Fetch global vendors exactly once
  const fetchGlobalVendors = async () => {
    if (hasFetchedGlobal.value) return;
    try {
      const res = await getGlobalVendors();
      if (res?.data?.data) {
        globalProveedores.value = res.data.data.proveedores || [];
        globalMarcas.value = res.data.data.marcas || [];
        hasFetchedGlobal.value = true;
      }
    } catch (e) {
      console.warn("[INV] Error fetching global vendors:", e);
    }
  };

  // Trigger fetch asynchronously
  fetchGlobalVendors();

  const uniqueNamesFromSheets = (getter) => {
    const set = new Map();
    for (const sh of sheets.value || []) {
      if (sh?.id === "nueva") continue;
      const raw = getter(sh);
      const pretty = String(raw || "").trim();
      if (!pretty) continue;
      const key = normTxt(pretty);
      if (!key) continue;
      if (!set.has(key)) set.set(key, pretty);
    }
    return Array.from(set.values());
  };

  const mergeAndSort = (localArr, globalArr) => {
    const set = new Map();
    const add = (val) => {
      const pretty = String(val || "").trim();
      if (!pretty) return;
      const key = normTxt(pretty);
      if (key && !set.has(key)) set.set(key, pretty);
    };
    localArr.forEach(add);
    globalArr.forEach(add);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  };

  const proveedorOptions = computed(() => {
    const local = uniqueNamesFromSheets((s) => s?.proveedor?.name);
    return mergeAndSort(local, globalProveedores.value);
  });

  const marcaOptions = computed(() => {
    const local = uniqueNamesFromSheets((s) => s?.marca?.name);
    return mergeAndSort(local, globalMarcas.value);
  });

  /**
   * Factory para crear un computed filtrado basado en un ref de entrada.
   */
  const createFilteredOptions = (inputRef, optionsRef) => {
    return computed(() => {
      const q = normTxt(inputRef.value);
      const base = optionsRef.value;
      if (!q) return base.slice(0, 30);
      return base.filter((x) => normTxt(x).includes(q)).slice(0, 30);
    });
  };

  return {
    normTxt,
    proveedorOptions,
    marcaOptions,
    createFilteredOptions
  };
}
