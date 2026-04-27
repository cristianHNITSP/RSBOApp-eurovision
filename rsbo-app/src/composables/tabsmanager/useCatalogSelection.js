/**
 * rsbo-app/src/composables/tabsmanager/useCatalogSelection.js
 * Gestiona el estado y la lógica de selección de base, material, tratamiento y variante.
 */
import { ref, computed } from "vue";

export function useCatalogSelection({ catalogBasesMap, catalogTreatmentsMap, materialRequired, showTratamiento }) {
  const selectedBase = ref(null);
  const selectedMaterial = ref(null);
  const selectedTratamientoKey = ref(null);
  const selectedVariante = ref("");

  const allMaterials = computed(() => {
    const set = new Set();
    Object.values(catalogBasesMap.value).forEach((b) => {
      if (b.materiales) b.materiales.forEach((m) => set.add(m));
    });
    return Array.from(set).sort();
  });

  const isMaterialAllowed = (mat) => {
    if (!selectedBase.value) return true;
    const cfg = catalogBasesMap.value[selectedBase.value];
    return cfg?.materiales?.includes(mat);
  };

  const hasAnyAllowedMaterial = computed(() =>
    allMaterials.value.some((m) => isMaterialAllowed(m))
  );

  const allowedTratamientos = computed(() => {
    if (!selectedBase.value || (materialRequired.value && !selectedMaterial.value)) return [];
    const baseCfg = catalogBasesMap.value[selectedBase.value];
    if (!baseCfg) return [];

    return (baseCfg.tratamientos || [])
      .map((k) => catalogTreatmentsMap.value[k])
      .filter((t) => {
        if (!t) return false;
        if (t.allowedMaterials?.length && !t.allowedMaterials.includes(selectedMaterial.value)) return false;
        if (t.allowedBases?.length && !t.allowedBases.includes(selectedBase.value)) return false;
        return true;
      })
      .map((t) => ({ key: t.key, label: t.label }));
  });

  const selectBase = (key) => {
    selectedBase.value = key;
    selectedMaterial.value = null;
    selectedTratamientoKey.value = null;
    selectedVariante.value = "";
  };

  const selectMaterial = (m) => {
    selectedMaterial.value = m;
    selectedTratamientoKey.value = null;
    selectedVariante.value = "";
  };

  const selectTratamiento = (key) => {
    selectedTratamientoKey.value = key;
    selectedVariante.value = "";
  };

  const selectVariante = (v) => {
    selectedVariante.value = v;
  };

  const varianteOptions = computed(() => {
    const key = selectedTratamientoKey.value;
    if (!key) return [];
    const t = catalogTreatmentsMap.value[key];
    if (!t) return [];

    const mat = String(selectedMaterial.value || "");
    if (t.variantsByMaterial && mat) {
      const byMat = t.variantsByMaterial instanceof Map
        ? t.variantsByMaterial.get(mat)
        : t.variantsByMaterial[mat];
      if (byMat?.length) return byMat;
    }

    return t.variants ? [...t.variants] : [];
  });

  const baseLabel = computed(() =>
    selectedBase.value ? (catalogBasesMap.value[selectedBase.value]?.label || "") : ""
  );

  return {
    selectedBase,
    selectedMaterial,
    selectedTratamientoKey,
    selectedVariante,
    allMaterials,
    isMaterialAllowed,
    hasAnyAllowedMaterial,
    allowedTratamientos,
    selectBase,
    selectMaterial,
    selectTratamiento,
    selectVariante,
    varianteOptions,
    baseLabel
  };
}
