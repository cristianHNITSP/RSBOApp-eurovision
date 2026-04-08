<template>
  <b-modal :model-value="modelValue" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Cambiar contraseña</p>
        <button class="delete" aria-label="close" @click="emit('update:modelValue', false)"></button>
      </header>

      <section class="modal-card-body">
        <p class="mb-2"><strong>{{ user?.name }}</strong> · {{ user?.email }}</p>
        <b-field label="Nueva contraseña">
          <b-input v-model="password" type="password" password-reveal />
        </b-field>
        <div class="password-tools">
          <b-button size="is-small" type="is-light" icon-left="shield-alt" @click="generate">Generar segura</b-button>
          <b-button size="is-small" type="is-light" icon-left="copy" @click="copy">Copiar</b-button>
          <span class="is-size-7 has-text-grey">Mínimo 10 caracteres recomendado.</span>
        </div>
      </section>

      <footer class="modal-card-foot" style="justify-content: flex-end; gap: 0.5rem">
        <b-button @click="emit('update:modelValue', false)">Cancelar</b-button>
        <b-button type="is-primary" :loading="saving" @click="save">Actualizar</b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { generateSecurePassword } from '@/utils/generatePassword.js'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  user:       { type: Object,  default: null },
  saving:     { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'save', 'toast'])

const password = ref('')

// Reset password when modal opens
watch(() => props.modelValue, (open) => { if (open) password.value = '' })

function generate() {
  password.value = generateSecurePassword(16)
  emit('toast', 'Contraseña segura generada', 'is-success', 1400)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(String(password.value || ''))
    emit('toast', 'Copiado', 'is-success', 1200)
  } catch {
    emit('toast', 'No se pudo copiar', 'is-warning', 1500)
  }
}

function save() { emit('save', password.value) }
</script>
