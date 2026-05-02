<!-- src/components/TabsManager.vue -->
<template>
  <div>
    <!-- TABS -->
    <TabsBar
      :sheets="activeTabs"
      :active-id="activeId"
      :loading-tabs="loadingTabs"
      :has-more="hasMore"
      :has-prior="hasPrior"
      :loading-more="loadingMore"
      :loading-prior="loadingPrior"
      :prior-count="priorCount"
      :api-type="apiType"
      :actor="actor"
      @tab-click="handleTabClick"
      @open-template="openTemplate"
      @open-actions="openActions"
      @load-more="$emit('load-more')"
      @load-prior="$emit('load-prior')"
      @reorder="handleReorder"
      @close-tab="closeTab"
      @toggle-pin="handleTogglePin"
    />

    <!-- CONTENIDO (Mount-once with v-show pattern) -->
    <div class="plantillas-contenedor">
      <!-- NUEVA (always mounted, shown when active) -->
      <div
        v-show="activeId === 'nueva'"
        class="plantillas-contenedor"
      >
        <CreateSheetForm
          :catalog="catalog"
          :material-required="materialRequired"
          :show-tratamiento="showTratamiento"
          :sheets="activeTabs"
          :catalog-bases-map="catalogBasesMap"
          :catalog-treatments-map="catalogTreatmentsMap"
          :create-sheet="createSheet"
          :actor-ref="actorRef"
          @crear="handleSheetCreated"
          @update:active="setActiveTab"
        />
      </div>

      <!-- EXISTENTES (mount-once, v-show) -->
      <div
        v-for="tab in activeTabs"
        :key="tab.id"
        v-show="tab.id !== 'nueva' && tab.id === activeIdStore"
        class="tab-pane"
      >
        <SheetContent
          v-if="tab.id !== 'nueva' && mountedTabIds.has(tab.id)"
          :sheet="tab"
          :active-internal="getInternalTabFor(tab.id)"
          :actor="props.actor"
          :api-type="props.apiType"
          @update:internal="handleInternalTabClick"
        />
      </div>

      <!-- TABS INTERNAS (global, shown with active sheet) -->
      <InternalTabs
        v-if="internalTabs.length && activeId !== 'nueva'"
        :tabs="internalTabs"
        :active-tab-id="activeInternalTab"
        @select="handleInternalTabClick"
      />
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

    <!-- MODAL LÍMITE (Nuevo) -->
    <TabLimitWarningModal :api-type="apiType" />
  </div>
</template>

<script setup>
// New Sub-components
import TabsBar from "./tabsmanager/TabsBar.vue";
import CreateSheetForm from "./tabsmanager/CreateSheetForm.vue";
import SheetContent from "./tabsmanager/SheetContent.vue";
import SheetActionsModal from "./tabsmanager/SheetActionsModal.vue";
import InternalTabs from "./tabsmanager/InternalTabs.vue";
import TabLimitWarningModal from "./tabsmanager/TabLimitWarningModal.vue";

// New Composables
import { normalizeSheet } from "@/composables/tabsmanager/useSheetNormalizer";
import { 
  ISO_DATE_ONLY_RX, 
  DEFAULT_EXPIRY_MONTHS, 
  fmtDateOnly, 
  addMonthsToISODate,
  dateForEdit,
  numForEdit
} from "../composables/tabsmanager/useDateHelpers";

import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, reactive } from "vue";
import { useSheetApi } from "@/composables/api/useSheetApi";
import { labToast } from "@/composables/shared/useLabToast.js";
import { useWorkspaceTabs } from "@/composables/tabsmanager/useWorkspaceTabs";

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

const emit = defineEmits(["update:active", "reorder", "crear", "update:internal", "deleted", "renamed", "load-more", "load-prior"]);

const { getSheet, createSheet, updateSheet, moveSheetToTrash } = useSheetApi(() => props.apiType);

const { 
  activeTabs, 
  activeId: activeIdStore, 
  openTemplate,
  reorderTabs, 
  setActiveTab: setActiveTabStore,
  closeTab: closeTabStore,
  togglePinTab,
  removeRecentTemplate
} = useWorkspaceTabs(props.apiType);

const mountedTabIds = reactive(new Set());

watch(activeIdStore, (id) => {
  if (id && id !== 'nueva') {
    mountedTabIds.add(id);
  }
  // Sync store state to parent without re-triggering loops
  if (id !== props.activeId) {
    emit("update:active", id);
  }
}, { immediate: true });

const closeTab = (id) => {
  const tab = activeTabs.value.find(t => t.id === id);
  if (tab?.isPinned) {
    labToast.info("Desfija la pestaña para poder cerrarla.");
    return;
  }

  closeTabStore(id);
  mountedTabIds.delete(id);
};

const handleTogglePin = (id) => {
  togglePinTab(id);
};

