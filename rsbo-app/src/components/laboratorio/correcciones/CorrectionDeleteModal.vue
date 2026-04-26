<template>
  <teleport to="body">
    <b-modal v-model="visible" has-modal-card trap-focus :destroy-on-hide="true" aria-modal>
      <div class="modal-card" style="max-width: 440px; width: 100%">
        <header class="modal-card-head modal-head--danger">
          <p class="modal-card-title">
            <i class="fas fa-exclamation-triangle mr-2" style="color: var(--c-danger)"></i>
            Confirmar cancelación
          </p>
          <button class="delete" @click="visible = false"></button>
        </header>
        <section class="modal-card-body">
          <p>¿Cancelar el pedido <b class="mono">{{ folio }}</b>?</p>
          <p class="mt-2 muted" style="font-size: 0.85rem">
            Esta acción marcará el pedido como cancelado y devolverá el stock surtido al inventario. No se puede deshacer.
          </p>

          <b-field
            label="Motivo de la cancelación"
            class="mt-3"
            :type="motivo.trim().length > 0 ? 'is-success' : 'is-warning'"
            :message="motivo.trim().length === 0 ? 'Requerido: indica el motivo de la cancelación.' : `${motivo.trim().length}/400 caracteres.`"
          >
            <b-input
              v-model="motivo"
              type="textarea"
              rows="2"
              maxlength="400"
              placeholder="Ej: Cliente canceló el pedido, duplicado, error de captura…"
            />
          </b-field>
        </section>
        <footer class="modal-card-foot">
          <b-button @click="visible = false">No, cancelar</b-button>
          <b-button
            type="is-danger"
            icon-left="ban"
            :disabled="motivo.trim().length === 0"
            :loading="lab.loadingCancelOrder.value"
            @click="$emit('confirm', motivo)"
          >
            Sí, cancelar pedido
          </b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import { inject, ref, watch } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  folio: { type: String, default: "—" }
});

const emit = defineEmits(["update:modelValue", "confirm"]);

const lab = inject("lab");
const visible = ref(props.modelValue);
const motivo = ref("");

watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val) motivo.value = "";
});

watch(visible, (val) => {
  emit("update:modelValue", val);
});
</script>
