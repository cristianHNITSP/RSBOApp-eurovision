<!-- rsbo-app/src/components/tabsmanager/actions/ActionRename.vue -->
<template>
  <div class="action-box primary p-5 mb-4" :class="{ 'action-glow-primary': glow }">
    <article class="media is-responsive-action is-align-items-center">
      <!-- Icono -->
      <div class="media-left">
        <div class="action-icon-circle icon-bg-primary">
          <b-icon icon="edit" pack="far" type="is-primary" size="is-medium"></b-icon>
        </div>
      </div>

      <!-- Contenido -->
      <div class="media-content">
        <div class="content mb-2">
          <h4 class="action-title is-size-5 mb-1">Renombrar planilla</h4>
          <p class="action-desc is-size-7">
            Cambia el nombre de la planilla tal como aparece en las pestañas.
          </p>
        </div>

        <div class="mt-2">
          <b-field grouped>
            <b-input 
              v-model="internalValue" 
              placeholder="Nuevo nombre…" 
              expanded 
              :disabled="loading" 
              icon-right="keyboard"
            />
            <p class="control">
              <b-button 
                type="is-primary" 
                icon-left="save"
                :loading="loading" 
                :disabled="!canSave || loading" 
                @click="$emit('save')"
              >
                Guardar
              </b-button>
            </p>
          </b-field>
          <div class="mt-1">
            <StatusPill :status="status" :message="message" />
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed } from "vue";
import StatusPill from "../shared/StatusPill.vue";

const props = defineProps({
  modelValue: { type: String, required: true },
  loading: { type: Boolean, default: false },
  status: { type: String, default: "idle" },
  message: { type: String, default: "" },
  glow: { type: Boolean, default: false },
  canSave: { type: Boolean, default: false }
});

const emit = defineEmits(["update:modelValue", "save"]);

const internalValue = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v)
});
</script>

<style scoped src="./ActionCard.css"></style>
