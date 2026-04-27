<!-- src/components/TabsManager.vue -->
<template>
  <div>
    <!-- TABS -->
    <TabsBar
      :sheets="sheets"
      :active-id="activeId"
      :loading-tabs="loadingTabs"
      :has-more="hasMore"
      :has-prior="hasPrior"
      :loading-more="loadingMore"
      :loading-prior="loadingPrior"
      :prior-count="priorCount"
      @tab-click="handleTabClick"
      @open-actions="openActions"
      @load-more="$emit('load-more')"
      @load-prior="$emit('load-prior')"
      @reorder="handleReorder"
    />

    <!-- CONTENIDO -->
    <div class="plantillas-contenedor">
      <!-- NUEVA -->
      <div v-if="activeId === 'nueva'" class="plantillas-contenedor">
        <CreateSheetForm
          :catalog="catalog"
          :material-required="materialRequired"
          :show-tratamiento="showTratamiento"
          :sheets="sheets"
          :catalog-bases-map="catalogBasesMap"
          :catalog-treatments-map="catalogTreatmentsMap"
          :create-sheet="createSheet"
          :actor-ref="actorRef"
          @crear="handleSheetCreated"
          @update:active="setActiveTab"
        />
      </div>

      <!-- EXISTENTES -->
      <div v-else>
        <slot :activeId="activeId" :activeInternal="activeInternalTab" :activeSheet="activeSheetObj"></slot>

        <!-- TABS INTERNAS -->
        <InternalTabs
          v-if="internalTabs.length"
          :tabs="internalTabs"
          :active-tab-id="activeInternalTab"
          @select="handleInternalTabClick"
        />
      </div>
    </div>

    <!-- MODAL ACCIONES -->
    <SheetActionsModal
      v-model:is-open="isActionsOpen"
      :sheet="selectedSheet"
      :created-date="purchaseFechaCreacion"
      v-model:rename-name="renameName"
      :renaming="renaming"
      :rename-status="renameStatus"
      :rename-status-message="renameStatusMessage"
      :rename-glow="renameGlow"
      :can-rename="canRename"
      @save-rename="confirmRename"
      v-model:edit-proveedor-name="editProveedorName"
      v-model:edit-marca-name="editMarcaName"
      :filtered-proveedores="filteredProveedorOptionsEdit"
      :filtered-marcas="filteredMarcaOptionsEdit"
      :saving-vendor="savingVendor"
      :vendor-status="vendorStatus"
      :vendor-status-message="vendorStatusMessage"
      :vendor-glow="vendorGlow"
      :can-save-vendor="canSaveVendor"
      @save-vendor="confirmSaveVendor"
      v-model:edit-precio-venta="editPrecioVenta"
      v-model:edit-precio-compra="editPrecioCompra"
      v-model:edit-num-factura="editNumFactura"
      v-model:edit-lote-producto="editLoteProducto"
      v-model:edit-fecha-compra="editFechaCompra"
      v-model:edit-fecha-caducidad="editFechaCaducidad"
      :saving-purchase="savingPurchase"
      :purchase-status="purchaseStatus"
      :purchase-status-message="purchaseStatusMessage"
      :purchase-glow="purchaseGlow"
      :can-save-purchase="canSavePurchase"
      @save-purchase="confirmSavePurchase"
      v-model:observaciones="metaForm.observaciones"
      v-model:notas="metaForm.notas"
      :saving-meta="savingMeta"
      :meta-status="metaStatus"
      :meta-status-message="metaStatusMessage"
      :meta-glow="metaGlow"
      :can-save-meta="canSaveMeta"
      @save-meta="confirmSaveMeta"
      :deleting="deleting"
      @confirm-delete="softDelete"
      @close="isActionsOpen = false"
      @open="openSheet"
    />
  </div>
</template>

<script setup>
// New Sub-components
import TabsBar from "./tabsmanager/TabsBar.vue";
import CreateSheetForm from "./tabsmanager/CreateSheetForm.vue";
import SheetActionsModal from "./tabsmanager/SheetActionsModal.vue";
import InternalTabs from "./tabsmanager/InternalTabs.vue";

