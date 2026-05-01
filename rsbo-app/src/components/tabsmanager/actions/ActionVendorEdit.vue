<!-- rsbo-app/src/components/tabsmanager/actions/ActionVendorEdit.vue -->
<template>
  <div class="action-box info p-5 mb-4" :class="{ 'action-glow-info': glow }">
    <article class="media is-responsive-action">
      <!-- Icono -->
      <div class="media-left">
        <div class="action-icon-circle icon-bg-info">
          <b-icon icon="truck" type="is-info" size="is-medium"></b-icon>
        </div>
      </div>

      <!-- Contenido -->
      <div class="media-content">
        <div class="content mb-3">
          <h4 class="action-title is-size-5 mb-1">Proveedor y Marca</h4>
          <p class="action-desc is-size-7">
            Actualiza el fabricante y distribuidor asociado a este inventario.
          </p>
        </div>

        <div class="action-form-grid">
          <b-field label="Proveedor" custom-class="is-small">
            <b-autocomplete
              :modelValue="proveedorName"
              @update:modelValue="$emit('update:proveedorName', $event)"
              :data="filteredProveedores"
              placeholder="Buscar proveedor…"
              open-on-focus
              :disabled="loading"
              size="is-small"
            />
          </b-field>

          <b-field label="Marca" custom-class="is-small">
            <b-autocomplete
              :modelValue="marcaName"
              @update:modelValue="$emit('update:marcaName', $event)"
              :data="filteredMarcas"
              placeholder="Buscar marca…"
              open-on-focus
              :disabled="loading"
              size="is-small"
            />
          </b-field>
        </div>

        <div class="is-flex is-align-items-center is-flex-wrap-wrap mt-4" style="gap: 1rem;">
          <b-button 
            type="is-info" 
            size="is-small" 
            icon-left="save"
            :loading="loading" 
            :disabled="!canSave || loading" 
            @click="$emit('save')"
          >
            Actualizar proveedor
          </b-button>
          <StatusPill :status="status" :message="message" />
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import StatusPill from "../shared/StatusPill.vue";

defineProps({
  proveedorName: String,
  marcaName: String,
  filteredProveedores: Array,
  filteredMarcas: Array,
  loading: Boolean,
  status: String,
  message: String,
  glow: Boolean,
  canSave: Boolean
});

defineEmits(["update:proveedorName", "update:marcaName", "save"]);
</script>

<style scoped src="./ActionCard.css"></style>
