<script setup>
import "./OpticaConfirmModal.css";

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  confirm: { type: Object, required: true },
});

defineEmits(["update:modelValue", "ok", "cancel"]);
</script>

<template>
  <Teleport to="body">
    <b-modal
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      has-modal-card
      trap-focus
      :destroy-on-hide="false"
      :can-cancel="['escape', 'outside']"
    >
      <div class="modal-card glass-modal-card">
        <header class="modal-card-head glass-modal-head">
          <b-icon
            :icon="
              confirm.type === 'is-danger'
                ? 'exclamation-triangle'
                : confirm.type === 'is-warning'
                ? 'exclamation-circle'
                : 'check-circle'
            "
            :type="confirm.type"
            size="is-medium"
            class="mr-2"
          />
          <p class="modal-card-title">{{ confirm.title }}</p>
        </header>
        <section class="modal-card-body glass-modal-body">
          <p class="confirm-message">{{ confirm.message }}</p>
        </section>
        <footer class="modal-card-foot glass-modal-foot">
          <b-button @click="$emit('cancel')" icon-left="times">Cancelar</b-button>
          <b-button :type="confirm.type" icon-left="check" @click="$emit('ok')">{{
            confirm.btnLabel
          }}</b-button>
        </footer>
      </div>
    </b-modal>
  </Teleport>
</template>
