<!-- rsbo-app/src/components/tabsmanager/CreateSheetForm.vue -->
<template>
  <div class="box">
    <form @submit.prevent="handleCrear">
      <VendorPicker
        v-model:proveedor="newProveedorName"
        v-model:marca="newMarcaName"
        :filtered-proveedores="filteredProveedorOptions"
        :filtered-marcas="filteredMarcaOptions"
        :disabled="creatingSheet"
      />

      <CatalogSelector
        :catalog-bases="catalog?.bases"
        :selected-base="selectedBase"
        :selected-material="selectedMaterial"
        :selected-tratamiento-key="selectedTratamientoKey"
        :selected-variante="selectedVariante"
        :material-required="materialRequired"
        :show-tratamiento="showTratamiento"
        :all-materials="allMaterials"
        :allowed-tratamientos="allowedTratamientos"
        :variante-options="varianteOptions"
        :is-material-allowed="isMaterialAllowed"
        :has-any-allowed-material="hasAnyAllowedMaterial"
        :base-label="baseLabel"
        @select-base="selectBase"
        @select-material="selectMaterial"
        @select-tratamiento="selectTratamiento"
        @select-variante="selectVariante"
      />

      <div class="action-card mt-4">
        <div class="action-icon"><i class="far fa-receipt"></i></div>
        <div class="action-content">
          <div class="action-title">Datos de compra (opcional)</div>
          <div class="action-desc">
            Al elegir <b>Fecha de compra</b>, la <b>Caducidad</b> se calcula automáticamente a {{ DEFAULT_EXPIRY_MONTHS }} meses.
            Puedes editarla después.
          </div>
          <div class="mt-2">
            <PurchaseFields
              v-model:precioVenta="newPrecioVenta"
              v-model:precioCompra="newPrecioCompra"
              v-model:numFactura="newNumFactura"
              v-model:loteProducto="newLoteProducto"
              v-model:fechaCompra="newFechaCompra"
              v-model:fechaCaducidad="newFechaCaducidad"
              :disabled="creatingSheet"
            />
          </div>
        </div>
      </div>

      <b-field label="Nombre generado automáticamente">
        <b-input :value="newSheetName" disabled expanded />
      </b-field>

      <div class="create-actions">
        <b-button type="is-primary" native-type="submit" size="is-small" :disabled="!canCreate || creatingSheet"
          :loading="creatingSheet">
          <span v-if="!creatingSheet">Crear Planilla</span>
          <span v-else>Creando…</span>
        </b-button>

        <div class="create-status">
          <StatusPill :status="createStatus" :message="createStatusMessage" />
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, watch, toRefs } from "vue";
import VendorPicker from "./VendorPicker.vue";
import CatalogSelector from "./CatalogSelector.vue";
import PurchaseFields from "./PurchaseFields.vue";
import StatusPill from "./shared/StatusPill.vue";

import { useCatalogSelection } from "../../composables/tabsmanager/useCatalogSelection";
import { useVendorAutocomplete } from "../../composables/tabsmanager/useVendorAutocomplete";
import { useCreateSheet } from "../../composables/tabsmanager/useCreateSheet";
import { useWorkspaceTabs } from "../../composables/tabsmanager/useWorkspaceTabs";
import { DEFAULT_EXPIRY_MONTHS, ISO_DATE_ONLY_RX, addMonthsToISODate } from "../../composables/tabsmanager/useDateHelpers";
import { composeTratamientoDisplay } from "../../composables/tabsmanager/useSheetNormalizer";

const props = defineProps({
  catalog:          { type: Object,  required: true },
  materialRequired: { type: Boolean, default: true },
  showTratamiento:  { type: Boolean, default: true },
  sheets:           { type: Array,   required: true },
  catalogBasesMap:  { type: Object,  required: true },
  catalogTreatmentsMap: { type: Object, required: true },
  createSheet:      { type: Function, required: true },
  actorRef:         { type: Object,  default: null }
});

const emit = defineEmits(["crear", "update:active"]);

const { materialRequired: matReqRef, showTratamiento: showTratRef, sheets: sheetsProp } = toRefs(props);

// 1. Selección de catálogo
const selection = useCatalogSelection({
  catalogBasesMap: computed(() => props.catalogBasesMap),
  catalogTreatmentsMap: computed(() => props.catalogTreatmentsMap),
  materialRequired: matReqRef,
  showTratamiento: showTratRef
});

const {
  selectedBase, selectedMaterial, selectedTratamientoKey, selectedVariante,
  allMaterials, isMaterialAllowed, hasAnyAllowedMaterial, allowedTratamientos,
  selectBase, selectMaterial, selectTratamiento, selectVariante,
  varianteOptions, baseLabel
} = selection;

// 2. Autocomplete de proveedores
const { proveedorOptions, marcaOptions, createFilteredOptions } = useVendorAutocomplete(computed(() => props.sheets));

// 3. Lógica de creación
const createLogic = useCreateSheet({
  createSheet: props.createSheet,
  catalogBasesMap: computed(() => props.catalogBasesMap),
  catalogTreatmentsMap: computed(() => props.catalogTreatmentsMap),
  sheets: computed(() => props.sheets),
  props,
  emit,
  actorRef: toRefs(props).actorRef,
  selection
});

const {
  newProveedorName, newMarcaName, newPrecioVenta, newPrecioCompra,
  newNumFactura, newLoteProducto, newFechaCompra, newFechaCaducidad,
  newSheetName, creatingSheet, createStatus, createStatusMessage,
  handleCrear
} = createLogic;

const filteredProveedorOptions = createFilteredOptions(newProveedorName, proveedorOptions);
const filteredMarcaOptions = createFilteredOptions(newMarcaName, marcaOptions);

// Watchers de UI local
watch(
  () => newFechaCompra.value,
  (v) => {
    if (v && ISO_DATE_ONLY_RX.test(v)) {
      newFechaCaducidad.value = addMonthsToISODate(v, DEFAULT_EXPIRY_MONTHS);
    }
  }
);

watch([selectedBase, selectedMaterial, selectedTratamientoKey, selectedVariante], () => {
  const baseCfg = selectedBase.value && props.catalogBasesMap[selectedBase.value];
  const baseLabelTxt = baseCfg ? baseCfg.label : "";
  const materialLabel = props.materialRequired ? (selectedMaterial.value || "") : (selectedMaterial.value || "");
  const tKey = props.showTratamiento ? selectedTratamientoKey.value : null;
  const tLabel = tKey ? (props.catalogTreatmentsMap[tKey]?.label || tKey) : "";
  const nameTrat = composeTratamientoDisplay(tLabel, selectedVariante.value || "");
  newSheetName.value = [baseLabelTxt, materialLabel, nameTrat].filter(Boolean).join(" | ");
});

const canCreate = computed(() => {
  if (!selectedBase.value) return false;
  if (props.materialRequired && !selectedMaterial.value) return false;
  if (props.showTratamiento && !selectedTratamientoKey.value) return false;
  if (!newSheetName.value) return false;
  if (creatingSheet.value) return false;
  if (varianteOptions.value.length > 0 && !String(selectedVariante.value || "").trim()) return false;
  
  const pv = String(newPrecioVenta.value ?? "").trim();
  if (!pv || !Number.isFinite(Number(pv)) || Number(pv) < 0) return false;
  
  const pc = String(newPrecioCompra.value ?? "").trim();
  if (!pc || !Number.isFinite(Number(pc)) || Number(pc) < 0) return false;
  
  return true;
});
</script>

<style scoped src="./CreateSheetForm.css"></style>
