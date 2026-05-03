<!-- src/components/UserManager.vue (ajusta ruta/nombre según tu proyecto) -->
<template>
  <section v-motion-fade-visible-once class="user-manager um-root">
    <!-- Skeleton Loading -->
    <div v-if="props.loading" class="columns is-multiline">
      <!-- Left skeleton -->
      <div class="column is-4 p-2">
        <div class="um-card um-card--glass um-card--soft">
          <div class="has-text-centered mb-4">
            <b-skeleton type="avatar" size="128px" :animated="true" class="mb-3" />
            <b-skeleton width="60%" :animated="true" class="mb-2" />
            <b-skeleton width="80%" :animated="true" class="mb-2" />
            <b-skeleton width="40%" :animated="true" class="mb-2" />
          </div>

          <div class="columns is-mobile is-centered user-stats mt-3">
            <div class="column has-text-centered">
              <b-skeleton width="70%" :animated="true" class="mb-1" />
              <b-skeleton width="50%" :animated="true" />
            </div>
            <div class="column has-text-centered">
              <b-skeleton width="70%" :animated="true" class="mb-1" />
              <b-skeleton width="50%" :animated="true" />
            </div>
          </div>

          <div class="section-seguridad mt-4">
            <b-skeleton width="80%" :animated="true" class="mb-2" />
            <b-skeleton width="100%" :animated="true" class="mb-2" />
            <b-skeleton width="100%" :animated="true" class="mb-2" />
            <b-skeleton width="50%" :animated="true" class="mt-2" />
          </div>
        </div>
      </div>

      <!-- Right skeleton -->
      <div class="column is-8">
        <div class="um-card um-card--glass um-card--soft">
          <b-skeleton width="30%" :animated="true" class="mb-3" />
          <b-skeleton width="100%" :animated="true" class="mb-2" />
          <b-skeleton width="100%" :animated="true" class="mb-2" />
          <b-skeleton width="100%" :animated="true" class="mb-2" />
          <b-skeleton width="60%" :animated="true" class="mb-2" />
          <b-skeleton width="100%" :animated="true" class="mb-2" />
          <b-skeleton width="40%" :animated="true" class="mt-3" />
        </div>
      </div>
    </div>

    <!-- Contenido real -->
    <div v-else class="columns is-multiline">
      <!-- Left column -->
      <div class="column is-4">
        <div class="um-card um-card--glass" :class="{ 'card-glow-ok': props.user?.isActive, 'card-glow-bad': !props.user?.isActive }">
          <!-- Header pills -->
          <div class="profile-card__top">
            <div class="pill-row">
              <span class="pill pill--light">
                <span class="icon is-small mr-1"><i class="fas fa-user"></i></span>
                Perfil
              </span>

              <span class="pill" :class="props.user?.isActive ? 'pill--ok' : 'pill--bad'">
                <span class="dot-status" :class="statusDotClass" aria-hidden="true"></span>
                {{ statusLabel }}
              </span>
            </div>

            <span class="pill pill--strong role-pill">
              <span class="icon is-small mr-1"><i class="fas fa-user-tag"></i></span>
              {{ roleName }}
            </span>
          </div>

          <!-- Avatar + identity -->
          <div class="section-info has-text-centered">
            <div class="avatar-wrap">
              <div class="avatar-ring" aria-hidden="true"></div>

              <AvatarPicker
                v-model="formData.avatar"
                :edit-mode="isEditingProfile"
                :placeholder="avatarPlaceholder"
              />
            </div>

            <h2 class="title is-4 mb-1 mt-3 um-title">
              {{ displayName }}
            </h2>

            <div class="email-row">
              <p class="subtitle is-6 has-text-grey mt-1 mb-0">
                @{{ displayUsername }}
              </p>

              <button
                class="button is-white is-small btn-icon"
                type="button"
                title="Copiar usuario"
                @click="copyUsername"
              >
                <span class="icon is-small"><i class="fas fa-copy"></i></span>
              </button>
            </div>

            <div class="quick-stats">
              <div class="quick-stat">
                <p class="quick-stat__v">{{ formatDate(props.user?.createdAt) }}</p>
                <p class="quick-stat__k">Miembro desde</p>
              </div>

              <div class="quick-stat">
                <p class="quick-stat__v">{{ timeSince(props.user?.lastLogin) }}</p>
                <p class="quick-stat__k">Último acceso</p>
              </div>
            </div>
          </div>

          <!-- Security 
          <div class="section-seguridad">
            <div class="sec-head">
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
                <span>{{ isEditingPassword ? "Cancelar" : "Cambiar contraseña" }}</span>
              </b-button>
            </div>

            <p class="is-size-7 has-text-grey mb-3">
              Usa una contraseña única y difícil de adivinar. Evita reutilizarla.
            </p>

            <transition name="slide-fade">
              <b-message
                v-if="passwordMessage"
                :type="passwordSuccess ? 'is-success' : 'is-danger'"
                :icon="passwordSuccess ? 'check-circle' : 'exclamation-circle'"
                class="mb-3 um-message"
                :closable="true"
                @close="passwordMessage = ''"
                :has-animation="true"
              >
                {{ passwordMessage }}
              </b-message>
            </transition>

            <div class="columns is-multiline is-variable is-2">
              <div class="column is-12">
                <b-field
                  label="Nueva contraseña"
                  :type="passwordErrors.password ? 'is-danger' : ''"
                  :message="passwordErrors.password"
                >
                  <b-input
                    type="password"
                    placeholder="Nueva contraseña"
                    v-model="passForm.password"
                    :disabled="!isEditingPassword || loadingPassword || props.loading"
                    :loading="loadingPassword"
                    icon="lock"
                    password-reveal
                    @input="clearPasswordError('password')"
                  />
                </b-field>
              </div>

              <div class="column is-12">
                <b-field
                  label="Confirmar contraseña"
                  :type="passwordErrors.confirmPassword ? 'is-danger' : ''"
                  :message="passwordErrors.confirmPassword"
                >
                  <b-input
                    type="password"
                    placeholder="Confirmar contraseña"
                    v-model="passForm.confirmPassword"
                    :disabled="!isEditingPassword || loadingPassword || props.loading"
                    :loading="loadingPassword"
                    icon="lock"
                    password-reveal
                    @input="clearPasswordError('confirmPassword')"
                  />
                </b-field>
              </div>
            </div>

            <div class="field mt-3">
              <b-button
                type="is-primary"
                icon-left="check"
                @click="updatePassword"
                :loading="loadingPassword"
                :disabled="!isEditingPassword || loadingPassword || props.loading"
                :class="{ 'pulse-animation': loadingPassword }"
                expanded
              >
                Actualizar contraseña
              </b-button>
            </div>

            <div class="audit-chip" aria-hidden="true">
              <i class="far fa-shield-check"></i>
              <span>Acciones registradas</span>
            </div>
          </div>
          -->
        </div>
      </div>

      <!-- Right column -->
      <div class="column is-8">
        <div class="um-card um-card--glass p-4">
          <!-- Header -->
          <div class="card-head">
            <div class="card-head__title">
              <div class="pill-row">
                <span class="pill pill--primary">
                  <span class="icon is-small mr-1"><i class="fas fa-user-edit"></i></span>
                  Perfil
                </span>
              </div>

              <p class="has-text-weight-semibold mb-0 mt-2">
                Información del perfil
              </p>
            </div>

            <div class="card-head__actions">
              <b-button
                v-if="!isEditingProfile"
                size="is-small"
                type="is-primary"
                icon-left="pencil-alt"
                class="btn-cta"
                @click="startProfileEdit"
              >
                Editar
              </b-button>

              <template v-else>
                <b-button size="is-small" @click="cancelEdit" icon-left="times">
                  Cancelar
                </b-button>
                <b-button
                  size="is-small"
                  type="is-primary"
                  icon-left="check"
                  class="btn-cta"
                  @click="updateProfile"
                  :loading="loadingProfile"
                  :disabled="loadingProfile || props.loading"
                >
                  Guardar
                </b-button>
              </template>
            </div>
          </div>

          <transition name="slide-fade">
            <b-message
              v-if="profileMessage"
              :type="profileSuccess ? 'is-success' : 'is-danger'"
              :icon="profileSuccess ? 'check-circle' : 'exclamation-circle'"
              class="mb-4 um-message"
              :closable="true"
              @close="profileMessage = ''"
              :has-animation="true"
            >
              {{ profileMessage }}
            </b-message>
          </transition>

          <div class="columns is-multiline is-variable is-3">
            <div class="column is-12">
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
            </div>

            <div class="column is-12">
              <b-field label="Nombre de usuario">
                <b-input
                  :value="props.user?.username || ''"
                  expanded
                  icon="at"
                  disabled
                />
              </b-field>
            </div>

            <div class="column is-12-tablet is-6-desktop">
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
            </div>

            <div class="column is-12-tablet is-6-desktop">
              <b-field label="Rol asignado">
                <b-input :value="roleName" icon="user-tag" disabled />
              </b-field>
            </div>

            <div class="column is-12">
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
                  rows="6"
                  custom-class="textarea-bio"
                  :disabled="!isEditingProfile || loadingProfile || props.loading"
                  @input="clearProfileError('bio')"
                />
              </b-field>
            </div>

            <div class="column is-12">
              <div class="hint-line">
                <span class="icon is-small mr-1"><i class="fas fa-info-circle"></i></span>
                <span>Tip: usa un nombre consistente para reportes y auditoría.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- glows (decor) -->
    <div class="um-glow um-glow--a" aria-hidden="true"></div>
    <div class="um-glow um-glow--b" aria-hidden="true"></div>
  </section>
