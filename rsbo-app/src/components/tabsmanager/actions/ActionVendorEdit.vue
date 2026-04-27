<!-- rsbo-app/src/components/tabsmanager/actions/ActionVendorEdit.vue -->
<template>
  <div class="action-card" :class="{ 'vendor-glow': glow }">
    <div class="action-icon"><i class="far fa-industry"></i></div>
    <div class="action-content">
      <div class="action-title">Proveedor y Marca</div>
      <div class="action-desc">Actualiza los metadatos de origen.</div>
      <div class="mt-2">
        <VendorPicker
          :proveedor="proveedor"
          @update:proveedor="$emit('update:proveedor', $event)"
          :marca="marca"
          @update:marca="$emit('update:marca', $event)"
          :filtered-proveedores="filteredProveedores"
          :filtered-marcas="filteredMarcas"
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
            Sincronizar
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
import VendorPicker from "../VendorPicker.vue";
import StatusPill from "../shared/StatusPill.vue";

defineProps({
  proveedor:           { type: String,  required: true },
  marca:               { type: String,  required: true },
  filteredProveedores: { type: Array,   default: () => [] },
  filteredMarcas:      { type: Array,   default: () => [] },
  loading:             { type: Boolean, default: false },
  status:              { type: String,  default: "idle" },
  message:             { type: String,  default: "" },
  glow:                { type: Boolean, default: false },
  canSave:             { type: Boolean, default: false }
});

defineEmits(["update:proveedor", "update:marca", "save"]);
</script>
