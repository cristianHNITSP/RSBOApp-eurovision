<template>
  <b-modal :model-value="modelValue" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in"
    :can-cancel="['escape', 'outside']" @update:model-value="emit('update:modelValue', $event)">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Cambiar contraseña</p>
        <button class="delete" aria-label="close" @click="emit('update:modelValue', false)"></button>
      </header>

      <section class="modal-card-body">
        <p class="mb-2"><b>Nombre:</b> <strong>{{ user?.name }}</strong></p>
        <p class="mb-2"><b>Usuario:</b> <strong>{{ user?.username }}</strong></p>
        <b-field label="Nueva contraseña">
          <b-input v-model="password" type="password" password-reveal />
        </b-field>
        <div class="password-tools mt-4">
          <h6 class="subtitle is-7 is-uppercase has-text-weight-bold has-text-grey-dark mb-1">Seguridad de la cuenta
          </h6>
          <p class="is-size-7 has-text-grey mb-3">
            <b-icon icon="info-circle" size="is-small" class="mr-1" />
            Se recomienda <strong>guardar la nueva contraseña</strong> y dársela al usuario.
          </p>

          <div class="buttons">
            <b-button size="is-small" type="is-primary is-light" icon-left="shield-alt" @click="generate">Generar
              nueva</b-button>
            <b-button size="is-small" type="is-info is-light" icon-left="copy" @click="copy">Copiar</b-button>
          </div>
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
  user: { type: Object, default: null },
  saving: { type: Boolean, default: false },
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
<style src="./UserPasswordModal.css" scoped></style>
