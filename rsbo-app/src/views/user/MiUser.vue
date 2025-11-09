<template>
  <section class="section-miuser">

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
        <div class="box position-relative">
          <div class="section-info has-text-centered">
            <figure class="image is-128x128 is-inline-block mb-3 avatar-frame" @click="editMode && (avatarModal = true)" :class="{ 'is-disabled': !editMode }">
              <img :src="formData.avatar || avatarUrl" alt="Avatar" class="is-rounded" />
            </figure>
            <div class="tags is-centered mb-3">
              <span class="tag is-light">Estado</span>
              <span class="tag is-success">{{ props.user?.isActive ? 'Activo' : 'Inactivo' }}</span>
            </div>
            <h2 class="title is-4">{{ props.user?.name || 'Error al cargar usuario.' }}</h2>
            <p class="subtitle is-6 has-text-grey mt-1">{{ props.user?.email || 'Error al cargar el correo.' }}</p>
            <b-tag type="is-primary" size="is-medium" rounded>
              {{ props.user?.role?.name || 'Error al encontrar el rol.' }}
            </b-tag>
          </div>
          <div class="columns is-mobile is-centered is-multiline user-stats mt-3">
            <div class="column has-text-centered">
              <p class="has-text-weight-bold has-text-primary">{{ formatDate(props.user?.createdAt) }}</p>
              <p class="is-size-7 has-text-grey">Miembro desde</p>
            </div>
            <div class="column has-text-centered">
              <p class="has-text-weight-bold has-text-primary">{{ timeSince(props.user?.lastLogin) }}</p>
              <p class="is-size-7 has-text-grey">Último acceso</p>
            </div>
          </div>

          <div class="section-seguridad">
            <p class="has-text-weight-semibold mb-2">
              <span class="icon mr-1"><i class="fas fa-shield-alt"></i></span>
              Seguridad
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
                :has-animation="true">
                {{ passwordMessage }}
              </b-message>
            </transition>

            <b-field 
              label="Nueva contraseña" 
              :type="passwordErrors.password ? 'is-danger' : ''"
              :message="passwordErrors.password">
              <b-input 
                type="password" 
                placeholder="Nueva contraseña" 
                v-model="formData.password" 
                :disabled="!editMode || loadingPassword || props.loading"
                :loading="loadingPassword"
                icon="lock"
                @input="clearPasswordError('password')">
              </b-input>
            </b-field>
            
            <b-field 
              label="Confirmar contraseña" 
              :type="passwordErrors.confirmPassword ? 'is-danger' : ''"
              :message="passwordErrors.confirmPassword">
              <b-input 
                type="password" 
                placeholder="Confirmar contraseña" 
                v-model="formData.confirmPassword" 
                :disabled="!editMode || loadingPassword || props.loading"
                :loading="loadingPassword"
                icon="lock"
                @input="clearPasswordError('confirmPassword')">
              </b-input>
            </b-field>
            
            <div class="field is-grouped mt-3">
              <div class="control">
                <b-button 
                  type="is-primary" 
                  icon-left="check" 
                  @click="updatePassword" 
                  :loading="loadingPassword" 
                  :disabled="!editMode || loadingPassword || props.loading"
                  :class="{ 'pulse-animation': loadingPassword }">
                  Actualizar contraseña
                </b-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna derecha: Perfil -->
      <div class="column is-8">
        <div class="box position-relative">
          <div class="box-icons">
            <span v-if="!editMode" class="icon is-clickable" @click="editMode = true">
              <i class="fas fa-pencil-alt"></i>
            </span>
            <span v-else class="icon is-clickable" @click="cancelEdit()">
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
              :has-animation="true">
              {{ profileMessage }}
            </b-message>
          </transition>

          <b-field 
            label="Nombre completo" 
            :type="profileErrors.name ? 'is-danger' : ''"
            :message="profileErrors.name">
            <b-input 
              placeholder="Tu nombre" 
              v-model="formData.name" 
              :disabled="!editMode || loadingProfile || props.loading" 
              expanded
              icon="user"
              @input="clearProfileError('name')">
            </b-input>
          </b-field>
          
          <b-field 
            label="Correo electrónico" 
            :type="profileErrors.email ? 'is-danger' : ''"
            :message="profileErrors.email">
            <b-input 
              type="email" 
              placeholder="Tu correo" 
              v-model="formData.email" 
              :disabled="!editMode || loadingProfile || props.loading" 
              expanded
              icon="envelope"
              @input="clearProfileError('email')">
            </b-input>
          </b-field>
          
          <b-field 
            label="Teléfono" 
            :type="profileErrors.phone ? 'is-danger' : ''"
            :message="profileErrors.phone">
            <b-input 
              placeholder="Tu teléfono" 
              v-model="formData.phone" 
              :disabled="!editMode || loadingProfile || props.loading" 
              expanded
              icon="phone"
              @input="clearProfileError('phone')">
            </b-input>
          </b-field>
          
          <b-field :type="profileErrors.role ? 'is-danger' : ''" :message="profileErrors.role">
            <b-select 
              v-model="formData.role" 
              placeholder="Selecciona un rol" 
              :disabled="!editMode || loadingProfile || props.loading" 
              expanded
              icon="user-tag"
              @input="clearProfileError('role')">
              <option v-for="role in roles" :key="role._id" :value="role._id">{{ role.name }}</option>
            </b-select>
          </b-field>
          
          <b-field 
            label="Biografía" 
            :type="profileErrors.bio ? 'is-danger' : ''"
            :message="profileErrors.bio">
            <b-input 
              type="textarea" 
              placeholder="Cuéntanos sobre ti..." 
              v-model="formData.bio" 
              maxlength="500" 
              show-counter 
              :disabled="!editMode || loadingProfile || props.loading"
              icon="file-alt"
              @input="clearProfileError('bio')">
            </b-input>
          </b-field>

          <b-button 
            type="is-primary" 
            icon-left="check" 
            @click="updateProfile" 
            :loading="loadingProfile" 
            :disabled="!editMode || loadingProfile || props.loading"
            :class="{ 'pulse-animation': loadingProfile }">
            Guardar perfil
          </b-button>
        </div>
      </div>
    </div>

    <!-- Modal Avatar -->
    <b-modal v-model="avatarModal" :width="640" :can-cancel="['escape', 'outside']" :on-cancel="closeAvatarModal">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Selecciona un avatar</p>
          <button class="delete" aria-label="close" @click="closeAvatarModal"></button>
        </header>
        <section class="modal-card-body">
          <b-tabs v-model="activeAvatarTab" animated>
            <b-tab-item v-for="(category, name) in avatarCategories" :key="name" :label="name">
              <div class="columns is-multiline is-mobile avatar-grid">
                <div class="column is-3" v-for="(img, index) in category" :key="index">
                  <figure class="image is-64x64 avatar-option-container" @click="editMode && selectAvatar(img)">
                    <img :src="img" class="avatar-option" :class="{ 'is-selected': img === currentAvatar }" />
                    <div v-if="img === currentAvatar" class="avatar-selected-overlay">
                      <span class="icon has-text-white"><i class="fas fa-check"></i></span>
                    </div>
                  </figure>
                </div>
              </div>
            </b-tab-item>
          </b-tabs>
        </section>
        <footer class="modal-card-foot">
          <b-button @click="closeAvatarModal">Cerrar</b-button>
          <b-button type="is-primary" @click="confirmAvatarSelection">Seleccionar</b-button>
        </footer>
      </div>
    </b-modal>

  </section>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { userService, utils, avatarCategories } from '../../services/myUserCRUD'

