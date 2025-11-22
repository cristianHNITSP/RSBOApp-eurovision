<template>
  <section v-motion-fade-visible-once>

    <!-- Skeleton Loading -->
    <div v-if="props.loading" class="columns is-multiline">
      <!-- Columna izquierda skeleton -->
      <div class="column is-4">
        <div class="box">
          <div class="has-text-centered mb-4">
            <b-skeleton type="avatar" size="128px" :animated="true" class="mb-3"></b-skeleton>
            <b-skeleton width="60%" :animated="true" class="mb-2"></b-skeleton>
            <b-skeleton width="80%" :animated="true" class="mb-2"></b-skeleton>
            <b-skeleton width="40%" :animated="true" class="mb-2"></b-skeleton>
          </div>
          <div class="columns is-mobile is-centered user-stats mt-3">
            <div class="column has-text-centered">
              <b-skeleton width="70%" :animated="true" class="mb-1"></b-skeleton>
              <b-skeleton width="50%" :animated="true"></b-skeleton>
            </div>
            <div class="column has-text-centered">
              <b-skeleton width="70%" :animated="true" class="mb-1"></b-skeleton>
              <b-skeleton width="50%" :animated="true"></b-skeleton>
            </div>
          </div>
          <div class="section-seguridad mt-4">
            <b-skeleton width="80%" :animated="true" class="mb-2"></b-skeleton>
            <b-skeleton width="100%" :animated="true" class="mb-2"></b-skeleton>
            <b-skeleton width="100%" :animated="true" class="mb-2"></b-skeleton>
            <b-skeleton width="50%" :animated="true" class="mt-2"></b-skeleton>
          </div>
        </div>
      </div>

      <!-- Columna derecha skeleton -->
      <div class="column is-8">
        <div class="box">
          <b-skeleton width="30%" :animated="true" class="mb-3"></b-skeleton>
          <b-skeleton width="100%" :animated="true" class="mb-2"></b-skeleton>
          <b-skeleton width="100%" :animated="true" class="mb-2"></b-skeleton>
          <b-skeleton width="100%" :animated="true" class="mb-2"></b-skeleton>
          <b-skeleton width="60%" :animated="true" class="mb-2"></b-skeleton>
          <b-skeleton width="100%" :animated="true" class="mb-2"></b-skeleton>
          <b-skeleton width="40%" :animated="true" class="mt-3"></b-skeleton>
        </div>
      </div>
    </div>

    <!-- Contenido real -->
    <div v-else class="columns is-multiline">
      <!-- Columna izquierda: Avatar, estadísticas y seguridad -->
      <div class="column is-4">
        <div class=" position-relative">
          <!-- Info básica -->
          <div class="section-info has-text-centered">
            <!-- Componente de avatar -->
            <AvatarPicker
              v-model="formData.avatar"
              :edit-mode="isEditingProfile"
              :placeholder="avatarUrl"
            />

            <div class="tags is-centered mb-3">
              <span class="tag is-light">Estado</span>
              <span class="tag" :class="props.user?.isActive ? 'is-success' : 'is-danger'">
                {{ props.user?.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <h2 class="title is-4 mb-1">
              {{ props.user?.name || 'Error al cargar usuario.' }}
            </h2>

            <p class="subtitle is-6 has-text-grey mt-1">
              {{ props.user?.email || 'Error al cargar el correo.' }}
            </p>

            <div class="mt-2">
              <b-tag type="is-primary" size="is-medium" rounded>
                {{ props.user?.role?.name || 'Error al encontrar el rol.' }}
              </b-tag>
            </div>
          </div>

          <!-- Estadísticas -->
          <div class="columns is-mobile is-centered is-multiline user-stats mt-4">
            <div class="column has-text-centered">
              <p class="has-text-weight-bold has-text-primary">
                {{ formatDate(props.user?.createdAt) }}
              </p>
              <p class="is-size-7 has-text-grey">Miembro desde</p>
            </div>
            <div class="column has-text-centered">
              <p class="has-text-weight-bold has-text-primary">
                {{ timeSince(props.user?.lastLogin) }}
              </p>
              <p class="is-size-7 has-text-grey">Último acceso</p>
            </div>
          </div>

          <!-- Seguridad (cambiar contraseña) -->
          <div class="section-seguridad mt-4">
            <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
              <p class="has-text-weight-semibold mb-0">
                <span class="icon mr-1"><i class="fas fa-shield-alt"></i></span>
                Seguridad
              </p>

              <b-button
                size="is-small"
                type="is-text"
                @click="togglePasswordEdit"
                :disabled="loadingPassword || props.loading"
                class="is-size-7 has-text-weight-semibold"
              >
                <span class="icon is-small mr-1">
                  <i :class="isEditingPassword ? 'fas fa-times' : 'fas fa-lock-open'"></i>
                </span>
                <span>{{ isEditingPassword ? 'Cancelar' : 'Cambiar contraseña' }}</span>
              </b-button>
            </div>

            <p class="is-size-7 has-text-grey mb-3">
              Mantén tu cuenta segura utilizando una contraseña única y difícil de adivinar.
            </p>

            <!-- Mensajes de error para contraseña -->
            <transition name="slide-fade">
              <b-message
                v-if="passwordMessage"
                :type="passwordSuccess ? 'is-success' : 'is-danger'"
                :icon="passwordSuccess ? 'check-circle' : 'exclamation-circle'"
                class="mb-3"
                :closable="true"
                @close="passwordMessage = ''"
                :has-animation="true"
              >
                {{ passwordMessage }}
              </b-message>
            </transition>

            <b-field
              label="Nueva contraseña"
              :type="passwordErrors.password ? 'is-danger' : ''"
              :message="passwordErrors.password"
            >
              <b-input
                type="password"
                placeholder="Nueva contraseña"
                v-model="formData.password"
                :disabled="!isEditingPassword || loadingPassword || props.loading"
                :loading="loadingPassword"
                icon="lock"
                password-reveal
                @input="clearPasswordError('password')"
              />
            </b-field>

            <b-field
              label="Confirmar contraseña"
              :type="passwordErrors.confirmPassword ? 'is-danger' : ''"
              :message="passwordErrors.confirmPassword"
            >
              <b-input
                type="password"
                placeholder="Confirmar contraseña"
                v-model="formData.confirmPassword"
                :disabled="!isEditingPassword || loadingPassword || props.loading"
                :loading="loadingPassword"
                icon="lock"
                password-reveal
                @input="clearPasswordError('confirmPassword')"
              />
            </b-field>

            <div class="field is-grouped mt-3">
              <div class="control">
                <b-button
                  type="is-primary"
                  icon-left="check"
                  @click="updatePassword"
                  :loading="loadingPassword"
                  :disabled="!isEditingPassword || loadingPassword || props.loading"
                  :class="{ 'pulse-animation': loadingPassword }"
                >
                  Actualizar contraseña
                </b-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna derecha: Perfil -->
      <div class="column is-8">
        <div class=" position-relative">
          <!-- Iconos de edición perfil -->
          <div class="box-icons">
            <span
              v-if="!isEditingProfile"
              class="icon is-clickable"
              title="Editar perfil"
              @click="startProfileEdit"
            >
              <i class="fas fa-pencil-alt"></i>
            </span>
            <span
              v-else
              class="icon is-clickable"
              title="Cancelar cambios"
              @click="cancelEdit"
            >
              <i class="fas fa-times"></i>
            </span>
          </div>

          <p class="has-text-weight-semibold mb-3">
            <span class="icon mr-1"><i class="fas fa-user-edit"></i></span>
            Información del perfil
          </p>

          <!-- Mensajes de error para perfil -->
          <transition name="slide-fade">
            <b-message
              v-if="profileMessage"
              :type="profileSuccess ? 'is-success' : 'is-danger'"
              :icon="profileSuccess ? 'check-circle' : 'exclamation-circle'"
              class="mb-3"
              :closable="true"
              @close="profileMessage = ''"
              :has-animation="true"
            >
              {{ profileMessage }}
            </b-message>
          </transition>

          <b-field
            label="Nombre completo"
            :type="profileErrors.name ? 'is-danger' : ''"
            :message="profileErrors.name"
          >
            <b-input
              placeholder="Tu nombre"
              v-model="formData.name"
              :disabled="!isEditingProfile || loadingProfile || props.loading"
              expanded
              icon="user"
              @input="clearProfileError('name')"
            />
          </b-field>

          <b-field
            label="Correo electrónico"
            :type="profileErrors.email ? 'is-danger' : ''"
            :message="profileErrors.email"
          >
            <b-input
              type="email"
              placeholder="Tu correo"
              v-model="formData.email"
              :disabled="!isEditingProfile || loadingProfile || props.loading"
              expanded
              icon="envelope"
              @input="clearProfileError('email')"
            />
          </b-field>

          <b-field
            label="Teléfono"
            :type="profileErrors.phone ? 'is-danger' : ''"
            :message="profileErrors.phone"
          >
            <b-input
              placeholder="Tu teléfono"
              v-model="formData.phone"
              :disabled="!isEditingProfile || loadingProfile || props.loading"
              expanded
              icon="phone"
              @input="clearProfileError('phone')"
            />
          </b-field>

          <!-- Rol solo lectura -->
          <b-field label="Rol asignado">
            <b-input
              :value="props.user?.role?.name || 'Sin rol asignado'"
              icon="user-tag"
              disabled
            />
          </b-field>

          <!-- Biografía textarea ajustada -->
          <b-field
            label="Biografía"
            :type="profileErrors.bio ? 'is-danger' : ''"
            :message="profileErrors.bio"
          >
            <b-input
              type="textarea"
              placeholder="Cuéntanos sobre ti..."
              v-model="formData.bio"
              maxlength="500"
              show-counter
              rows="5"
              custom-class="textarea-bio"
              :disabled="!isEditingProfile || loadingProfile || props.loading"
              @input="clearProfileError('bio')"
            />
          </b-field>

          <div class="mt-3">
            <b-button
              type="is-primary"
              icon-left="check"
              @click="updateProfile"
              :loading="loadingProfile"
              :disabled="!isEditingProfile || loadingProfile || props.loading"
              :class="{ 'pulse-animation': loadingProfile }"
            >
              Guardar perfil
            </b-button>
          </div>
        </div>
      </div>
    </div>

  </section>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { userService, utils } from '../../../services/myUserCRUD'
import AvatarPicker from '../../../components/AvatarPicker.vue' // ajusta la ruta según tu estructura

// Constantes y configuración
const avatarUrl = 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png'

// Props
const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

console.log('[MiUser] props iniciales:', props)

// ID del usuario (soporta _id o id)
const userId = computed(() => {
  const id = props.user?._id || props.user?.id || ''
  console.log('[MiUser] computed userId:', id)
  return id
})

// Estado de UI
const isEditingProfile = ref(false)
const isEditingPassword = ref(false)

const loadingProfile = ref(false)
const loadingPassword = ref(false)

// Datos y estado
const formData = reactive({
  name: '',
  email: '',
  phone: '',
  avatar: '',
  bio: '',
  password: '',
  confirmPassword: ''
})

// Mensajes y errores
const profileMessage = ref('')
const profileSuccess = ref(true)
const passwordMessage = ref('')
const passwordSuccess = ref(true)

const profileErrors = reactive({
  name: '',
  email: '',
  phone: '',
  bio: ''
})

const passwordErrors = reactive({
  password: '',
  confirmPassword: ''
})

// Copia original para cancelar
const originalData = reactive({})

// Lifecycle
onMounted(async () => {
  console.log('[MiUser] onMounted -> props.user:', props.user, 'loading:', props.loading)
})

// Watchers
watch(
  () => props.user,
  (newUser, oldUser) => {
    console.log('[MiUser] watch props.user ->', { oldUser, newUser })
    if (newUser) {
      initializeFormData(newUser)
    }
  },
  { immediate: true }
)

// ----- Métodos de UI -----
function startProfileEdit() {
  console.log('[MiUser] startProfileEdit')
  isEditingProfile.value = true
  profileMessage.value = ''
}

function cancelEdit() {
  console.log('[MiUser] cancelEdit -> restaurando originalData:', { ...originalData })
  Object.assign(formData, originalData)
  isEditingProfile.value = false
  profileMessage.value = ''
  profileSuccess.value = true
  clearProfileErrors()
}

function togglePasswordEdit() {
  console.log('[MiUser] togglePasswordEdit. isEditingPassword antes:', isEditingPassword.value)
  if (isEditingPassword.value) {
    // Cancelar edición de contraseña
    formData.password = ''
    formData.confirmPassword = ''
    clearPasswordErrors()
    passwordMessage.value = ''
    passwordSuccess.value = true
    isEditingPassword.value = false
  } else {
    isEditingPassword.value = true
    passwordMessage.value = ''
  }
  console.log('[MiUser] togglePasswordEdit. isEditingPassword después:', isEditingPassword.value)
}

function clearProfileErrors() {
  Object.keys(profileErrors).forEach((key) => (profileErrors[key] = ''))
}

function clearPasswordErrors() {
  Object.keys(passwordErrors).forEach((key) => (passwordErrors[key] = ''))
}

function clearProfileError(field) {
  profileErrors[field] = ''
  if (profileMessage.value && !profileSuccess.value) {
    profileMessage.value = ''
  }
}

function clearPasswordError(field) {
  passwordErrors[field] = ''
  if (passwordMessage.value && !passwordSuccess.value) {
    passwordMessage.value = ''
  }
}

// ----- Validaciones -----
function validateProfile() {
  console.log('[MiUser] validateProfile -> formData:', { ...formData })
  let isValid = true
  clearProfileErrors()

  if (!formData.name.trim()) {
    profileErrors.name = 'El nombre completo es requerido'
    isValid = false
  }

  if (!formData.email.trim()) {
    profileErrors.email = 'El correo electrónico es requerido'
    isValid = false
  } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
    profileErrors.email = 'El formato del correo electrónico es inválido'
    isValid = false
  }

  return isValid
}

function validatePassword() {
  console.log('[MiUser] validatePassword ->', {
    password: formData.password,
    confirmPassword: formData.confirmPassword
  })
  let isValid = true
  clearPasswordErrors()

  if (!formData.password) {
    passwordErrors.password = 'La nueva contraseña es requerida'
    isValid = false
  } else if (formData.password.length < 6) {
    passwordErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    isValid = false
  }

  if (!formData.confirmPassword) {
    passwordErrors.confirmPassword = 'Debe confirmar la contraseña'
    isValid = false
  } else if (formData.password !== formData.confirmPassword) {
    passwordErrors.confirmPassword = 'Las contraseñas no coinciden'
    isValid = false
  }

  return isValid
}

// ----- Métodos que utilizan el servicio -----
async function updateProfile() {
  console.log('[MiUser] updateProfile llamado')
  if (!validateProfile()) {
    console.log('[MiUser] updateProfile -> validación falló')
    return
  }
  if (!userId.value) {
    profileMessage.value = 'No se pudo identificar al usuario para actualizar.'
    profileSuccess.value = false
    console.warn('[MiUser] updateProfile -> userId vacío')
    return
  }

  loadingProfile.value = true

  const payload = {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    avatar: formData.avatar,
    bio: formData.bio
  }

  console.log('[MiUser] updateProfile -> payload:', payload)

  const result = await userService.updateProfile(userId.value, payload)

  console.log('[MiUser] updateProfile -> result:', result)

  if (result.success) {
    profileMessage.value = 'Perfil actualizado correctamente'
    profileSuccess.value = true
    isEditingProfile.value = false
    Object.assign(originalData, payload)
  } else {
    profileMessage.value = result.message || 'Ocurrió un error al actualizar el perfil'
    profileSuccess.value = false
  }

  loadingProfile.value = false
}

async function updatePassword() {
  console.log('[MiUser] updatePassword llamado')
  if (!validatePassword()) {
    console.log('[MiUser] updatePassword -> validación falló')
    return
  }
  if (!userId.value) {
    passwordMessage.value = 'No se pudo identificar al usuario para actualizar la contraseña.'
    passwordSuccess.value = false
    console.warn('[MiUser] updatePassword -> userId vacío')
    return
  }

  loadingPassword.value = true

  const result = await userService.updatePassword(userId.value, formData.password)

  console.log('[MiUser] updatePassword -> result:', result)

  if (result.success) {
    passwordMessage.value = 'Contraseña actualizada correctamente'
    passwordSuccess.value = true
    formData.password = ''
    formData.confirmPassword = ''
    clearPasswordErrors()
    isEditingPassword.value = false
  } else {
    passwordMessage.value = result.message || 'Ocurrió un error al actualizar la contraseña'
    passwordSuccess.value = false
  }

  loadingPassword.value = false
}

// ----- Métodos auxiliares -----
function initializeFormData(user) {
  console.log('[MiUser] initializeFormData con user:', user)
  Object.assign(formData, {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
    avatar: user.avatar || avatarUrl,
    password: '',
    confirmPassword: ''
  })

  Object.assign(originalData, {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    bio: formData.bio,
    avatar: formData.avatar
  })

  console.log('[MiUser] formData inicializado:', { ...formData })
}

// Exportar utilidades para usar en el template
const { formatDate, timeSince } = utils
</script>

<style scoped>
.position-relative {
  position: relative;
}

.box-icons {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.box-icons .icon {
  cursor: pointer;
  font-size: 1rem;
  color: #3273dc;
  transition: transform 0.2s ease, color 0.2s ease;
}

.box-icons .icon:hover {
  transform: scale(1.1);
  color: #2765c7;
}

/* Sección seguridad */
.section-seguridad {
  border-top: 1px dashed #dcdcdc;
  padding-top: 1.25rem;
}

/* Animaciones */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.pulse-animation {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(50, 115, 220, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(50, 115, 220, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(50, 115, 220, 0);
  }
}

/* Mensajes */
:deep(.message.is-danger) {
  border-left: 4px solid #ff3860;
  animation: shake 0.5s ease-in-out;
}

:deep(.message.is-success) {
  border-left: 4px solid #23d160;
  animation: slideIn 0.5s ease-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Íconos dentro de fields */
:deep(.b-field .field .control .icon) {
  color: #3273dc;
  transition: color 0.3s ease;
}

:deep(.b-field .field .control .icon.is-left) {
  left: 0;
}

:deep(.b-field.is-focused .field .control .icon) {
  color: #2765c7;
}

:deep(.b-field.is-danger .field .control .icon) {
  color: #ff3860;
}

/* Textarea biografía */
:deep(textarea.textarea-bio) {
  min-height: 160px;
  padding-top: 0.75rem;
  resize: vertical;
}
</style>
