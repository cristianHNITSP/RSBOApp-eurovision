/**
 * rsbo-app/src/composables/tabsmanager/useSheetActions.js
 * Orquestador de acciones de planilla (open, rename, vendor, purchase, meta, delete).
 */
import { ref } from "vue";
import { useRenameAction } from "./useRenameAction";
import { useVendorAction } from "./useVendorAction";
import { usePurchaseAction } from "./usePurchaseAction";
import { useMetaNotes } from "./useMetaNotes";
import { useDeleteAction } from "./useDeleteAction";

export function useSheetActions({ updateSheet, deleteSheet, sheets, emit, actorRef }) {
  const selectedSheet = ref(null);
  const isActionsOpen = ref(false);

  const _updateLocalSheet = (id, norm) => {
    const idx = sheets.value.findIndex((s) => s.id === id);
    if (idx >= 0) {
      sheets.value[idx] = { ...sheets.value[idx], ...norm };
      selectedSheet.value = sheets.value[idx];
    }
  };

  const closeActions = () => {
    isActionsOpen.value = false;
    selectedSheet.value = null;
  };

  const openSheetFromModal = () => {
    if (!selectedSheet.value) return;
    emit("update:active", selectedSheet.value.id);
    closeActions();
  };

  // Sub-composables
  const rename = useRenameAction({ selectedSheet, updateSheet, _updateLocalSheet, actorRef, emit });
  const vendor = useVendorAction({ selectedSheet, updateSheet, _updateLocalSheet, actorRef });
  const purchase = usePurchaseAction({ selectedSheet, updateSheet, _updateLocalSheet, actorRef });
  const meta = useMetaNotes({ selectedSheet, updateSheet, _updateLocalSheet, actorRef });
  const del = useDeleteAction({ selectedSheet, deleteSheet, sheets, emit, actorRef, closeActions });

  const openActions = (planilla) => {
    selectedSheet.value = planilla;
    isActionsOpen.value = true;
    rename.initRename();
    vendor.initVendor();
    purchase.initPurchase();
    meta.initMeta();
  };

  return {
    selectedSheet,
    isActionsOpen,
    openActions,
    closeActions,
    openSheetFromModal,
    ...rename,
    ...vendor,
    ...purchase,
    ...meta,
    ...del
  };
}
