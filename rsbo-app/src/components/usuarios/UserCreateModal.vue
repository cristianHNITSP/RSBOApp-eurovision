<template>
  <b-modal :model-value="modelValue" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Nuevo usuario</p>
        <button class="delete" aria-label="close" @click="emit('update:modelValue', false)"></button>
      </header>

      <section class="modal-card-body">
        <div class="create-avatar">
          <AvatarPicker
            :modelValue="form.avatar || ''"
            :placeholder="fallbackAvatar"
            :editMode="true"
            :size="56"
            @update:modelValue="(val) => (form.avatar = val)"
          />
          <div class="create-avatar__hint">
            <p class="is-size-7 has-text-grey m-0">Foto de perfil</p>
            <p class="is-size-6 has-text-weight-semibold m-0">{{ form.name || "Nuevo usuario" }}</p>
            <p class="is-size-7 has-text-grey m-0">Toca el avatar para cambiarlo.</p>
          </div>
        </div>

        <hr class="my-3" />

        <b-field label="Nombre"><b-input v-model="form.name" /></b-field>
        <b-field label="Correo"><b-input v-model="form.email" type="email" /></b-field>
        <b-field label="Teléfono"><b-input v-model="form.phone" /></b-field>
        <b-field label="Bio"><b-input v-model="form.bio" type="textarea" /></b-field>
        <b-field label="Rol">
          <b-select v-model="form.role" expanded>
            <option v-for="r in roles" :key="r._id" :value="r._id">{{ formatRoleLabel(r.name) }}</option>
          </b-select>
        </b-field>
        <b-field label="Estado">
          <b-switch v-model="form.isActive">Activo</b-switch>
        </b-field>
        <b-field label="Contraseña">
          <b-input v-model="form.password" type="text" />
        </b-field>
        <div class="password-tools">
          <b-button size="is-small" type="is-light" icon-left="shield-alt" @click="generate">Generar segura</b-button>
          <b-button size="is-small" type="is-light" icon-left="copy" @click="copy">Copiar</b-button>
          <span class="is-size-7 has-text-grey">Se recomienda guardarla y dársela al usuario.</span>
        </div>
      </section>

      <footer class="modal-card-foot" style="justify-content: flex-end; gap: 0.5rem">
        <b-button @click="emit('update:modelValue', false)">Cancelar</b-button>
        <b-button type="is-primary" :loading="saving" @click="save">Crear</b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script setup>
import { reactive, watch } from 'vue'
import AvatarPicker from '@/components/AvatarPicker.vue'
import { formatRoleLabel } from '@/utils/roleHelpers.js'
import { generateSecurePassword } from '@/utils/generatePassword.js'

const props = defineProps({
  modelValue:     { type: Boolean, required: true },
  roles:          { type: Array,   default: () => [] },
  saving:         { type: Boolean, default: false },
  fallbackAvatar: { type: String,  default: '' },
})

const emit = defineEmits(['update:modelValue', 'save', 'toast'])

const form = reactive({ name: '', email: '', phone: '', bio: '', avatar: '', role: null, isActive: true, password: '' })

// Reset + set initial password + default role when modal opens
watch(() => props.modelValue, (open) => {
  if (!open) return
  Object.assign(form, { name: '', email: '', phone: '', bio: '', avatar: '', isActive: true, password: generateSecurePassword(16) })
  form.role = props.roles?.[0]?._id || null
})

function generate() {
  form.password = generateSecurePassword(16)
  emit('toast', 'Contraseña segura generada', 'is-success', 1400)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(String(form.password || ''))
    emit('toast', 'Copiado', 'is-success', 1200)
  } catch {
    emit('toast', 'No se pudo copiar', 'is-warning', 1500)
  }
}

function save() { emit('save', { ...form }) }
</script>