// New Composables
import { normalizeSheet, displayTratamiento, tipoHuman } from "@/composables/tabsmanager/useSheetNormalizer";
import { 
  ISO_DATE_ONLY_RX, 
  DEFAULT_EXPIRY_MONTHS, 
  fmtDateOnly, 
  addMonthsToISODate,
  dateForEdit,
  numForEdit
} from "../composables/tabsmanager/useDateHelpers";

import { ref, computed, watch, nextTick } from "vue";
import { useSheetApi } from "@/composables/api/useSheetApi";
import { labToast } from "@/composables/shared/useLabToast.js";

const DEBUG_PURCHASE = true;

const props = defineProps({
  initialSheets:    { type: Array,   required: true },
  activeId:         { type: String,  required: true },
  catalog:          { type: Object,  default: () => ({ bases: [], treatments: [] }) },
  catalogLoading:   { type: Boolean, default: false },
  actor:            { type: Object,  default: null },
  loadingTabs:      { type: Boolean, default: false },
  apiType:          { type: String,  default: 'inventory' },
  materialRequired: { type: Boolean, default: true },
  showTratamiento:  { type: Boolean, default: true },
  /** Pagination props */
  hasMore:          { type: Boolean, default: false },
  hasPrior:         { type: Boolean, default: false },
  loadingMore:      { type: Boolean, default: false },
  loadingPrior:     { type: Boolean, default: false },
  priorCount:       { type: Number,  default: 0 },
  activeInternalId: { type: String,  default: null },
});

const { createSheet, updateSheet, moveSheetToTrash } = useSheetApi(() => props.apiType);

const emit = defineEmits(["update:active", "reorder", "crear", "update:internal", "deleted", "renamed", "load-more", "load-prior"]);

/* ===================== CATÁLOGO DESDE BD ===================== */
// Mapa key → CatalogBase (para lookups O(1))
const catalogBasesMap = computed(() => {
  const map = {};
  for (const b of props.catalog?.bases ?? []) map[b.key] = b;
  return map;
});

// Mapa key → CatalogTreatment (para lookups O(1))
const catalogTreatmentsMap = computed(() => {
  const map = {};
  for (const t of props.catalog?.treatments ?? []) map[t.key] = t;
  return map;
});

const mapSheets = (arr) => (Array.isArray(arr) ? arr : []).map(normalizeSheet).filter(Boolean);

/* ===== Tabs ===== */
const sheets = ref(mapSheets(props.initialSheets));
watch(
  () => props.initialSheets,
  (v) => (sheets.value = mapSheets(v)),
  { deep: true, immediate: true }
);

/* ===================== Autocomplete Proveedor/Marca ===================== */
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

const activeId = computed(() => props.activeId);
const activeSheetObj = computed(() => sheets.value.find((s) => s.id === activeId.value));

/* ===== Tabs internas ===== */
const activeInternalTab = ref(null);
/** Recuerda la última pestaña interna elegida por sheetId para sobrevivir al KeepAlive */
const internalTabHistory = new Map();

const internalTabs = computed(() => {
  const t = activeSheetObj.value?.tipo_matriz;
  if (!t) return [];

  if (t === "SPH_ADD" || t === "SPH_CYL") {
    return [
      { id: "sph-neg", label: "SPH (-)" },
      { id: "sph-pos", label: "SPH (+)" }
    ];
  }

  if (t === "BASE" || t === "BASE_ADD") {
    return [
      { id: "base-neg", label: "BASE (-)" },
      { id: "base-pos", label: "BASE (+)" }
    ];
  }

  return [];
});

watch(
  internalTabs,
  (tabs) => {
    const sheetId = activeId.value;
    const saved   = internalTabHistory.get(sheetId);
    const first   = tabs[0]?.id ?? null;
    const valid   = saved && tabs.some(t => t.id === saved);
    const target  = valid ? saved : first;
    activeInternalTab.value = target;
    emit("update:internal", target);
  },
  { immediate: true }
);

watch(() => props.activeInternalId, (val) => {
  if (val && val !== activeInternalTab.value) {
    activeInternalTab.value = val;
    internalTabHistory.set(activeId.value, val);
  }
});

const handleInternalTabClick = (id) => {
  activeInternalTab.value = id;
  internalTabHistory.set(activeId.value, id); // persistir elección por sheet
  emit("update:internal", id);
  
  // Feedback sutil del cambio de vista
  const lbl = id.toLowerCase().includes('neg') ? 'Negativos (-)' : id.toLowerCase().includes('pos') ? 'Positivos (+)' : id;
  labToast.info(`Vista: ${lbl}`, 1500);
};

