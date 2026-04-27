/**
 * rsbo-app/src/composables/tabsmanager/usePurchaseAction.js
 */
import { ref, computed, watch, nextTick } from "vue";
import { normalizeSheet } from "./useSheetNormalizer";
import { fmtDateOnly, dateForEdit, numForEdit, ISO_DATE_ONLY_RX, addMonthsToISODate, DEFAULT_EXPIRY_MONTHS } from "./useDateHelpers";

export function usePurchaseAction({ selectedSheet, updateSheet, _updateLocalSheet, actorRef }) {
  const editNumFactura = ref("");
  const editLoteProducto = ref("");
  const editFechaCompra = ref("");
  const editFechaCaducidad = ref("");
  const editPrecioVenta = ref("");
  const editPrecioCompra = ref("");
  const savingPurchase = ref(false);
  const purchaseStatus = ref("idle");
  const purchaseStatusMessage = ref("");
  const purchaseGlow = ref(false);

  const suppressEditAutoExpiry = ref(false);
  watch(editFechaCompra, (v) => {
    if (suppressEditAutoExpiry.value) return;
    if (v && ISO_DATE_ONLY_RX.test(v)) {
      editFechaCaducidad.value = addMonthsToISODate(v, DEFAULT_EXPIRY_MONTHS);
    }
  });

  const initPurchase = async () => {
    const s = selectedSheet.value;
    suppressEditAutoExpiry.value = true;
    editNumFactura.value = s?.numFactura || "";
    editLoteProducto.value = s?.loteProducto || "";
    editFechaCompra.value = s?.fechaCompra ? fmtDateOnly(s.fechaCompra) : "";
    editFechaCaducidad.value = s?.fechaCaducidad ? fmtDateOnly(s.fechaCaducidad) : "";
    editPrecioVenta.value = (s?.precioVenta ?? "").toString();
    editPrecioCompra.value = (s?.precioCompra ?? "").toString();
    purchaseStatus.value = "idle";
    purchaseGlow.value = false;
    await nextTick();
    suppressEditAutoExpiry.value = false;
  };

  const canSavePurchase = computed(() => {
    if (!selectedSheet.value || savingPurchase.value) return false;
    const s = selectedSheet.value;
    const curNum = String(s.numFactura || "");
    const curLote = String(s.loteProducto || "");
    const curCompra = s.fechaCompra ? fmtDateOnly(s.fechaCompra) : "";
    const curCad = s.fechaCaducidad ? fmtDateOnly(s.fechaCaducidad) : "";
    const curPV = (s.precioVenta ?? "").toString();
    const curPC = (s.precioCompra ?? "").toString();

    return editNumFactura.value !== curNum || 
           editLoteProducto.value !== curLote || 
           editFechaCompra.value !== curCompra || 
           editFechaCaducidad.value !== curCad || 
           editPrecioVenta.value !== curPV || 
           editPrecioCompra.value !== curPC;
  });

  const confirmSavePurchase = async () => {
    if (!canSavePurchase.value) return;
    savingPurchase.value = true;
    purchaseStatus.value = "saving";

    try {
      const id = selectedSheet.value.id;
      const payload = {
        numFactura: String(editNumFactura.value ?? "").trim(),
        loteProducto: String(editLoteProducto.value ?? "").trim(),
        fechaCompra: dateForEdit(editFechaCompra.value),
        fechaCaducidad: dateForEdit(editFechaCaducidad.value),
        precioVenta: numForEdit(editPrecioVenta.value),
        precioCompra: numForEdit(editPrecioCompra.value),
        actor: actorRef.value || undefined
      };
      const { data } = await updateSheet(id, payload);
      const updated = data?.data?.sheet;
      if (!updated) throw new Error("Falta data.sheet");

      const norm = normalizeSheet(updated);
      _updateLocalSheet(id, norm);

      purchaseStatus.value = "saved";
      purchaseStatusMessage.value = "Datos guardados";
      purchaseGlow.value = true;
      setTimeout(() => { purchaseGlow.value = false; purchaseStatus.value = "idle"; }, 1500);
    } catch (e) {
      purchaseStatus.value = "error";
      purchaseStatusMessage.value = e?.response?.data?.message || e?.message || "Error";
    } finally {
      savingPurchase.value = false;
    }
  };

  return {
    editNumFactura, editLoteProducto, editFechaCompra, editFechaCaducidad, editPrecioVenta, editPrecioCompra,
    savingPurchase, purchaseStatus, purchaseStatusMessage, purchaseGlow,
    initPurchase, canSavePurchase, confirmSavePurchase
  };
}
