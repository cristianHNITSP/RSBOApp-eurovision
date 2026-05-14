import { ref, computed, reactive } from "vue";
import { getGlobalVendors } from "@/services/inventory";

// Cache por tipo para evitar peticiones redundantes
const globalCache = reactive({
  inventory: { proveedores: [], marcas: [], fetched: false },
  contactlenses: { proveedores: [], marcas: [], fetched: false }
});

export function useVendorAutocomplete(sheets, apiType = "inventory") {
  const normTxt = (s) =>
    String(s || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const type = apiType || "inventory";

  // Fetch global vendors para el tipo específico
  const fetchGlobalVendors = async () => {
    if (globalCache[type].fetched) return;
    globalCache[type].fetched = true;
    try {
      const res = await getGlobalVendors(type);
      if (res?.data?.data) {
        globalCache[type].proveedores = res.data.data.proveedores || [];
        globalCache[type].marcas = res.data.data.marcas || [];
      } else {
        globalCache[type].fetched = false;
      }
    } catch (e) {
      console.warn(`[INV] Error fetching global vendors for ${type}:`, e);
      globalCache[type].fetched = false;
    }
  };

  // Disparar carga si no se ha hecho
  if (!globalCache[type].fetched) fetchGlobalVendors();

  const uniqueNamesFromSheets = (getter) => {
    const set = new Map();
    const list = (sheets && sheets.value) ? sheets.value : Array.isArray(sheets) ? sheets : [];
    for (const sh of list) {
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
    return mergeAndSort(local, globalCache[type].proveedores);
  });

  const marcaOptions = computed(() => {
    const local = uniqueNamesFromSheets((s) => s?.marca?.name);
    return mergeAndSort(local, globalCache[type].marcas);
  });

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
