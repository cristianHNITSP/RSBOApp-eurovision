<!-- rsbo-app/src/components/tabsmanager/actions/ActionDelete.vue -->
<template>
  <div class="action-card danger">
    <div class="action-icon danger"><i class="far fa-trash-alt"></i></div>
    <div class="action-content">
      <div class="action-title">Eliminar planilla</div>
      <div class="action-desc">Esta acción es irreversible. Se eliminarán todos los inventarios asociados.</div>
      <div class="mt-3">
        <div v-if="!showConfirm">
          <b-button type="is-danger" outlined size="is-small" :disabled="disabled" @click="showConfirm = true">
            Eliminar...
          </b-button>
        </div>
        <div v-else class="confirm-inline">
          <span class="has-text-weight-bold has-text-danger is-size-7">¿Confirmas?</span>
          <b-button type="is-danger" size="is-small" :loading="loading" @click="$emit('confirm')">
            SÍ, ELIMINAR
          </b-button>
          <b-button type="is-ghost" size="is-small" :disabled="loading" @click="showConfirm = false">
            Cancelar
          </b-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
defineProps({
  loading:  { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
});
defineEmits(["confirm"]);
const showConfirm = ref(false);
</script>