// Constantes y configuración
const avatarUrl = 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png'

// Props
const props = defineProps({ user: Object, loading: Boolean })

// Estado de UI
const avatarModal = ref(false)
const activeAvatarTab = ref(0)
const currentAvatar = ref('')
const editMode = ref(false)
const loadingProfile = ref(false)
const loadingPassword = ref(false)

// Datos y estado
const roles = ref([])
const formData = reactive({
  name: '',
  email: '',
  phone: '',
  avatar: '',
  bio: '',
  role: '',
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
  bio: '',
  role: ''
})

const passwordErrors = reactive({
  password: '',
  confirmPassword: ''
})

// Copia original para cancelar
const originalData = reactive({})

// Lifecycle
onMounted(async () => {
  await loadRoles()
})

// Watchers
watch(() => props.user, (newUser) => {
  if (newUser) {
    initializeFormData(newUser)
  }
}, { immediate: true })

// Métodos de UI
function selectAvatar(img) {
  currentAvatar.value = img
}

function confirmAvatarSelection() {
  formData.avatar = currentAvatar.value
  avatarModal.value = false
}

function closeAvatarModal() {
  currentAvatar.value = formData.avatar
  avatarModal.value = false
}

function cancelEdit() {
  Object.assign(formData, originalData)
  currentAvatar.value = formData.avatar
  editMode.value = false
  profileMessage.value = ''
  passwordMessage.value = ''
  clearAllErrors()
}