/* ===================== Helpers ===================== */
const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const actorRef = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  return src && (src.id || src.userId) ? { userId: src.id || src.userId, name: src.name } : null;
});

const handleSheetCreated = ({ result, tabs }) => {
  const newTab = normalizeSheet({ ...result, tabs });
  const addIndex = sheets.value.findIndex((x) => x.id === "nueva");
  sheets.value.splice(addIndex >= 0 ? addIndex : sheets.value.length, 0, newTab);
  setActiveTab(newTab.id);
  emit("crear", { result, tabs });
};

const setActiveTab = (id) => {
  emit("update:active", id);
};

const handleReorder = ({ oldIndex, newIndex }) => {
  const moved = sheets.value.splice(oldIndex, 1)[0];
  sheets.value.splice(newIndex, 0, moved);
  emit("reorder", { oldIndex, newIndex });
};

/* ===================== Modal acciones ===================== */
const isActionsOpen = ref(false);
const selectedSheet = ref(null);

/* ===== Compra (editar) ===== */
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

const resetPurchaseStatus = () => {
  purchaseStatus.value = "idle";
  purchaseStatusMessage.value = "";
  purchaseGlow.value = false;
};

const purchaseFechaCreacion = computed(() => {
  const d = selectedSheet.value?.fechaCreacion || selectedSheet.value?.createdAt || null;
  return d ? fmtDateOnly(d) : "";
});

const suppressEditAutoExpiry = ref(false);
watch(
  () => editFechaCompra.value,
  (v) => {
    if (suppressEditAutoExpiry.value) return;
    if (v && ISO_DATE_ONLY_RX.test(v)) {
      editFechaCaducidad.value = addMonthsToISODate(v, DEFAULT_EXPIRY_MONTHS);
    }
  }
);

const canSavePurchase = computed(() => {
  if (!selectedSheet.value || savingPurchase.value) return false;

  const curNum = String(selectedSheet.value?.numFactura || "");
  const curLote = String(selectedSheet.value?.loteProducto || "");
  const curCompra = selectedSheet.value?.fechaCompra ? fmtDateOnly(selectedSheet.value.fechaCompra) : "";
  const curCad = selectedSheet.value?.fechaCaducidad ? fmtDateOnly(selectedSheet.value.fechaCaducidad) : "";

  const curPV =
    selectedSheet.value?.precioVenta === null || selectedSheet.value?.precioVenta === undefined
      ? ""
      : String(selectedSheet.value.precioVenta);

  const curPC =
    selectedSheet.value?.precioCompra === null || selectedSheet.value?.precioCompra === undefined
      ? ""
      : String(selectedSheet.value.precioCompra);

  const nextNum = String(editNumFactura.value || "").trim();
  const nextLote = String(editLoteProducto.value || "").trim();
  const nextCompra = String(editFechaCompra.value || "").trim();
  const nextCad = String(editFechaCaducidad.value || "").trim();
  const nextPV = String(editPrecioVenta.value ?? "").trim();
  const nextPC = String(editPrecioCompra.value ?? "").trim();

  return nextNum !== curNum || nextLote !== curLote || nextCompra !== curCompra || nextCad !== curCad || nextPV !== curPV || nextPC !== curPC;
});

watch([editNumFactura, editLoteProducto, editFechaCompra, editFechaCaducidad, editPrecioVenta, editPrecioCompra], () => {
  if (!DEBUG_PURCHASE) return;
  console.log("[INV][UI] edit purchase changed", {
    editNumFactura: editNumFactura.value,
    editLoteProducto: editLoteProducto.value,
    editFechaCompra: editFechaCompra.value,
    editFechaCaducidad: editFechaCaducidad.value,
    editPrecioVenta: editPrecioVenta.value,
    editPrecioCompra: editPrecioCompra.value,
    canSavePurchase: canSavePurchase.value
  });
});

