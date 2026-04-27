<!-- rsbo-app/src/components/tabsmanager/actions/ActionRename.vue -->
<template>
  <div class="action-card primary" :class="{ 'rename-glow': glow }">
    <div class="action-icon"><i class="far fa-edit"></i></div>
    <div class="action-content">
      <div class="action-title">Renombrar planilla</div>
      <div class="action-desc">Cambia el nombre visible en la pestaña.</div>
      <div class="mt-2">
        <b-field grouped>
          <b-input
            v-model="internalValue"
            placeholder="Nuevo nombre…"
            expanded
            :disabled="loading"
          />
          <p class="control">
            <b-button
              type="is-primary"
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
  </div>
</template>

<script setup>
import { computed } from "vue";
import StatusPill from "../shared/StatusPill.vue";

const props = defineProps({
  modelValue: { type: String,  required: true },
  loading:    { type: Boolean, default: false },
  status:     { type: String,  default: "idle" },
  message:    { type: String,  default: "" },
  glow:       { type: Boolean, default: false },
  canSave:    { type: Boolean, default: false }
});

const emit = defineEmits(["update:modelValue", "save"]);

const internalValue = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v)
});
</script>