function clearAllErrors() {
  Object.keys(profileErrors).forEach(key => profileErrors[key] = '')
  Object.keys(passwordErrors).forEach(key => passwordErrors[key] = '')
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

// Validaciones
function validateProfile() {
  let isValid = true
  clearAllErrors()

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

  if (!formData.role) {
    profileErrors.role = 'Debe seleccionar un rol'
    isValid = false
  }

  return isValid
}

function validatePassword() {
  let isValid = true
  clearAllErrors()

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

// Métodos que utilizan el servicio
async function loadRoles() {
  try {
    roles.value = await userService.getRoles()
  } catch (error) {
    console.error('Error loading roles:', error)
  }
}

async function updateProfile() {
  if (!validateProfile()) return

  loadingProfile.value = true
  
  const result = await userService.updateProfile(props.user.id, formData)
  
  if (result.success) {
    profileMessage.value = 'Perfil actualizado correctamente'
    profileSuccess.value = true
    editMode.value = false
    Object.assign(originalData, formData)
  } else {
    profileMessage.value = result.message
    profileSuccess.value = false
  }
  
  loadingProfile.value = false
}

async function updatePassword() {
  if (!validatePassword()) return

  loadingPassword.value = true
  
  const result = await userService.updatePassword(props.user.id, formData.password)
  
  if (result.success) {
    passwordMessage.value = 'Contraseña actualizada correctamente'
    passwordSuccess.value = true
    formData.password = ''
    formData.confirmPassword = ''
  } else {
    passwordMessage.value = result.message
    passwordSuccess.value = false
  }
  
  loadingPassword.value = false
}

// Métodos auxiliares
function initializeFormData(user) {
  Object.assign(formData, {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
    avatar: user.avatar || avatarUrl,
    role: user.role?.id || ''
  })
  Object.assign(originalData, formData)
  currentAvatar.value = user.avatar || avatarUrl
}

// Exportar utilidades para usar en el template si es necesario
const { formatDate, timeSince } = utils
</script>

<style scoped>
.section-miuser {
  border-radius: 12px;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #ccc;
}

.avatar-option-container {
  cursor: pointer;
  transition: transform 0.2s ease;
  position: relative;
}

.avatar-option-container:hover {
  transform: scale(1.05);
}

.avatar-selected-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(50, 115, 220, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.avatar-frame img {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.avatar-frame img:hover {
  transform: scale(1.03);
}

.avatar-option {
  border-radius: 50%;
  width: 64px;
  height: 64px;
  transition: transform 0.2s;
}

.avatar-option:hover {
  transform: scale(1.05);
}

.avatar-option.is-selected {
  border: 2px solid #3273dc;
}

.is-disabled {
  pointer-events: none;
  opacity: 0.5;
}

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

/* Transiciones para los campos */
.b-field {
  transition: all 0.3s ease;
}

/* Mejoras visuales para mensajes de error */
:deep(.message.is-danger) {
  border-left: 4px solid #ff3860;
  animation: shake 0.5s ease-in-out;
}

:deep(.message.is-success) {
  border-left: 4px solid #23d160;
  animation: slideIn 0.5s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
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

/* Transición suave para toda la sección */
.section-miuser > div {
  transition: opacity 0.3s ease;
}

/* Estilos para iconos en campos */
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

:deep(.b-select select) {
  padding-left: 2.5em;
}

:deep(.b-select .icon) {
  left: 0;
  pointer-events: none;
}
</style>