const confirmSavePurchase = async () => {
  if (!selectedSheet.value || savingPurchase.value) return;
  if (!canSavePurchase.value) return;

  savingPurchase.value = true;
  purchaseStatus.value = "saving";
  purchaseStatusMessage.value = "Sincronizando…";
  purchaseGlow.value = false;

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
    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);
    const idx = sheets.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

    editNumFactura.value = String(selectedSheet.value?.numFactura || "");
    editLoteProducto.value = String(selectedSheet.value?.loteProducto || "");
    editFechaCompra.value = selectedSheet.value?.fechaCompra ? fmtDateOnly(selectedSheet.value.fechaCompra) : "";
    editFechaCaducidad.value = selectedSheet.value?.fechaCaducidad ? fmtDateOnly(selectedSheet.value.fechaCaducidad) : "";
    editPrecioVenta.value =
      selectedSheet.value?.precioVenta === null || selectedSheet.value?.precioVenta === undefined
        ? ""
        : String(selectedSheet.value.precioVenta);
    editPrecioCompra.value =
      selectedSheet.value?.precioCompra === null || selectedSheet.value?.precioCompra === undefined
        ? ""
        : String(selectedSheet.value.precioCompra);

    purchaseStatus.value = "saved";
    purchaseStatusMessage.value = "Datos guardados";
    purchaseGlow.value = true;
    labToast.success("Datos de compra actualizados.");
    setTimeout(() => (purchaseGlow.value = false), 900);
    setTimeout(() => resetPurchaseStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] purchase save error:", e?.response?.data || e);
    purchaseStatus.value = "error";
    purchaseStatusMessage.value = errMsg(e, "No se pudo guardar");
    setTimeout(() => resetPurchaseStatus(), 2400);
  } finally {
    savingPurchase.value = false;
  }
};

/* ===== Vendor (editar proveedor/marca) ===== */
const editProveedorName = ref("");
const editMarcaName = ref("");

const savingVendor = ref(false);
const vendorStatus = ref("idle");
const vendorStatusMessage = ref("");
const vendorGlow = ref(false);

const resetVendorStatus = () => {
  vendorStatus.value = "idle";
  vendorStatusMessage.value = "";
  vendorGlow.value = false;
};

const filteredProveedorOptionsEdit = computed(() => {
  const q = normTxt(editProveedorName.value);
  const base = proveedorOptions.value;
  if (!q) return base.slice(0, 30);
  return base.filter((x) => normTxt(x).includes(q)).slice(0, 30);
});

const filteredMarcaOptionsEdit = computed(() => {
  const q = normTxt(editMarcaName.value);
  const base = marcaOptions.value;
  if (!q) return base.slice(0, 30);
  return base.filter((x) => normTxt(x).includes(q)).slice(0, 30);
});

const canSaveVendor = computed(() => {
  if (!selectedSheet.value || savingVendor.value) return false;

  const currentProv = String(selectedSheet.value?.proveedor?.name || "").trim();
  const currentMarca = String(selectedSheet.value?.marca?.name || "").trim();

  const nextProv = String(editProveedorName.value || "").trim();
  const nextMarca = String(editMarcaName.value || "").trim();

  return nextProv !== currentProv || nextMarca !== currentMarca;
});

const confirmSaveVendor = async () => {
  if (!selectedSheet.value || savingVendor.value) return;
  if (!canSaveVendor.value) return;

  savingVendor.value = true;
  vendorStatus.value = "saving";
  vendorStatusMessage.value = "Sincronizando…";
  vendorGlow.value = false;

  try {
    const id = selectedSheet.value.id;

    const payload = {
      proveedor: { id: null, name: String(editProveedorName.value || "").trim() },
      marca: { id: null, name: String(editMarcaName.value || "").trim() },
      actor: actorRef.value || undefined
    };

    const { data } = await updateSheet(id, payload);
    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);
    const idx = sheets.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

    editProveedorName.value = String(selectedSheet.value?.proveedor?.name || "");
    editMarcaName.value = String(selectedSheet.value?.marca?.name || "");

    vendorStatus.value = "saved";
    vendorStatusMessage.value = "Proveedor/marca actualizados";
    vendorGlow.value = true;
    labToast.success("Proveedor y marca actualizados.");
    setTimeout(() => (vendorGlow.value = false), 900);
    setTimeout(() => resetVendorStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] vendor save error:", e?.response?.data || e);
    vendorStatus.value = "error";
    vendorStatusMessage.value = errMsg(e, "No se pudo guardar proveedor/marca");
    setTimeout(() => resetVendorStatus(), 2400);
  } finally {
    savingVendor.value = false;
  }
};

