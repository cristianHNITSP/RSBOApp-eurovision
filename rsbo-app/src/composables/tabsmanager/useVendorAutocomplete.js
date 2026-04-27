/**
 * rsbo-app/src/composables/tabsmanager/useVendorAutocomplete.js
 * Extrae las opciones únicas de proveedor y marca desde las planillas existentes.
 */
import { computed } from "vue";

export function useVendorAutocomplete(sheets) {
  const normTxt = (s) =>
    String(s || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

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
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  };

  const proveedorOptions = computed(() => uniqueNamesFromSheets((s) => s?.proveedor?.name));
  const marcaOptions = computed(() => uniqueNamesFromSheets((s) => s?.marca?.name));

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
