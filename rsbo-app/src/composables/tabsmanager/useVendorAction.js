/**
 * rsbo-app/src/composables/tabsmanager/useVendorAction.js
 */
import { ref, computed } from "vue";
import { normalizeSheet } from "./useSheetNormalizer";

export function useVendorAction({ selectedSheet, updateSheet, _updateLocalSheet, actorRef }) {
  const editProveedorName = ref("");
  const editMarcaName = ref("");
  const savingVendor = ref(false);
  const vendorStatus = ref("idle");
  const vendorStatusMessage = ref("");
  const vendorGlow = ref(false);

  const initVendor = () => {
    editProveedorName.value = selectedSheet.value?.proveedor?.name || "";
    editMarcaName.value = selectedSheet.value?.marca?.name || "";
    vendorStatus.value = "idle";
    vendorStatusMessage.value = "";
    vendorGlow.value = false;
  };

  const canSaveVendor = computed(() => {
    if (!selectedSheet.value || savingVendor.value) return false;
    const currentProv = String(selectedSheet.value?.proveedor?.name || "").trim();
    const currentMarca = String(selectedSheet.value?.marca?.name || "").trim();
    const nextProv = String(editProveedorName.value || "").trim();
    const nextMarca = String(editMarcaName.value || "").trim();
    return nextProv !== currentProv || nextMarca !== currentMarca;
  });

  const confirmSaveVendor = async () => {
    if (!canSaveVendor.value) return;
    savingVendor.value = true;
    vendorStatus.value = "saving";
    vendorStatusMessage.value = "Sincronizando…";

    try {
      const id = selectedSheet.value.id;
      const payload = {
        proveedor: { id: null, name: String(editProveedorName.value || "").trim() },
        marca: { id: null, name: String(editMarcaName.value || "").trim() },
        actor: actorRef.value || undefined
      };
      const { data } = await updateSheet(id, payload);
      const updated = data?.data?.sheet;
      if (!updated) throw new Error("Falta data.sheet");

      const norm = normalizeSheet(updated);
      _updateLocalSheet(id, norm);

      vendorStatus.value = "saved";
      vendorStatusMessage.value = "Guardado";
      vendorGlow.value = true;
      setTimeout(() => { vendorGlow.value = false; vendorStatus.value = "idle"; }, 1500);
    } catch (e) {
      vendorStatus.value = "error";
      vendorStatusMessage.value = e?.response?.data?.message || e?.message || "Error";
    } finally {
      savingVendor.value = false;
    }
  };

  return {
    editProveedorName, editMarcaName, savingVendor, vendorStatus, vendorStatusMessage, vendorGlow,
    initVendor, canSaveVendor, confirmSaveVendor
  };
}