</template>

<script setup>
import { watch, computed } from "vue";
import { utils } from "../../../services/myUserCRUD";
import AvatarPicker from "../../../components/AvatarPicker.vue";
import { labToast } from "@/composables/shared/useLabToast";
import { useProfileForm } from "@/composables/auth/useProfileForm";
import { usePasswordForm } from "@/composables/auth/usePasswordForm";

const avatarUrl = "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png";

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const userId = computed(() => props.user?._id || props.user?.id || "");

// ── Form composables ────────────────────────────────────────────────────────
const {
  form: formData,
  errors: profileErrors,
  isEditing: isEditingProfile,
  loading: loadingProfile,
  message: profileMessage,
  success: profileSuccess,
  init: initProfile,
  startEdit: startProfileEdit,
  cancelEdit,
  clearFieldError: clearProfileError,
  save: updateProfile,
} = useProfileForm(userId);

const {
  form: passForm,
  errors: passwordErrors,
  isEditing: isEditingPassword,
  loading: loadingPassword,
  message: passwordMessage,
  success: passwordSuccess,
  toggle: togglePasswordEdit,
  clearFieldError: clearPasswordError,
  save: updatePassword,
} = usePasswordForm(userId);

// ── Derived display values ──────────────────────────────────────────────────
const displayName     = computed(() => props.user?.name  || "Error al cargar usuario.");
const displayUsername = computed(() => props.user?.username || "—");
const roleName       = computed(() => props.user?.role?.name || "Sin rol asignado");
const statusLabel    = computed(() => (props.user?.isActive ? "Activo" : "Inactivo"));
const statusDotClass = computed(() => (props.user?.isActive ? "dot--ok" : "dot--bad"));
const avatarPlaceholder = computed(() => props.user?.avatar || formData.avatar || avatarUrl);

