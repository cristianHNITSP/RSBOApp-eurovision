<template>
  <section class="section-miuser">
    <div class="columns is-multiline">

      <!-- Columna izquierda: Avatar, estadísticas y seguridad -->
      <div class="column is-4">

        <!-- Avatar -->
        <div class="box has-text-centered">
          <figure class="image is-128x128 is-inline-block mb-3 avatar-frame" @click="avatarModal = true">
            <img :src="formData.avatar || avatarUrl" alt="Avatar" class="is-rounded" />
          </figure>

          <div class="tags is-centered mb-3">
            <span class="tag is-light">Estado</span>
            <span class="tag is-success">{{ user?.isActive ? 'Activo' : 'Inactivo' }}</span>
          </div>

          <h2 class="title is-4">{{ user?.name || 'Error al cargar usuario.' }}</h2>
          <p class="subtitle is-6 has-text-grey mt-1">{{ user?.email || 'Error al cargar el correo.' }}</p>

          <div class="mb-3">
            <b-tag type="is-primary" size="is-medium" rounded>{{ user?.role?.name || 'Error al encontrar el rol.' }}</b-tag>
          </div>

          <div class="columns is-mobile is-centered is-multiline user-stats">
            <div class="column has-text-centered">
              <p class="has-text-weight-bold has-text-primary">
                {{ formatDate(user?.createdAt) }}
              </p>
              <p class="is-size-7 has-text-grey">Miembro desde</p>
            </div>
            <div class="column has-text-centered">
              <p class="has-text-weight-bold has-text-primary">
                {{ timeSince(user?.lastLogin) }}
              </p>
              <p class="is-size-7 has-text-grey">Último acceso</p>
            </div>
          </div>
        </div>

        <!-- Seguridad -->
        <div class="box">
          <p class="has-text-weight-semibold mb-2">
            <span class="icon mr-1"><i class="fas fa-shield-alt"></i></span>
            Seguridad
          </p>

          <b-field label="Nueva contraseña">
            <b-input type="password" placeholder="Nueva contraseña" v-model="formData.password"></b-input>
          </b-field>

          <b-field label="Confirmar contraseña">
            <b-input type="password" placeholder="Confirmar contraseña" v-model="formData.confirmPassword"></b-input>
          </b-field>

          <div class="field is-grouped mt-3">
            <div class="control">
              <b-button
                type="is-primary"
                icon-left="check"
                :loading="loadingPassword"
                :disabled="loadingPassword"
                @click="updatePassword"
              >
                Actualizar contraseña
              </b-button>
            </div>
          </div>
        </div>

      </div>

      <!-- Columna derecha: Formulario de perfil -->
      <div class="column is-8">
        <div class="box">
          <p class="has-text-weight-semibold mb-3">
            <span class="icon mr-1"><i class="fas fa-user-edit"></i></span>
            Información del perfil
          </p>

          <b-field label="Nombre completo">
            <b-input placeholder="Tu nombre" v-model="formData.name" expanded></b-input>
          </b-field>

          <b-field label="Correo electrónico">
            <b-input type="email" placeholder="Tu correo" v-model="formData.email" expanded></b-input>
          </b-field>

          <b-field label="Teléfono">
            <b-input placeholder="Tu teléfono" v-model="formData.phone" expanded></b-input>
          </b-field>

          <b-select v-model="formData.role" placeholder="Selecciona un rol" expanded>
            <option v-for="role in roles" :key="role._id" :value="role._id">
              {{ role.name }}
            </option>
          </b-select>

          <b-field label="Biografía">
            <b-input type="textarea" placeholder="Cuéntanos sobre ti..." v-model="formData.bio" maxlength="500" show-counter></b-input>
          </b-field>

          <div class="field is-grouped mt-3">
            <div class="control">
              <b-button
                type="is-primary"
                size="is-small"
                icon-left="check"
                :loading="loadingProfile"
                :disabled="loadingProfile"
                @click="updateProfile"
              >
                Guardar perfil
              </b-button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal Avatar -->
    <b-modal v-model="avatarModal" :width="640" :can-cancel="['escape', 'outside']">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Selecciona un avatar</p>
          <button class="delete" aria-label="close" @click="avatarModal = false"></button>
        </header>

        <section class="modal-card-body">
          <b-tabs v-model="activeAvatarTab" animated>
            <b-tab-item v-for="(category, name) in avatarCategories" :key="name" :label="name">
              <div class="columns is-multiline is-mobile avatar-grid">
                <div class="column is-3" v-for="(img, index) in category" :key="index">
                  <figure class="image is-64x64 avatar-option-container" @click="selectAvatar(img)">
                    <img :src="img" class="avatar-option" :class="{ 'is-selected': img === currentAvatar }" />
                    <div v-if="img === currentAvatar" class="avatar-selected-overlay">
                      <span class="icon has-text-white">
                        <i class="fas fa-check"></i>
                      </span>
                    </div>
                  </figure>
                </div>
              </div>
            </b-tab-item>
          </b-tabs>
        </section>

        <footer class="modal-card-foot">
          <div class="level is-mobile is-flex-wrap-wrap" style="width: 100%;">
            <div class="level-left level-item">
              <b-button @click="avatarModal = false" class="mr-2">Cerrar</b-button>
              <b-button type="is-primary" @click="avatarModal = false">Seleccionar</b-button>
            </div>

            <div class="level-right level-item mt-2-mobile">
              <span class="mr-2 has-text-weight-medium">Vista previa:</span>
              <figure class="image is-64x64 is-inline-block">
                <img :src="formData.avatar || avatarUrl" alt="Avatar seleccionado" class="is-rounded" />
              </figure>
            </div>
          </div>
        </footer>
      </div>
    </b-modal>
  </section>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import api, { sendRequest } from '../../api/axios'

