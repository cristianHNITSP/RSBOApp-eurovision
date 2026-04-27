/**
 * rsbo-app/src/composables/tabsmanager/useCreateSheet.js
 * Encapsula el estado y la lógica para crear una nueva planilla.
 */
import { ref, nextTick, watch } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import {
  ISO_DATE_ONLY_RX,
  todayISO,
  addMonthsToISODate,
  DEFAULT_EXPIRY_MONTHS,
  dateForCreate,
  numForCreate
} from "./useDateHelpers";
import { normalizeSheet, composeTratamientoDisplay } from "./useSheetNormalizer";

export function useCreateSheet({
  createSheet,
  catalogBasesMap,
  catalogTreatmentsMap,
  sheets,
  props,
  emit,
  actorRef,
  selection // Result from useCatalogSelection
}) {
  const newProveedorName = ref("");
  const newMarcaName = ref("");
  const newPrecioVenta = ref("");
  const newPrecioCompra = ref("");
  const newNumFactura = ref("");
  const newLoteProducto = ref("");
  const newFechaCompra = ref("");
  const newFechaCaducidad = ref("");
  const newSheetName = ref("");

  const creatingSheet = ref(false);
  const createStatus = ref("idle");
  const createStatusMessage = ref("");

  // Bug #5: Auto-expiry for new form
  watch(newFechaCompra, (v) => {
    if (v && ISO_DATE_ONLY_RX.test(v)) {
      newFechaCaducidad.value = addMonthsToISODate(v, DEFAULT_EXPIRY_MONTHS);
    }
  });

  const resetCreateStatus = () => {
    createStatus.value = "idle";
    createStatusMessage.value = "";
  };

  const resetNewForm = () => {
    newProveedorName.value = "";
    newMarcaName.value = "";
    newPrecioVenta.value = "";
    newPrecioCompra.value = "";
    newNumFactura.value = "";
    newLoteProducto.value = "";
    newFechaCompra.value = "";
    newFechaCaducidad.value = "";
    newSheetName.value = "";
    selection.selectBase(null);
  };

  const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

  const handleCrear = async () => {
    creatingSheet.value = true;
    createStatus.value = "saving";
    createStatusMessage.value = "Validando selección…";
    await nextTick();

    try {
      const baseCfg = catalogBasesMap.value[selection.selectedBase.value];
      const tipo_matriz = baseCfg?.tipo_matriz || "SPH_CYL";

      const tKey = props.showTratamiento ? selection.selectedTratamientoKey.value : null;
      const tratamientoLabel = tKey ? (catalogTreatmentsMap.value[tKey]?.label || tKey) : "";
      const varianteLabel = String(selection.selectedVariante.value || "").trim();

      const tratamientoDisplay = composeTratamientoDisplay(tratamientoLabel, varianteLabel);
      const tratamientosLegacy = tratamientoDisplay ? [tratamientoDisplay] : [];

      const baseCad = newFechaCompra.value && ISO_DATE_ONLY_RX.test(newFechaCompra.value) ? newFechaCompra.value : todayISO();
      const cadFinal =
        newFechaCaducidad.value && ISO_DATE_ONLY_RX.test(newFechaCaducidad.value)
          ? newFechaCaducidad.value
          : addMonthsToISODate(baseCad, DEFAULT_EXPIRY_MONTHS);

      const payload = {
        nombre: newSheetName.value,
        baseKey: selection.selectedBase.value,
        base: baseCfg?.label || selection.selectedBase.value,
        material: selection.selectedMaterial.value || "",

        tratamiento: tratamientoLabel || null,
        variante: varianteLabel || null,
        tratamientos: tratamientosLegacy,

        numFactura: String(newNumFactura.value || "").trim(),
        loteProducto: String(newLoteProducto.value || "").trim(),
        fechaCompra: dateForCreate(newFechaCompra.value),
        fechaCaducidad: dateForCreate(cadFinal),

        precioVenta: numForCreate(newPrecioVenta.value),
        precioCompra: numForCreate(newPrecioCompra.value),

        tipo_matriz,
        seed: true,
        autoGenerate: true,

        proveedor: { id: null, name: (newProveedorName.value || "").trim() },
        marca: { id: null, name: (newMarcaName.value || "").trim() },

        actor: actorRef.value || undefined
      };

      createStatusMessage.value = "Subiendo planilla…";
      const { data } = await createSheet(payload);

      const s = data?.data?.sheet;
      const tabs = data?.data?.tabs || [];
      if (!s) throw new Error("Sin hoja en respuesta");

      const newTab = normalizeSheet({ ...s, tabs });

      emit("update:active", newTab.id);
      emit("crear", { result: s, tabs });

      resetNewForm();

      createStatus.value = "saved";
      createStatusMessage.value = "Planilla creada correctamente";
      labToast.success(`Planilla "${newTab.name}" creada.`);
      setTimeout(() => resetCreateStatus(), 1800);
    } catch (e) {
      console.error("[INV][UI] Error al crear planilla:", e?.response?.data || e);
      createStatus.value = "error";
      createStatusMessage.value = errMsg(e, "No se pudo crear la planilla");
      setTimeout(() => resetCreateStatus(), 2600);
    } finally {
      creatingSheet.value = false;
    }
  };

  return {
    newProveedorName,
    newMarcaName,
    newPrecioVenta,
    newPrecioCompra,
    newNumFactura,
    newLoteProducto,
    newFechaCompra,
    newFechaCaducidad,
    newSheetName,
    creatingSheet,
    createStatus,
    createStatusMessage,
    handleCrear,
    resetNewForm
  };
}