watch(() => props.user, (u) => { if (u) initProfile(u) }, { immediate: true });

async function copyUsername() {
  const username = String(props.user?.username || "").trim();
  if (!username) return;
  try {
    await navigator.clipboard.writeText(username);
    labToast.success("Usuario copiado", 1800);
  } catch {
    labToast.danger("No se pudo copiar el usuario", 2200);
  }
}

const { formatDate, timeSince } = utils;
</script>

<style scoped>
/* =========================
   Base + glows (como tu UI actual)
   ========================= */
.user-manager.um-root {
  --primary: var(--c-primary);
  --c2: #9a6dff;
  --c3: #ec4899;

  --border: rgba(148, 163, 184, 0.22);
  --shadow: var(--shadow-soft);
  --shadow-2: 0 18px 50px rgba(15, 23, 42, 0.12);

  position: relative;
  overflow: hidden;

  background:
    radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.10), transparent 55%),
    radial-gradient(circle at 100% 12%, rgba(236, 72, 153, 0.08), transparent 55%),
    radial-gradient(circle at 60% 100%, rgba(249, 115, 22, 0.06), transparent 55%);
  border-radius: 18px;
  padding: 0.35rem;
}

.um-glow {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  filter: blur(55px);
  opacity: 0.25;
  pointer-events: none;
}
.um-glow--a {
  top: -220px;
  right: -220px;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.75), transparent 60%);
}
.um-glow--b {
  bottom: -250px;
  left: -230px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.55), transparent 60%);
}

/* =========================
   Card system (glass)
   ========================= */
.um-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-2);
  transition: transform 140ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
  overflow: hidden;
}

.um-card--glass {
  background: var(--surface);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
}

.um-card--soft {
  background: var(--surface-overlay);
}

.um-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
  border-color: var(--c-primary-alpha);
}

/* estado (glow suave) */
.card-glow-ok { box-shadow: 0 18px 50px rgba(16, 185, 129, 0.08), var(--shadow-2); }
.card-glow-bad { box-shadow: 0 18px 50px rgba(239, 68, 68, 0.08), var(--shadow-2); }

/* =========================
   Pills (como landing/tabs)
   ========================= */
.pill-row { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  color: var(--text-primary);
}
.pill--primary {
  color: var(--primary);
  background: var(--c-primary-alpha);
  border-color: rgba(79, 70, 229, 0.18);
}
.pill--light {
  color: var(--primary);
  background: rgba(79, 70, 229, 0.06);
  border-color: rgba(79, 70, 229, 0.12);
}
.pill--strong {
  background: linear-gradient(90deg, rgba(121,87,213,0.16), rgba(236,72,153,0.10));
  border-color: rgba(121,87,213,0.35);
  color: var(--text-primary);
}
.pill--ok {
  background: rgba(16, 185, 129, 0.10);
  border-color: rgba(16, 185, 129, 0.22);
  color: var(--text-primary);
}
.pill--bad {
  background: rgba(239, 68, 68, 0.10);
  border-color: rgba(239, 68, 68, 0.22);
  color: var(--text-primary);
}

