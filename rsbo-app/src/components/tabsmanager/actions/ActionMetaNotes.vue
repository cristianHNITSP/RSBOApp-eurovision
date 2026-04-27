<!-- rsbo-app/src/components/tabsmanager/actions/ActionMetaNotes.vue -->
<template>
  <div class="action-card" :class="{ 'meta-glow': glow }">
    <div class="action-icon">
      <i class="far fa-sticky-note"></i>
    </div>
    <div class="action-content">
      <h3 class="action-title">Notas y observaciones</h3>
      <p class="action-desc">Información interna de la planilla</p>

      <div class="meta-grid">
        <b-field label="Observaciones">
          <b-input
            type="textarea"
            rows="2"
            maxlength="500"
            :model-value="observaciones"
            @update:model-value="$emit('update:observaciones', $event)"
            placeholder="Visibles en el dashboard..."
          />
        </b-field>
        <b-field label="Notas">
          <b-input
            type="textarea"
            rows="2"
            maxlength="500"
            :model-value="notas"
            @update:model-value="$emit('update:notas', $event)"
            placeholder="Información técnica interna..."
          />
        </b-field>
      </div>

      <div class="meta-actions-row">
        <StatusPill :status="status" :message="message" />
        <b-button
          label="Guardar notas"
          type="is-info"
          size="is-small"
          :loading="loading"
          :disabled="!canSave"
          @click="$emit('save')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import StatusPill from "../shared/StatusPill.vue";

defineProps({
  observaciones: String,
  notas: String,
  loading: Boolean,
  status: String,
  message: String,
  glow: Boolean,
  canSave: Boolean
});

defineEmits(["update:observaciones", "update:notas", "save"]);
</script>

<style scoped src="./ActionCard.css"></style>
