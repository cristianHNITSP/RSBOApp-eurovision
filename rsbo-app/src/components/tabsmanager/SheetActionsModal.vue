<!-- rsbo-app/src/components/tabsmanager/SheetActionsModal.vue -->
<template>
  <teleport to="body">
    <b-modal v-model="localIsOpen" has-modal-card trap-focus :destroy-on-hide="true" :can-cancel="['escape']"
      scroll="keep" aria-role="dialog" aria-modal class="rsbo-sheet-actions-modal">
      <div class="modal-card glass-modal-card glass-modal-card--wide">
        <header class="modal-card-head glass-modal-head">
          <b-icon icon="cog" type="is-primary" size="is-small" class="mr-2" />
          <p class="modal-card-title">Acciones de Planilla</p>
          <button type="button" class="delete is-small ml-auto" @click="$emit('close')" />
        </header>

        <section class="modal-card-body glass-modal-body rsbo-actions-body">
          <div v-if="sheet">
            <!-- SUMMARY HEADER (Moved from modal header for better layout) -->
            <div class="sheet-summary-banner mb-5">
              <div class="summary-top">
                <span class="summary-name">{{ sheet.name }}</span>
                <span class="summary-sku" v-if="sheet.sku">SKU: {{ sheet.sku }}</span>
              </div>
              <div class="summary-details mt-2">
                <div class="pill" v-if="sheet.tipo_matriz">
                  <i class="fas fa-layer-group"></i> {{ tipoHuman(sheet.tipo_matriz) }}
                </div>
                <div class="pill" v-if="sheet.material">
                  <i class="fas fa-microchip"></i> {{ sheet.material }}
                </div>
                <div class="pill" v-if="displayTratamiento(sheet)">
                  <i class="fas fa-sparkles"></i> {{ displayTratamiento(sheet) }}
                </div>
                <div class="pill" v-if="sheet.fechaCaducidad">
                  <i class="fas fa-hourglass-end"></i> Caduca: {{ fmtDateOnly(sheet.fechaCaducidad) }}
                </div>
                <div class="pill">
                  <i class="fas fa-calendar-alt"></i> Creada: {{ createdDate }}
                </div>
              </div>
            </div>

            <!-- SKU INFO READ-ONLY -->
            <b-field label="SKU de planilla" v-if="sheet.sku" class="mb-5">
              <b-input :value="sheet.sku" disabled icon="barcode" />
            </b-field>

            <!-- OPEN -->
            <ActionOpenSheet @open="$emit('open')" />

            <!-- RENAME -->
            <ActionRename :model-value="renameName" @update:model-value="$emit('update:rename-name', $event)"
              :loading="renaming" :status="renameStatus" :message="renameStatusMessage" :glow="renameGlow"
              :can-save="canRename" @save="$emit('save-rename')" />

            <!-- VENDOR -->
            <ActionVendorEdit :proveedor="editProveedorName"
              @update:proveedor="$emit('update:edit-proveedor-name', $event)" :marca="editMarcaName"
              @update:marca="$emit('update:edit-marca-name', $event)" :filtered-proveedores="filteredProveedores"
              :filtered-marcas="filteredMarcas" :loading="savingVendor" :status="vendorStatus"
              :message="vendorStatusMessage" :glow="vendorGlow" :can-save="canSaveVendor"
              @save="$emit('save-vendor')" />

            <!-- PURCHASE -->
            <ActionPurchaseEdit :precioVenta="editPrecioVenta"
              @update:precioVenta="$emit('update:edit-precio-venta', $event)" :precioCompra="editPrecioCompra"
              @update:precioCompra="$emit('update:edit-precio-compra', $event)" :numFactura="editNumFactura"
              @update:numFactura="$emit('update:edit-num-factura', $event)" :loteProducto="editLoteProducto"
              @update:loteProducto="$emit('update:edit-lote-producto', $event)" :fechaCompra="editFechaCompra"
              @update:fechaCompra="$emit('update:edit-fecha-compra', $event)" :fechaCaducidad="editFechaCaducidad"
              @update:fechaCaducidad="$emit('update:edit-fecha-caducidad', $event)" :loading="savingPurchase"
              :status="purchaseStatus" :message="purchaseStatusMessage" :glow="purchaseGlow" :can-save="canSavePurchase"
              @save="$emit('save-purchase')" />

            <!-- META NOTES -->
            <ActionMetaNotes :observaciones="observaciones"
              @update:observaciones="$emit('update:observaciones', $event)" :notas="notas"
              @update:notas="$emit('update:notas', $event)" :loading="savingMeta" :status="metaStatus"
              :message="metaStatusMessage" :glow="metaGlow" :can-save="canSaveMeta" @save="$emit('save-meta')" />

            <!-- DELETE -->
            <ActionDelete 
              :loading="deleting" 
              :disabled="renaming || savingVendor || savingPurchase || savingMeta || (sheet && sheet.isPinned)"
              :is-pinned="sheet && sheet.isPinned"
              @confirm="$emit('confirm-delete')" 
            />
          </div>
        </section>

        <footer class="modal-card-foot glass-modal-foot">
          <b-button label="Cerrar" @click="$emit('close')" />
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import { computed } from "vue";
import ActionOpenSheet from "./actions/ActionOpenSheet.vue";
import ActionRename from "./actions/ActionRename.vue";
import ActionVendorEdit from "./actions/ActionVendorEdit.vue";
import ActionPurchaseEdit from "./actions/ActionPurchaseEdit.vue";
import ActionMetaNotes from "./actions/ActionMetaNotes.vue";
import ActionDelete from "./actions/ActionDelete.vue";

import { tipoHuman, displayTratamiento } from "../../composables/tabsmanager/useSheetNormalizer";
import { fmtDateOnly } from "../../composables/tabsmanager/useDateHelpers";

const emit = defineEmits([
  "update:isOpen", "close", "open",
  "update:rename-name", "save-rename",
  "update:edit-proveedor-name", "update:edit-marca-name", "save-vendor",
  "update:edit-precio-venta", "update:edit-precio-compra", "update:edit-num-factura", "update:edit-lote-producto", "update:edit-fecha-compra", "update:edit-fecha-caducidad", "save-purchase",
  "update:observaciones", "update:notas", "save-meta",
  "confirm-delete"
]);

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  sheet: { type: Object, default: null },
  createdDate: { type: String, default: "" },

  // Rename
  renameName: String, renaming: Boolean, renameStatus: String, renameStatusMessage: String, renameGlow: Boolean, canRename: Boolean,

  // Vendor
  editProveedorName: String, editMarcaName: String, filteredProveedores: Array, filteredMarcas: Array,
  savingVendor: Boolean, vendorStatus: String, vendorStatusMessage: String, vendorGlow: Boolean, canSaveVendor: Boolean,

  // Purchase
  editPrecioVenta: [String, Number], editPrecioCompra: [String, Number], editNumFactura: String, editLoteProducto: String,
  editFechaCompra: String, editFechaCaducidad: String, savingPurchase: Boolean, purchaseStatus: String,
  purchaseStatusMessage: String, purchaseGlow: Boolean, canSavePurchase: Boolean,

  // Meta
  observaciones: String, notas: String, savingMeta: Boolean, metaStatus: String, metaStatusMessage: String, metaGlow: Boolean, canSaveMeta: Boolean,

  // Delete
  deleting: Boolean
});

const localIsOpen = computed({
  get: () => props.isOpen,
  set: (v) => emit("update:isOpen", v)
});
</script>

<style scoped src="./SheetActionsModal.css"></style>