.role-pill {
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.14);
}

/* =========================
   Left layout
   ========================= */
.profile-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.9rem 0.95rem 0.65rem;
  background: radial-gradient(circle at 0 0, var(--c-primary-alpha), transparent 55%), var(--surface-overlay);
  border-bottom: 1px solid var(--border);
}

.section-info {
  padding: 0.85rem 0.95rem 0.95rem;
}

/* Avatar “ring” */
.avatar-wrap {
  position: relative;
  display: inline-grid;
  place-items: center;
}
.avatar-ring {
  position: absolute;
  width: 112px;
  height: 112px;
  border-radius: 999px;
  background: conic-gradient(from 180deg, rgba(79,70,229,0.55), rgba(154,109,255,0.45), rgba(236,72,153,0.45), rgba(79,70,229,0.55));
  filter: blur(0.2px);
  opacity: 0.22;
  animation: ringRotate 4.2s linear infinite;
  pointer-events: none;
}
@keyframes ringRotate {
  to { transform: rotate(360deg); }
}

.um-title {
  font-weight: 900;
  background: linear-gradient(90deg, var(--text-primary), var(--text-muted));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.email-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.btn-icon {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.btn-icon:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  background: var(--surface-solid);
}

.quick-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-top: 1rem;
}
.quick-stat {
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  border-radius: 16px;
  padding: 0.75rem;
  text-align: center;
}
.quick-stat__v { margin: 0; font-weight: 900; color: var(--text-primary); }
.quick-stat__k { margin: 0.15rem 0 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 800; }

/* status dot */
.dot-status {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
  margin-right: 0.35rem;
  box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.25);
}
.dot--ok { background: #10b981; }
.dot--bad { background: #ef4444; }

/* security */
.section-seguridad {
  margin-top: 0.25rem;
  border-top: 1px solid var(--border);
  background: var(--surface-overlay);
  padding: 0.95rem;
}

.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.audit-chip {
  margin-top: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--text-muted);
  background: var(--c-primary-alpha);
  border: 1px solid var(--border);
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
}

/* =========================
   Right card header
   ========================= */

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}
.card-head__title { display: flex; flex-direction: column; gap: 0.2rem; }
.card-head__actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

.btn-cta {
  border-radius: 14px !important;
  box-shadow: 0 16px 32px rgba(79, 70, 229, 0.18);
}

/* hint */
.hint-line {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.82rem;
  color: var(--text-muted);
  background: rgba(79, 70, 229, 0.06);
  border: 1px solid rgba(79, 70, 229, 0.15);
  padding: 0.65rem 0.75rem;
  border-radius: 14px;
}

/* footer mini badge */
.form-foot {
  margin-top: 0.25rem;
  padding-top: 0.75rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.28);
  display: flex;
  justify-content: flex-end;
}
.meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  color: var(--text-muted);
}
.dot-pulse {
  position: relative;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 currentColor;
  animation: dotPulse 1s infinite linear;
}
@keyframes dotPulse {
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70% { box-shadow: 0 0 0 6px rgba(0, 0, 0, 0); opacity: 0.6; }
  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); opacity: 0.4; }
}

/* =========================
   Animations / messages / inputs
   ========================= */
.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.25s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from,
.slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }

.pulse-animation { animation: pulse 1.35s infinite; }
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.35); }
  70% { box-shadow: 0 0 0 12px rgba(79, 70, 229, 0); }
  100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
}

/* Mensajes (más “premium”) */
:deep(.message.is-danger) { border-left: 4px solid #ef4444; }
:deep(.message.is-success) { border-left: 4px solid #10b981; }
:deep(.message .message-body) { border-radius: 14px; }

/* Textarea bio */
:deep(textarea.textarea-bio) {
  min-height: 170px;
  padding-top: 0.75rem;
  resize: vertical;
}

/* Inputs suaves + icon color */
:deep(.input),
:deep(.textarea) { border-radius: 14px; }
:deep(.control .icon) { color: rgba(79, 70, 229, 0.85); }

/* =========================
   Responsive
   ========================= */
@media (max-width: 768px) {
  .quick-stats { grid-template-columns: 1fr; }
  .card-head { flex-direction: column; align-items: stretch; }
  .card-head__actions { justify-content: flex-end; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .um-card,
  .btn-icon,
  .avatar-ring,
  .pulse-animation,
  .dot-pulse {
    transition: none !important;
    animation: none !important;
  }
}
</style>
