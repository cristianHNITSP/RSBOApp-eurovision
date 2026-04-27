/* rsbo-app/src/composables/tabsmanager/useInternalTabs.js */
import { ref, computed, watch } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";

export function useInternalTabs({ activeId, activeSheetObj, emit, initialInternalId }) {
  const activeInternalTab = ref(null);
  const internalTabHistory = new Map();

  const internalTabs = computed(() => {
    const t = activeSheetObj.value?.tipo_matriz;
    if (!t) return [];
    if (t === "SPH_ADD" || t === "SPH_CYL") {
      return [{ id: "sph-neg", label: "SPH (-)" }, { id: "sph-pos", label: "SPH (+)" }];
    }
    if (t === "BASE" || t === "BASE_ADD") {
      return [{ id: "base-neg", label: "BASE (-)" }, { id: "base-pos", label: "BASE (+)" }];
    }
    return [];
  });

  // Watch for sheet changes or tab list changes
  watch(internalTabs, (tabs) => {
    const sheetId = activeId.value;
    const saved = internalTabHistory.get(sheetId);
    const target = saved && tabs.some(t => t.id === saved) ? saved : (tabs[0]?.id ?? null);
    activeInternalTab.value = target;
    emit("update:internal", target);
  }, { immediate: true });

  // Sync from parent prop (if changed externally)
  watch(() => initialInternalId?.value, (val) => {
    if (val && val !== activeInternalTab.value) {
      activeInternalTab.value = val;
      internalTabHistory.set(activeId.value, val);
    }
  });

  const selectTab = (id) => {
    activeInternalTab.value = id;
    internalTabHistory.set(activeId.value, id);
    emit("update:internal", id);
    
    const lbl = id.toLowerCase().includes('neg') 
      ? 'Negativos (-)' 
      : id.toLowerCase().includes('pos') 
        ? 'Positivos (+)' 
        : id;
    labToast.info(`Vista: ${lbl}`, 1500);
  };

  return {
    internalTabs,
    activeInternalTab,
    selectTab
  };
}