// Sincronizar sheets iniciales con el store al montar
onMounted(() => {
  if (Array.isArray(props.initialSheets) && activeTabs.value.length === 0) {
    activeTabs.value = props.initialSheets.map(s => ({
      ...normalizeSheet(s),
      isPinned: false
    }));
  }
  if (props.activeId && props.activeId !== activeIdStore.value) {
    activeIdStore.value = props.activeId;
  }
  window.addEventListener("sheet-deleted-externally", handleExternalDelete);
  window.addEventListener("recent-template-cleanup", handleRecentCleanup);
});

onBeforeUnmount(() => {
  window.removeEventListener("sheet-deleted-externally", handleExternalDelete);
  window.removeEventListener("recent-template-cleanup", handleRecentCleanup);
});

const handleExternalDelete = (e) => {
  const { sheetId } = e.detail;
  
  // Bloqueo de colisión: si YO estoy borrando esta planilla, ignoro el evento externo
  // para evitar cerrar la pestaña prematuramente y causar errores de estado
  if (deleting.value && selectedSheet.value?.id === sheetId) {
    console.log(`[TabsManager] Ignorando evento externo de borrado para ${sheetId} (borrado local en curso)`);
    return;
  }

  const idx = activeTabs.value.findIndex(t => t.id === sheetId);
  if (idx >= 0) {
    console.log(`[TabsManager] Closing tab ${sheetId} because it was deleted externally.`);
    closeTab(sheetId);
    removeRecentTemplate(sheetId);
    if (activeIdStore.value === sheetId) {
      emit("update:active", "nueva");
    }
  } else {
    // Si no está abierta como pestaña, igual la quitamos de recientes
    removeRecentTemplate(sheetId);
  }
};

const handleRecentCleanup = (e) => {
  const { sheetId } = e.detail;
  removeRecentTemplate(sheetId);
};

watch(() => props.activeId, (newId) => {
  if (newId && newId !== activeIdStore.value) {
    activeIdStore.value = newId;
  }
});

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

/* ===== Tabs (Sincronizado con Store) ===== */

/* ===================== Autocomplete Proveedor/Marca ===================== */
const normTxt = (s) =>
  String(s || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const uniqueNamesFromSheets = (getter) => {
  const set = new Map();
  for (const sh of activeTabs.value || []) {
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

const activeSheetObj = computed(() => activeTabs.value.find((s) => s.id === activeIdStore.value));

/* ===== Tabs internas ===== */
const activeInternalTab = ref(null);
/** Recuerda la última pestaña interna elegida por sheetId para sobrevivir al KeepAlive */
const internalTabHistory = reactive(new Map());

/** Devuelve la pestaña interna almacenada para un sheet específico (no la global compartida) */
const getInternalTabFor = (sheetId) => {
  const saved = internalTabHistory.get(sheetId);
  if (saved) return saved;

  // Determinar el default correcto para este sheet basándose en su tipo de matriz
  const tab = activeTabs.value.find(t => t.id === sheetId);
  const tipo = tab?.tipo_matriz;
  if (tipo === 'SPH_ADD' || tipo === 'SPH_CYL' || tipo === 'SPH_CYL_AXIS') return 'sph-neg';
  if (tipo === 'BASE' || tipo === 'BASE_ADD') return 'base-neg';
  return null;
};

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
    const sheetId = activeIdStore.value;
    if (!sheetId || sheetId === 'nueva') return;
    const saved   = internalTabHistory.get(sheetId);
    const first   = tabs[0]?.id ?? null;
    const valid   = saved && tabs.some(t => t.id === saved);
    const target  = valid ? saved : first;
    activeInternalTab.value = target;
    // Persistir en el Map para que getInternalTabFor lo devuelva a tabs inactivos
    if (target) internalTabHistory.set(sheetId, target);
    emit("update:internal", target);
  },
  { immediate: true }
);

watch(() => props.activeInternalId, (val) => {
  if (val && val !== activeInternalTab.value) {
    activeInternalTab.value = val;
    internalTabHistory.set(activeIdStore.value, val);
  }
});

const handleInternalTabClick = (id) => {
  activeInternalTab.value = id;
  internalTabHistory.set(activeIdStore.value, id); // persistir elección por sheet
  emit("update:internal", id);
};

/* ===================== Helpers ===================== */
const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const actorRef = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  return src && (src.id || src.userId) ? { userId: src.id || src.userId, name: src.name } : null;
});

const handleSheetCreated = ({ result, tabs }) => {
  openTemplate(result);
  emit("crear", { result, tabs });
};

const setActiveTab = (id, options = {}) => {
  setActiveTabStore(id, options);
  emit("update:active", id);
};

