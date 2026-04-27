<!-- rsbo-app/src/components/tabsmanager/actions/ActionPurchaseEdit.vue -->
<template>
  <div class="action-card" :class="{ 'meta-glow': glow }">
    <div class="action-icon"><i class="far fa-receipt"></i></div>
    <div class="action-content">
      <div class="action-title">Datos de compra</div>
      <div class="action-desc">Precios, facturación y fechas.</div>
      <div class="mt-2">
        <PurchaseFields
          :precioVenta="precioVenta"
          @update:precioVenta="$emit('update:precioVenta', $event)"
          :precioCompra="precioCompra"
          @update:precioCompra="$emit('update:precioCompra', $event)"
          :numFactura="numFactura"
          @update:numFactura="$emit('update:numFactura', $event)"
          :loteProducto="loteProducto"
          @update:loteProducto="$emit('update:loteProducto', $event)"
          :fechaCompra="fechaCompra"
          @update:fechaCompra="$emit('update:fechaCompra', $event)"
          :fechaCaducidad="fechaCaducidad"
          @update:fechaCaducidad="$emit('update:fechaCaducidad', $event)"
          :disabled="loading"
        />
        <div class="create-actions">
          <b-button
            type="is-primary"
            size="is-small"
            :loading="loading"
            :disabled="!canSave || loading"
            @click="$emit('save')"
          >
            Actualizar datos
          </b-button>
          <div class="create-status">
            <StatusPill :status="status" :message="message" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import PurchaseFields from "../PurchaseFields.vue";
import StatusPill from "../shared/StatusPill.vue";

defineProps({
  precioVenta:    { type: [String, Number], default: "" },
  precioCompra:   { type: [String, Number], default: "" },
  numFactura:     { type: String, default: "" },
  loteProducto:   { type: String, default: "" },
  fechaCompra:    { type: String, default: "" },
  fechaCaducidad: { type: String, default: "" },
  loading:        { type: Boolean, default: false },
  status:         { type: String,  default: "idle" },
  message:        { type: String,  default: "" },
  glow:           { type: Boolean, default: false },
  canSave:        { type: Boolean, default: false }
});

defineEmits([
  "update:precioVenta",
  "update:precioCompra",
  "update:numFactura",
  "update:loteProducto",
  "update:fechaCompra",
  "update:fechaCaducidad",
  "save"
]);
</script>
