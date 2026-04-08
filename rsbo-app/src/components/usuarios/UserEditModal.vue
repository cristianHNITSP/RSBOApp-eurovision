<template>
  <b-modal :model-value="modelValue" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Editar usuario</p>
        <button class="delete" aria-label="close" @click="emit('update:modelValue', false)"></button>
      </header>

      <section class="modal-card-body">
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
      </section>

      <footer class="modal-card-foot" style="justify-content: flex-end; gap: 0.5rem">
        <b-button @click="emit('update:modelValue', false)">Cancelar</b-button>
        <b-button type="is-primary" :loading="saving" @click="save">Guardar</b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { formatRoleLabel } from '@/utils/roleHelpers.js'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  user:       { type: Object,  default: null },
  roles:      { type: Array,   default: () => [] },
  saving:     { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'save'])

const form = reactive({ name: '', email: '', phone: '', bio: '', role: null, isActive: true })

watch(() => props.user, (u) => {
  if (!u) return
  Object.assign(form, {
    name:     u.name || '',
    email:    u.email || '',
    phone:    u.profile?.phone || '',
    bio:      u.profile?.bio || '',
    role:     typeof u.role === 'string' ? u.role : (u.role?._id || u.roleDoc?._id || null),
    isActive: !!u.isActive,
  })
}, { immediate: true })

function save() { emit('save', { ...form }) }
</script>