/* ===== Rename ===== */
const renameName = ref("");
const renaming = ref(false);
const renameStatus = ref("idle");
const renameStatusMessage = ref("");
const renameGlow = ref(false);

const resetRenameStatus = () => {
  renameStatus.value = "idle";
  renameStatusMessage.value = "";
  renameGlow.value = false;
};

const canRename = computed(() => {
  if (!selectedSheet.value || renaming.value) return false;
  const current = String(selectedSheet.value?.name || "").trim();
  const next = String(renameName.value || "").trim();
  return next.length > 0 && next !== current;
});

const confirmRename = async () => {
  if (!selectedSheet.value || renaming.value) return;
  if (!canRename.value) return;

  renaming.value = true;
  renameStatus.value = "saving";
  renameStatusMessage.value = "Guardando…";
  renameGlow.value = false;

  try {
    const id = selectedSheet.value.id;
    const payload = { nombre: String(renameName.value || "").trim(), actor: actorRef.value || undefined };

    const { data } = await updateSheet(id, payload);
    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);
    const idx = sheets.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

    renameName.value = String(selectedSheet.value?.name || "");

    renameStatus.value = "saved";
    renameStatusMessage.value = "Nombre actualizado";
    renameGlow.value = true;
    labToast.success("Planilla renombrada.");
    emit("renamed", { id, name: renameName.value });
    setTimeout(() => (renameGlow.value = false), 900);
    setTimeout(() => resetRenameStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] rename error:", e?.response?.data || e);
    renameStatus.value = "error";
    renameStatusMessage.value = errMsg(e, "No se pudo renombrar");
    setTimeout(() => resetRenameStatus(), 2400);
  } finally {
    renaming.value = false;
  }
};

/* ===== Meta ===== */
const metaForm = ref({ observaciones: "", notas: "" });
const savingMeta = ref(false);
const metaStatus = ref("idle");
const metaStatusMessage = ref("");
const metaGlow = ref(false);

const resetMetaStatus = () => {
  metaStatus.value = "idle";
  metaStatusMessage.value = "";
  metaGlow.value = false;
};

const loadMetaFromSheet = (sheet) => {
  const meta = sheet?.meta || {};
  metaForm.value = { observaciones: meta.observaciones || "", notas: meta.notas || "" };
  resetMetaStatus();
};

const canSaveMeta = computed(() => !!selectedSheet.value && !savingMeta.value);

const confirmSaveMeta = async () => {
  if (!selectedSheet.value || savingMeta.value) return;

  savingMeta.value = true;
  metaStatus.value = "saving";
  metaStatusMessage.value = "Sincronizando…";
  metaGlow.value = false;

  try {
    const id = selectedSheet.value.id;
    const payload = {
      meta: {
        observaciones: String(metaForm.value?.observaciones || ""),
        notas: String(metaForm.value?.notas || "")
      },
      actor: actorRef.value || undefined
    };

    const { data } = await updateSheet(id, payload);
    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet;
    const tabs = data?.data?.tabs;
    if (!updated) throw new Error("Respuesta inválida: falta data.sheet");

    const norm = normalizeSheet(updated);
    const idx = sheets.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? sheets.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) sheets.value[idx] = normalizeSheet({ ...sheets.value[idx], ...norm, tabs: newTabs });
    selectedSheet.value = normalizeSheet({ ...selectedSheet.value, ...norm, tabs: newTabs });

    loadMetaFromSheet(selectedSheet.value);

    metaStatus.value = "saved";
    metaStatusMessage.value = "Notas guardadas";
    metaGlow.value = true;
    labToast.success("Notas y observaciones guardadas.");
    setTimeout(() => (metaGlow.value = false), 900);
    setTimeout(() => resetMetaStatus(), 1800);
  } catch (e) {
    console.error("[INV][UI] meta save error:", e?.response?.data || e);
    metaStatus.value = "error";
    metaStatusMessage.value = errMsg(e, "No se pudo guardar");
    setTimeout(() => resetMetaStatus(), 2400);
  } finally {
    savingMeta.value = false;
  }
};

/* ===== Trash ===== */
const deleting = ref(false);
const trashStatus = ref("idle");
const trashStatusMessage = ref("");