const handleReorder = ({ oldIndex, newIndex }) => {
  reorderTabs(oldIndex, newIndex);
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
    const idx = activeTabs.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? activeTabs.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) {
      activeTabs.value[idx] = { ...activeTabs.value[idx], ...norm, tabs: newTabs };
    }
    selectedSheet.value = { ...selectedSheet.value, ...norm, tabs: newTabs };

    _syncEditRefsFromSheet(selectedSheet.value);

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
    const idx = activeTabs.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? activeTabs.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) {
      activeTabs.value[idx] = { ...activeTabs.value[idx], ...norm, tabs: newTabs };
    }
    selectedSheet.value = { ...selectedSheet.value, ...norm, tabs: newTabs };

    _syncEditRefsFromSheet(selectedSheet.value);

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
    const idx = activeTabs.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? activeTabs.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) {
      activeTabs.value[idx] = { ...activeTabs.value[idx], ...norm, tabs: newTabs };
    }
    selectedSheet.value = { ...selectedSheet.value, ...norm, tabs: newTabs };

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
    const idx = activeTabs.value.findIndex((s) => s.id === id);
    const newTabs = tabs || (idx >= 0 ? activeTabs.value[idx].tabs : selectedSheet.value?.tabs || []);

    if (idx >= 0) activeTabs.value[idx] = normalizeSheet({ ...activeTabs.value[idx], ...norm, tabs: newTabs });
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

  // Bloqueo preventivo: no se puede eliminar si está fijada
  if (selectedSheet.value.isPinned) {
    labToast.warning("No se puede eliminar una planilla fijada. Desfíjala primero para poder enviarla a la papelera.");
    return;
  }

  deleting.value = true;
  trashStatus.value = "saving";
  trashStatusMessage.value = "Enviando a papelera…";

  try {
    const id = selectedSheet.value.id;
    const { data } = await moveSheetToTrash(id, actorRef.value || undefined);

    if (!data || data.ok === false) throw new Error(data?.message || "El servidor rechazó el cambio");

    const updated = data?.data?.sheet || data?.data || null;

    const idx = activeTabs.value.findIndex((s) => s.id === id);
    if (idx >= 0) {
      // Unpin if necessary to allow closure
      if (activeTabs.value[idx].isPinned) {
        togglePinTab(id);
      }
      closeTabStore(id);
      // Eliminar de recientes local inmediatamente
      await removeRecentTemplate(id);
    }

    trashStatus.value = "saved";
    trashStatusMessage.value = "Enviada a papelera";
    labToast.danger(`Planilla "${selectedSheet.value?.name}" enviada a papelera.`, 4000);
    emit("deleted", { id, sheet: updated });

    isActionsOpen.value = false;

    if (activeIdStore.value === id) emit("update:active", "nueva");

    setTimeout(() => resetTrashStatus(), 1500);
  } catch (e) {
    console.error("[INV][UI] trash error:", e?.response?.data || e);
    trashStatus.value = "error";
    trashStatusMessage.value = "No se pudo enviar a la papelera.";
    labToast.warning(trashStatusMessage.value);
    setTimeout(() => resetTrashStatus(), 2400);
  } finally {
    deleting.value = false;
  }
};


/* ===================== openActions / openSheet / tabs click ===================== */
const _syncEditRefsFromSheet = (s) => {
  if (!s) return;
  renameName.value = String(s.name || "");
  loadMetaFromSheet(s);

  editProveedorName.value = String(s.proveedor?.name || "");
  editMarcaName.value = String(s.marca?.name || "");

  suppressEditAutoExpiry.value = true;
  editNumFactura.value = String(s.numFactura || "");
  editLoteProducto.value = String(s.loteProducto || "");
  editFechaCompra.value = s.fechaCompra ? fmtDateOnly(s.fechaCompra) : "";
  editFechaCaducidad.value = s.fechaCaducidad ? fmtDateOnly(s.fechaCaducidad) : "";

  editPrecioVenta.value =
    s.precioVenta === null || s.precioVenta === undefined
      ? ""
      : String(s.precioVenta);

  editPrecioCompra.value =
    s.precioCompra === null || s.precioCompra === undefined
      ? ""
      : String(s.precioCompra);

  if (!editFechaCaducidad.value && editFechaCompra.value) {
    editFechaCaducidad.value = addMonthsToISODate(editFechaCompra.value, DEFAULT_EXPIRY_MONTHS);
  }
  
  nextTick(() => {
    suppressEditAutoExpiry.value = false;
  });
};

const openActions = async (sheet) => {
  // 1. Mostrar modal inmediatamente con lo que tengamos (SKU, nombre)
  selectedSheet.value = normalizeSheet(sheet);
  
  resetPurchaseStatus();
  resetVendorStatus();
  resetRenameStatus();
  resetMetaStatus();
  resetTrashStatus();

  _syncEditRefsFromSheet(selectedSheet.value);

  isActionsOpen.value = true;

  // 2. Cargar datos completos en segundo plano
  try {
    const { data } = await getSheet(selectedSheet.value.id);
    const full = data?.data?.sheet || data?.sheet || data;
    if (full) {
      selectedSheet.value = normalizeSheet(full);
      _syncEditRefsFromSheet(selectedSheet.value);
    }
  } catch (e) {
    console.error("[INV][UI] openActions fetch error:", e);
  }
};

const openSheet = () => {
  if (!selectedSheet.value) return;
  emit("update:active", selectedSheet.value.id);
  isActionsOpen.value = false;
};

const handleTabClick = (id) => {
  if (props.loadingTabs) return;
  setActiveTab(id, { sync: true, touch: true });
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
  display: flex;
  flex-direction: column;
}

.tab-pane {
  height: 600px; /* Matching the original design height */
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}


</style>