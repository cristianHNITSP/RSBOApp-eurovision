<!-- rsbo-app/src/components/tabsmanager/actions/ActionPurchaseEdit.vue -->
<template>
  <div class="action-box info p-5 mb-4" :class="{ 'action-glow-info': glow }">
    <article class="media is-responsive-action">
      <!-- Icono -->
      <div class="media-left">
        <div class="action-icon-circle icon-bg-info">
          <b-icon icon="receipt" type="is-info" size="is-medium"></b-icon>
        </div>
      </div>

      <!-- Contenido -->
      <div class="media-content">
        <div class="content mb-4">
          <h4 class="action-title is-size-5 mb-1">Datos de compra</h4>
          <p class="action-desc is-size-7">
            Gestión de precios, facturación, lotes y fechas de caducidad.
          </p>
        </div>

        <!-- Formulario (Usamos grid responsivo) -->
        <div class="action-form-grid">
          <PurchaseFields 
            :precioVenta="precioVenta" @update:precioVenta="$emit('update:precioVenta', $event)"
            :precioCompra="precioCompra" @update:precioCompra="$emit('update:precioCompra', $event)"
            :numFactura="numFactura" @update:numFactura="$emit('update:numFactura', $event)" 
            :loteProducto="loteProducto" @update:loteProducto="$emit('update:loteProducto', $event)" 
            :fechaCompra="fechaCompra" @update:fechaCompra="$emit('update:fechaCompra', $event)" 
            :fechaCaducidad="fechaCaducidad" @update:fechaCaducidad="$emit('update:fechaCaducidad', $event)" 
            :disabled="loading" 
          />
        </div>

        <!-- Acciones -->
        <div class="is-flex is-align-items-center is-flex-wrap-wrap mt-4" style="gap: 1rem;">
          <b-button 
            type="is-info" 
            size="is-small" 
            icon-left="sync" 
            :loading="loading" 
            :disabled="!canSave || loading"
            @click="$emit('save')"
          >
            Actualizar datos
          </b-button>

          <StatusPill :status="status" :message="message" />
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import PurchaseFields from "../PurchaseFields.vue";
import StatusPill from "../shared/StatusPill.vue";

defineProps({
  precioVenta:     [String, Number],
  precioCompra:    [String, Number],
  numFactura:      String,
  loteProducto:    String,
  fechaCompra:     String,
  fechaCaducidad:  String,
  loading:         Boolean,
  status:          String,
  message:         String,
  glow:            Boolean,
  canSave:         Boolean
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

<style scoped src="./ActionCard.css"></style>