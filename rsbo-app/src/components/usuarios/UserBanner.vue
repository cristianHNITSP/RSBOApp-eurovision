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
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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

<style scoped>
/* ── Banner principal ── */
.selected-user-banner {
  background: linear-gradient(120deg, #7957d5, #9a6dff, #f97316, #ec4899);
  background-size: 200% 200%;
  border-radius: 10px;
  padding: 0.9rem 1.25rem;
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.1fr) minmax(0, 1.7fr);
  align-items: center;
  gap: 1rem;
  color: #f9fafb;
  box-shadow: 0 14px 32px rgba(88, 28, 135, 0.45);
  position: relative;
  overflow: hidden;
  animation: banner-enter 220ms ease-out, banner-gradient-shift 14s ease-in-out infinite alternate;
}
.selected-user-banner--pulse {
  box-shadow: 0 14px 32px rgba(88, 28, 135, 0.45), 0 0 0 3px rgba(255,255,255,0.22);
}
.selected-user-banner::after {
  content: "";
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 0 0, rgba(255,255,255,0.28), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(15,23,42,0.24), transparent 60%);
  opacity: 0.55; pointer-events: none;
}
.selected-user-banner > * { position: relative; z-index: 1; }

.selected-user-banner__left {
  display: flex; align-items: center; gap: 0.8rem; min-width: 0;
}
.selected-user-banner__text {
  display: flex; flex-direction: column; gap: 0.1rem; min-width: 0;
}
.selected-user-banner__name-row {
  display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap;
}
.selected-user-banner__name   { font-weight: 600; font-size: 0.98rem; }
.selected-user-banner__role   { font-size: 0.82rem; opacity: 0.92; }
.selected-user-banner__bio {
  font-size: 0.75rem; opacity: 0.92;
  color: rgba(255,255,255,0.92); text-shadow: 0 1px 2px rgba(0,0,0,0.28);
  max-width: 560px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.selected-user-banner__center {
  text-align: center; font-size: 0.8rem; font-weight: 500; min-width: 0;
}
.selected-user-banner__email {
  padding: 0.25rem 0.7rem; border-radius: 999px;
  background: rgba(15,23,42,0.28); color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 2px rgba(0,0,0,0.25);
  backdrop-filter: blur(4px); box-shadow: 0 0 0 1px rgba(255,255,255,0.22);
  display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
}
.selected-user-banner__right {
  display: flex; justify-content: flex-end; align-items: center;
  gap: 0.5rem; font-size: 0.75rem; flex-wrap: wrap;
}
.selected-user-banner__created { opacity: 0.93; }

/* ── Acciones ── */
.selected-user-actions {
  grid-column: 1 / -1;
  margin-top: 0.65rem; padding-top: 0.65rem;
  border-top: 1px solid rgba(249,250,251,0.22);
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
}
.selected-user-actions__left,
.selected-user-actions__right { display: flex; gap: 0.5rem; flex-wrap: wrap; }

/* ── Detalles ── */
.banner-details {
  grid-column: 1 / -1;
  margin-top: 0.55rem; padding-top: 0.65rem;
  border-top: 1px solid rgba(249,250,251,0.18);
}
.banner-details__grid {
  display: grid;
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap: 0.75rem;
}
.banner-details__item {
  background: rgba(15,23,42,0.18); border: 1px solid rgba(255,255,255,0.18);
  backdrop-filter: blur(6px); border-radius: 12px; padding: 0.65rem 0.75rem; min-width: 0;
}
.banner-details__item--full { grid-column: 1 / -1; }
.banner-details__k {
  margin: 0; font-size: 0.72rem; letter-spacing: 0.06em;
  text-transform: uppercase; font-weight: 800; opacity: 0.9;
}
.banner-details__v {
  margin: 0.25rem 0 0; font-size: 0.88rem; font-weight: 600;
  color: rgba(255,255,255,0.95); overflow: hidden; text-overflow: ellipsis;
}
.banner-details__perms { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.35rem; }
.banner-details__perm-tag { text-transform: none; }
.banner-details__empty { font-size: 0.8rem; color: rgba(255,255,255,0.85); }

/* Transición */
.banner-details-enter-active, .banner-details-leave-active { transition: all 180ms ease; }
.banner-details-enter-from, .banner-details-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Chips ── */
.chip {
  border-radius: 999px; padding: 0.25rem 0.8rem;
  font-size: 0.75rem; font-weight: 500;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(15,23,42,0.15); color: #f9fafb;
  backdrop-filter: blur(4px);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.chip--light { background: var(--bg-subtle); color: var(--text-primary); }
.chip--status-active   { background: var(--c-success); color: #ecfdf5; }
.chip--status-inactive { background: var(--c-warning); color: var(--text-primary); }
.chip--info { background: var(--bg-subtle); color: var(--text-secondary); }
.chip:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }

/* ── Keyframes ── */
@keyframes banner-gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes banner-enter {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .selected-user-banner {
    grid-template-columns: minmax(0,1.8fr) minmax(0,1.4fr);
    grid-template-rows: auto auto;
  }
  .selected-user-banner__right { justify-content: flex-start; }
  .selected-user-banner__center { text-align: left; }
  .banner-details__grid { grid-template-columns: minmax(0,1fr); }
}
@media (max-width: 768px) {
  .selected-user-banner {
    grid-template-columns: minmax(0,1fr);
    grid-auto-rows: auto; align-items: flex-start;
  }
  .selected-user-actions { justify-content: flex-start; }
}
</style>
