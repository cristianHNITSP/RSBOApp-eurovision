<template>
  <div
    v-if="user"
    ref="bannerEl"
    class="selected-user-banner"
    :class="{ 'selected-user-banner--pulse': bannerPulse }"
  >
    <div class="selected-user-banner__left">
      <AvatarPicker
        :modelValue="user.profile?.avatar || ''"
        :placeholder="fallbackAvatar"
        :editMode="canEditAvatar(user)"
        :size="44"
        @update:modelValue="(val) => emit('avatar-picked', user, val)"
      />

      <div class="selected-user-banner__text">
        <div class="selected-user-banner__name-row">
          <span class="selected-user-banner__name">
            {{ user.name }}
            <b-tag v-if="user.isMe" type="is-light" size="is-small" class="ml-2">Yo</b-tag>
          </span>
          <span class="selected-user-banner__role">
            {{ user.roleLabel }}
            <span v-if="user.deletedAt" style="opacity: 0.9">· En papelera</span>
          </span>
        </div>
        <p class="selected-user-banner__bio">{{ user.profile?.bio || "—" }}</p>
      </div>
    </div>

    <div class="selected-user-banner__center">
      <span class="selected-user-banner__email">{{ user.email }}</span>
    </div>

    <div class="selected-user-banner__right">
      <div class="chip chip--light">{{ formatDateTime(user.lastLogin) }}</div>
      <div
        class="chip"
        :class="
          user.deletedAt
            ? 'chip--status-inactive'
            : user.isActive
            ? 'chip--status-active'
            : 'chip--status-inactive'
        "
      >
        {{ user.deletedAt ? "Eliminado" : user.isActive ? "Activo" : "Inactivo" }}
      </div>
      <div class="selected-user-banner__created">Alta: {{ formatDate(user.createdAt) }}</div>
    </div>

    <!-- Acciones superiores -->
    <div class="selected-user-actions">
      <div class="selected-user-actions__left">
        <b-button size="is-small" type="is-light" icon-left="user-plus" @click="emit('open-create')">
          Nuevo usuario
        </b-button>
        <b-button size="is-small" type="is-light" icon-left="sync-alt" :loading="loading" @click="emit('reload')">
          Recargar
        </b-button>
      </div>

      <div class="selected-user-actions__right">
        <b-button size="is-small" type="is-light" icon-left="info-circle" @click="toggleDetails">
          {{ showDetails ? "Ocultar detalles" : "Ver detalles" }}
        </b-button>

        <b-button
          size="is-small"
          type="is-light"
          icon-left="pen"
          :disabled="user.isMe || !!user.deletedAt"
          @click="emit('edit', user)"
        >
          Editar
        </b-button>

        <b-button
          size="is-small"
          type="is-light"
          icon-left="key"
          :disabled="user.isMe || !!user.deletedAt"
          @click="emit('change-password', user)"
        >
          Contraseña
        </b-button>

        <b-button
          v-if="!user.deletedAt"
          size="is-small"
          type="is-warning"
          icon-left="trash"
          :disabled="user.isMe"
          @click="emit('soft-delete', user)"
        >
          Papelera
        </b-button>

        <b-button v-else size="is-small" type="is-success" icon-left="undo" @click="emit('restore', user)">
          Restaurar
        </b-button>
      </div>
    </div>

    <!-- Detalles del usuario -->
    <transition name="banner-details">
      <div v-if="showDetails" class="banner-details" @click.stop>
        <div class="banner-details__grid">
          <div class="banner-details__item">
            <p class="banner-details__k">Teléfono</p>
            <p class="banner-details__v">{{ user.profile?.phone || "No registrado" }}</p>
          </div>
          <div class="banner-details__item">
            <p class="banner-details__k">Descripción del rol</p>
            <p class="banner-details__v">{{ user.roleDescription || "—" }}</p>
          </div>
          <div class="banner-details__item banner-details__item--full">
            <p class="banner-details__k">Permisos</p>
            <div class="banner-details__perms">
              <b-tag
                v-for="perm in user.rolePermissions"
                :key="perm"
                size="is-small"
                type="is-light"
                class="banner-details__perm-tag"
              >
                {{ formatPermissionLabel(perm) }}
              </b-tag>
              <span v-if="!user.rolePermissions?.length" class="banner-details__empty">
                Sin permisos configurados
              </span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import AvatarPicker from '@/components/AvatarPicker.vue'

const props = defineProps({
  user:               { type: Object,  default: null },
  fallbackAvatar:     { type: String,  required: true },
  permissionsCatalog: { type: Object,  default: null },
  loading:            { type: Boolean, default: false },
})

const emit = defineEmits([
  'avatar-picked',
  'open-create',
  'reload',
  'edit',
  'change-password',
  'soft-delete',
  'restore',
])

const bannerEl    = ref(null)
const bannerPulse = ref(false)
const showDetails = ref(false)
let   _pulseT     = null

function isElementMostlyVisible(el, ratio = 0.65) {
  if (!el) return true
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight
  const visibleHeight = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0))
  return visibleHeight / Math.max(1, rect.height) >= ratio
}

async function triggerFocus() {
  await nextTick()
  const el = bannerEl.value
  if (!el) return
  bannerPulse.value = false
  if (_pulseT) clearTimeout(_pulseT)
  bannerPulse.value = true
  _pulseT = setTimeout(() => (bannerPulse.value = false), 650)
  if (!isElementMostlyVisible(el)) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function toggleDetails() {
  showDetails.value = !showDetails.value
  if (showDetails.value) triggerFocus()
}

// When user changes, reset details and trigger focus (but not on first mount)
watch(() => props.user, (newUser, oldUser) => {
  if (!newUser || !oldUser) return
  if (String(oldUser._id) !== String(newUser._id)) {
    showDetails.value = false
  }
  triggerFocus()
}, { flush: 'post' })

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
  const cat = props.permissionsCatalog
  if (cat && typeof cat === 'object' && cat[code]) return String(cat[code])
  const pretty = String(code).replace(/[_-]/g, ' ').toLowerCase()
  return pretty.charAt(0).toUpperCase() + pretty.slice(1)
}
</script>
