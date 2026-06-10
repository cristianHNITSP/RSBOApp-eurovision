<template>
  <div v-if="user" ref="bannerEl" class="selected-user-banner box mb-0 lq-enter"
    :class="{ 'selected-user-banner--pulse': bannerPulse }">
    <!-- Datos del usuario seleccionado -->
    <div class="columns is-multiline is-vcentered is-variable is-3 mb-0">
      <div class="column is-12-mobile is-12-tablet is-4-widescreen">
        <article class="media is-align-items-center mb-0">
          <figure class="media-left mr-3">
            <AvatarPicker :modelValue="user.profile?.avatar || ''" :placeholder="userPlaceholder"
              :editMode="canEditAvatar(user)" :size="44" @update:modelValue="(val) => emit('avatar-picked', user, val)" />
          </figure>
          <div class="media-content">
            <p class="has-text-weight-semibold mb-0">
              {{ user.name }}
              <b-tag v-if="user.isMe" type="is-light" size="is-small" class="ml-1">Yo</b-tag>
              <span class="is-size-7 banner-soft ml-2">
                {{ user.roleLabel }}<span v-if="user.deletedAt"> · En papelera</span>
              </span>
            </p>
            <p class="is-size-7 banner-soft banner-bio mb-0">{{ user.profile?.bio || "—" }}</p>
          </div>
        </article>
      </div>

      <div class="column is-12-mobile is-narrow-tablet">
        <div class="level is-mobile mb-0">
          <span class="level-left is-size-7 is-uppercase has-text-weight-bold banner-soft is-hidden-widescreen mr-3">Usuario</span>
          <span class="level-right"><b-tag rounded icon="at">{{ user.username }}</b-tag></span>
        </div>
      </div>

      <div class="column is-12-mobile is-narrow-tablet">
        <div class="level is-mobile mb-0">
          <span class="level-left is-size-7 is-uppercase has-text-weight-bold banner-soft is-hidden-widescreen mr-3">Último acceso</span>
          <span class="level-right"><b-tag rounded>{{ formatDateTime(user.lastLogin) }}</b-tag></span>
        </div>
      </div>

      <div class="column is-12-mobile is-narrow-tablet">
        <div class="level is-mobile mb-0">
          <span class="level-left is-size-7 is-uppercase has-text-weight-bold banner-soft is-hidden-widescreen mr-3">Estado</span>
          <span class="level-right">
            <b-tag v-if="user.deletedAt" type="is-warning" rounded>Eliminado</b-tag>
            <b-tag v-else :type="user.isActive ? 'is-success' : 'is-warning'" rounded>
              {{ user.isActive ? "Activo" : "Inactivo" }}
            </b-tag>
          </span>
        </div>
      </div>

      <div class="column is-12-mobile is-narrow-tablet">
        <div class="level is-mobile mb-0">
          <span class="level-left is-size-7 is-uppercase has-text-weight-bold banner-soft is-hidden-widescreen mr-3">Alta</span>
          <span class="level-right is-size-7">{{ formatDate(user.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Acciones superiores -->
    <div class="columns is-mobile is-multiline is-variable is-1 mt-2 mb-0">
      <div class="column is-full-mobile is-narrow-tablet">
        <b-button type="is-success" icon-left="user-plus" expanded @click="emit('open-create')">
          Nuevo usuario
        </b-button>
      </div>
      <div class="column is-full-mobile is-narrow-tablet">
        <b-button type="is-light" icon-left="sync-alt" expanded :loading="loading" @click="emit('reload')">
          Recargar
        </b-button>
      </div>
      <div class="column is-full-mobile is-narrow-tablet">
        <b-button type="is-light" icon-left="info-circle" expanded @click="toggleDetails">
          {{ showDetails ? "Ocultar detalles" : "Ver detalles" }}
        </b-button>
      </div>
      <div class="column is-full-mobile is-narrow-tablet">
        <b-button type="is-light" icon-left="pen" expanded :disabled="user.isMe || !!user.deletedAt"
          @click="emit('edit', user)">
          Editar
        </b-button>
      </div>
      <div class="column is-full-mobile is-narrow-tablet">
        <b-button type="is-light" icon-left="key" expanded :disabled="user.isMe || !!user.deletedAt"
          @click="emit('change-password', user)">
          Contraseña
        </b-button>
      </div>
      <div class="column is-full-mobile is-narrow-tablet">
        <b-button v-if="!user.deletedAt" type="is-warning" icon-left="trash" expanded :disabled="user.isMe"
          @click="emit('soft-delete', user)">
          Papelera
        </b-button>
        <b-button v-else type="is-success" icon-left="undo" expanded @click="emit('restore', user)">
          Restaurar
        </b-button>
      </div>
    </div>

    <!-- Detalles del usuario -->
    <transition name="lq-pop">
      <div v-if="showDetails" class="banner-details pt-4 mt-3" @click.stop>
        <div class="columns is-multiline is-variable is-2 mb-0">
          <div class="column is-12-mobile is-6-tablet">
            <div class="banner-details__item px-3 py-2">
              <p class="is-size-7 is-uppercase has-text-weight-bold banner-soft mb-1">Teléfono</p>
              <p class="is-size-7 has-text-weight-semibold mb-0">{{ user.profile?.phone || "No registrado" }}</p>
            </div>
          </div>
          <div class="column is-12-mobile is-6-tablet">
            <div class="banner-details__item px-3 py-2">
              <p class="is-size-7 is-uppercase has-text-weight-bold banner-soft mb-1">Descripción del rol</p>
              <p class="is-size-7 has-text-weight-semibold mb-0">{{ user.roleDescription || "—" }}</p>
            </div>
          </div>
          <div class="column is-12">
            <div class="banner-details__item px-3 py-2">
              <p class="is-size-7 is-uppercase has-text-weight-bold banner-soft mb-1">Permisos</p>
              <b-taglist class="mb-0">
                <b-tag v-for="perm in user.rolePermissions" :key="perm" size="is-small" type="is-light">
                  {{ formatPermissionLabel(perm) }}
                </b-tag>
                <span v-if="!user.rolePermissions?.length" class="is-size-7 banner-soft">
                  Sin permisos configurados
                </span>
              </b-taglist>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import AvatarPicker from '@/components/AvatarPicker.vue'
import { PERMISSION_LABELS } from '@/utils/permissionLabels.js'
import { getAvatar, AVATAR_DEFAULTS } from '@/utils/avatarHelper'

const props = defineProps({
  user: { type: Object, default: null },
  permissionsCatalog: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const userPlaceholder = computed(() => getAvatar(props.user?.profile?.avatar, 'PROFILE'));

const emit = defineEmits([
  'avatar-picked',
  'open-create',
  'reload',
  'edit',
  'change-password',
  'soft-delete',
  'restore',
])

const bannerEl = ref(null)
const bannerPulse = ref(false)
const showDetails = ref(false)
let _pulseT = null

async function triggerFocus(scroll = true) {
  await nextTick()
  const el = bannerEl.value
  if (!el) return

  // Reiniciar estado del pulso
  bannerPulse.value = false
  if (_pulseT) clearTimeout(_pulseT)

  // Pequeño delay para asegurar que el DOM y el hilo principal estén libres (especialmente en móvil)
  setTimeout(() => {
    bannerPulse.value = true
    _pulseT = setTimeout(() => (bannerPulse.value = false), 650)

    if (scroll) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 60)
}

function toggleDetails() {
  showDetails.value = !showDetails.value
  if (showDetails.value) triggerFocus()
}

// When user changes, reset details and trigger focus (but without scroll)
watch(() => props.user, (newUser, oldUser) => {
  if (!newUser || !oldUser) return
  if (String(oldUser._id) !== String(newUser._id)) {
    showDetails.value = false
  }
  triggerFocus(false) // Solo el pulso visual, sin mover la pantalla
}, { flush: 'post' })

defineExpose({ triggerFocus })

function canEditAvatar(u) {
  return !!(u && !u.isMe && !u.deletedAt)
}

function formatDateTime(value) {
  if (!value) return 'Nunca ha iniciado sesión'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPermissionLabel(code) {
  if (!code) return '—'

  // 1. Intentar catálogo de props (backend)
  const cat = props.permissionsCatalog
  if (cat && typeof cat === 'object' && cat[code]) return String(cat[code])

  // 2. Intentar mapa local (traducciones comunes)
  // Normalizamos quitando guiones bajos por espacios y pasando a minúsculas
  const normalized = String(code).replace(/_/g, ' ').toLowerCase().trim()
  if (PERMISSION_LABELS[normalized]) return PERMISSION_LABELS[normalized]

  // 3. Fallback: Formatear el código (pretty print)
  const pretty = normalized
  return pretty.charAt(0).toUpperCase() + pretty.slice(1)
}
</script>

<style scoped>
/* Identidad de color mate vía tokens — layout 100% Bulma */
.selected-user-banner {
  background: var(--c-primary);
  color: var(--text-on-primary);
  border: 1px solid var(--c-primary-dark);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  scroll-margin-top: 100px;
  /* Evitar que el header fijo lo tape */
  transition: box-shadow var(--transition-base);
}

.selected-user-banner--pulse {
  box-shadow: var(--shadow-md), 0 0 0 3px var(--c-primary-light);
}

.banner-soft {
  color: var(--text-on-primary);
  opacity: 0.85;
}

.banner-bio {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-details {
  border-top: 1px solid var(--c-primary-dark);
}

.banner-details__item {
  background: var(--c-primary-dark);
  border-radius: var(--radius-md);
}
</style>
