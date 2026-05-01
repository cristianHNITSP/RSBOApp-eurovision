<!-- rsbo-app/src/components/tabsmanager/actions/ActionMetaNotes.vue -->
<template>
  <div class="action-box info p-5 mb-4" :class="{ 'action-glow-info': glow }">
    <article class="media is-responsive-action">
      <!-- Icono -->
      <div class="media-left">
        <div class="action-icon-circle icon-bg-info">
          <b-icon icon="comment-alt" pack="far" type="is-info" size="is-medium"></b-icon>
        </div>
      </div>

      <!-- Contenido -->
      <div class="media-content">
        <div class="content mb-3">
          <h4 class="action-title is-size-5 mb-1">Notas y Observaciones</h4>
          <p class="action-desc is-size-7">
            Anotaciones internas o detalles específicos para esta planilla.
          </p>
        </div>

        <div class="action-form-grid">
          <b-field label="Observaciones" custom-class="is-small">
            <b-input
              type="textarea"
              :modelValue="observaciones"
              @update:modelValue="$emit('update:observaciones', $event)"
              placeholder="Detalles sobre el inventario…"
              rows="2"
              :disabled="loading"
              size="is-small"
            />
          </b-field>

          <b-field label="Notas internas" custom-class="is-small">
            <b-input
              type="textarea"
              :modelValue="notas"
              @update:modelValue="$emit('update:notas', $event)"
              placeholder="Solo visible en este panel…"
              rows="2"
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
            Guardar notas
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