const avatarModal = ref(false)
const activeAvatarTab = ref(0)
const currentAvatar = ref('')
const avatarUrl = 'https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png'

const props = defineProps({
  user: Object,
  loading: Boolean
})

const roles = ref([])
const loadingProfile = ref(false)
const loadingPassword = ref(false)

// Formulario reactivo
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

// Cargar roles al montar
onMounted(async () => {
  try {
    const res = await api.get('/users/roles')
    roles.value = res.data
  } catch (err) {
    console.error('Error al cargar roles', err)
  }
})

// Actualizar formData cuando cambie user
watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      formData.name = newUser.name || ''
      formData.email = newUser.email || ''
      formData.phone = newUser.phone || ''
      formData.bio = newUser.bio || ''
      formData.avatar = newUser.avatar || avatarUrl
      formData.role = newUser.role?.id || ''
      currentAvatar.value = newUser.avatar || avatarUrl
    }
  },
  { immediate: true }
)

function selectAvatar(img) {
  currentAvatar.value = img
  formData.avatar = img
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeSince(dateStr) {
  if (!dateStr) return '-'
  const now = new Date()
  const past = new Date(dateStr)
  const diffMs = now - past
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (diffHours > 0) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  if (diffMinutes > 0) return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
  return 'Hace unos segundos'
}

// Actualizar perfil
async function updateProfile() {
  try {
    loadingProfile.value = true

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      bio: formData.bio,
      avatar: formData.avatar,
      role: formData.role
    }

    const res = await sendRequest(`update-user-${props.user.id}`, {
      method: 'PUT',
      url: `/users/${props.user.id}`,
      data: payload
    })

    // Actualizamos el formData con los datos devueltos
    const updatedUser = res.data
    formData.name = updatedUser.name
    formData.email = updatedUser.email
    formData.phone = updatedUser.profile?.phone || ''
    formData.bio = updatedUser.profile?.bio || ''
    formData.avatar = updatedUser.profile?.avatar || avatarUrl
    formData.role = updatedUser.role?._id || ''
    currentAvatar.value = formData.avatar

    $buefy.toast.open({ message: 'Perfil actualizado correctamente', type: 'is-success' })

  } catch (err) {
    console.error(err)
    $buefy.toast.open({ message: 'Error al actualizar el perfil', type: 'is-danger' })
  } finally {
    loadingProfile.value = false
  }
}

// Actualizar contraseña
async function updatePassword() {
  try {
    if (!formData.password) {
      $buefy.toast.open({ message: 'Ingrese una nueva contraseña', type: 'is-warning' })
      return
    }
    if (formData.password !== formData.confirmPassword) {
      $buefy.toast.open({ message: 'Las contraseñas no coinciden', type: 'is-warning' })
      return
    }

    loadingPassword.value = true

    await sendRequest(`update-password-${props.user.id}`, {
      method: 'PUT',
      url: `/users/${props.user.id}/password`,
      data: { password: formData.password }
    })

    $buefy.toast.open({ message: 'Contraseña actualizada correctamente', type: 'is-success' })

    formData.password = ''
    formData.confirmPassword = ''

  } catch (err) {
    console.error(err)
    $buefy.toast.open({ message: 'Error al actualizar la contraseña', type: 'is-danger' })
  } finally {
    loadingPassword.value = false
  }
}

// Generar categorías de avatar
function generateAvatarCategory(prefix, count) {
  return Array.from({ length: count }, (_, i) =>
    `https://cdn.jsdelivr.net/gh/alohe/avatars/png/${prefix}_${i + 1}.png`
  )
}

const avatarCategories = {
  Vibrent: generateAvatarCategory('vibrent', 12),
  '3D': generateAvatarCategory('3d', 5),
  Bluey: generateAvatarCategory('bluey', 8),
  Memo: generateAvatarCategory('memo', 10),
  Notion: generateAvatarCategory('notion', 8),
  Teams: generateAvatarCategory('teams', 6),
  Toon: generateAvatarCategory('toon', 8),
  Upstream: generateAvatarCategory('upstream', 8)
}
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
</style>