const resetTrashStatus = () => {
  trashStatus.value = "idle";
  trashStatusMessage.value = "";
};

const softDelete = async () => {
  if (!selectedSheet.value || deleting.value) return;

  deleting.value = true;
  trashStatus.value = "saving";
  trashStatusMessage.value = "Enviando a papelera…";

  try {
    const id = selectedSheet.value.id;
    const { data } = await moveSheetToTrash(id, actorRef.value || undefined);

    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet || data?.data || null;

    const idx = sheets.value.findIndex((s) => s.id === id);
    if (idx >= 0) sheets.value.splice(idx, 1);

    trashStatus.value = "saved";
    trashStatusMessage.value = "Enviada a papelera";
    labToast.danger(`Planilla "${selectedSheet.value?.name}" enviada a papelera.`, 4000);
    emit("deleted", { id, sheet: updated });

    isActionsOpen.value = false;

    if (activeId.value === id) emit("update:active", "nueva");

    setTimeout(() => resetTrashStatus(), 1500);
  } catch (e) {
    console.error("[INV][UI] trash error:", e?.response?.data || e);
    trashStatus.value = "error";
    trashStatusMessage.value = errMsg(e, "No se pudo enviar a papelera");
    setTimeout(() => resetTrashStatus(), 2400);
  } finally {
    deleting.value = false;
  }
};


/* ===================== openActions / openSheet / tabs click ===================== */
const openActions = async (sheet) => {
  selectedSheet.value = normalizeSheet(sheet);

  if (DEBUG_PURCHASE) {
    console.groupCollapsed("[INV][UI] openActions selectedSheet");
    console.log("keys:", selectedSheet.value ? Object.keys(selectedSheet.value) : []);
    console.log("purchase:", {
      numFactura: selectedSheet.value?.numFactura,
      loteProducto: selectedSheet.value?.loteProducto,
      fechaCompra: selectedSheet.value?.fechaCompra,
      fechaCaducidad: selectedSheet.value?.fechaCaducidad,
      precioVenta: selectedSheet.value?.precioVenta
    });
    console.groupEnd();
  }

  resetPurchaseStatus();
  resetVendorStatus();
  resetRenameStatus();
  resetMetaStatus();
  resetTrashStatus();

  renameName.value = String(selectedSheet.value?.name || "");
  loadMetaFromSheet(selectedSheet.value);

  editProveedorName.value = String(selectedSheet.value?.proveedor?.name || "");
  editMarcaName.value = String(selectedSheet.value?.marca?.name || "");

  suppressEditAutoExpiry.value = true;

  editNumFactura.value = String(selectedSheet.value?.numFactura || "");
  editLoteProducto.value = String(selectedSheet.value?.loteProducto || "");
  editFechaCompra.value = selectedSheet.value?.fechaCompra ? fmtDateOnly(selectedSheet.value.fechaCompra) : "";
  editFechaCaducidad.value = selectedSheet.value?.fechaCaducidad ? fmtDateOnly(selectedSheet.value.fechaCaducidad) : "";

  editPrecioVenta.value =
    selectedSheet.value?.precioVenta === null || selectedSheet.value?.precioVenta === undefined
      ? ""
      : String(selectedSheet.value.precioVenta);

  editPrecioCompra.value =
    selectedSheet.value?.precioCompra === null || selectedSheet.value?.precioCompra === undefined
      ? ""
      : String(selectedSheet.value.precioCompra);

  if (!editFechaCaducidad.value && editFechaCompra.value) {
    editFechaCaducidad.value = addMonthsToISODate(editFechaCompra.value, DEFAULT_EXPIRY_MONTHS);
  }

  isActionsOpen.value = true;
  await nextTick();
  suppressEditAutoExpiry.value = false;
};

const openSheet = () => {
  if (!selectedSheet.value) return;
  emit("update:active", selectedSheet.value.id);
  isActionsOpen.value = false;
};

const handleTabClick = (id) => {
  if (props.loadingTabs) return;
  emit("update:active", id);
};

</script>

<style scoped>
/* Contenedor principal de planillas (diseño original de 1 sola columna) */
.plantillas-contenedor {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  min-height: 140px;
  box-shadow: var(--shadow-lg);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  overflow: hidden;
}

</style>