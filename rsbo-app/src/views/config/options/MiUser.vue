<template>
  <section v-motion-fade-visible-once class="user-manager">
    <!-- Skeleton Loading -->
    <div v-if="props.loading" class="columns is-multiline">
      <!-- Left skeleton -->
      <div class="column is-4">
        <div class="panel-card panel-card--soft">
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
        <div class="panel-card panel-card--soft">
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
        <div class="panel-card profile-card">
          <!-- Header pills -->
          <div class="profile-card__top">
            <div class="tags are-medium">
              <span class="tag is-light">
                <span class="icon is-small mr-1"><i class="fas fa-user"></i></span>
                Perfil
              </span>

              <span class="tag" :class="statusTagClass">
                <span class="dot-status" :class="statusDotClass" aria-hidden="true"></span>
                {{ statusLabel }}
              </span>
            </div>

            <b-tag type="is-primary" size="is-medium" rounded class="role-pill">
              <span class="icon is-small mr-1"><i class="fas fa-user-tag"></i></span>
              {{ roleName }}
            </b-tag>
          </div>

          <!-- Avatar + identity -->
          <div class="section-info has-text-centered">
            <AvatarPicker
              v-model="formData.avatar"
              :edit-mode="isEditingProfile"
              :placeholder="avatarPlaceholder"
            />

            <h2 class="title is-4 mb-1 mt-3">
              {{ displayName }}
            </h2>

            <div class="email-row">
              <p class="subtitle is-6 has-text-grey mt-1 mb-0">
                {{ displayEmail }}
              </p>

              <button
                class="button is-white is-small btn-icon"
                type="button"
                title="Copiar correo"
                @click="copyEmail"
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

          <!-- Security -->
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
                class="mb-3"
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
                    v-model="formData.password"
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
                    v-model="formData.confirmPassword"
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
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="column is-8">
        <div class="panel-card profile-form-card">
          <!-- Header -->
          <div class="card-head">
            <div class="card-head__title">
              <p class="has-text-weight-semibold mb-0">
                <span class="icon mr-1"><i class="fas fa-user-edit"></i></span>
                Información del perfil
              </p>
              <p class="is-size-7 has-text-grey mb-0">Edita tus datos. El rol es de solo lectura.</p>
            </div>

            <div class="card-head__actions">
              <b-button
                v-if="!isEditingProfile"
                size="is-small"
                type="is-primary"
                icon-left="pencil-alt"
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
              class="mb-4"
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
  </section>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed, getCurrentInstance } from "vue";
import { userService, utils } from "../../../services/myUserCRUD";
import AvatarPicker from "../../../components/AvatarPicker.vue"; // ajusta la ruta

const avatarUrl = "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png";

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const inst = getCurrentInstance();
const $buefy = inst?.appContext?.config?.globalProperties?.$buefy;

const userId = computed(() => props.user?._id || props.user?.id || "");

const isEditingProfile = ref(false);
const isEditingPassword = ref(false);

const loadingProfile = ref(false);
const loadingPassword = ref(false);

const formData = reactive({
  name: "",
  email: "",
  phone: "",
  avatar: "",
  bio: "",
  password: "",
  confirmPassword: "",
});

const profileMessage = ref("");
const profileSuccess = ref(true);
const passwordMessage = ref("");
const passwordSuccess = ref(true);

const profileErrors = reactive({ name: "", email: "", phone: "", bio: "" });
const passwordErrors = reactive({ password: "", confirmPassword: "" });

const originalData = reactive({});

const displayName = computed(() => props.user?.name || "Error al cargar usuario.");
const displayEmail = computed(() => props.user?.email || "Error al cargar el correo.");
const roleName = computed(() => props.user?.role?.name || "Sin rol asignado");

const statusLabel = computed(() => (props.user?.isActive ? "Activo" : "Inactivo"));
const statusTagClass = computed(() => (props.user?.isActive ? "is-success" : "is-danger"));
const statusDotClass = computed(() => (props.user?.isActive ? "dot--ok" : "dot--bad"));

const avatarPlaceholder = computed(() => props.user?.avatar || formData.avatar || avatarUrl);

onMounted(() => {});

watch(
  () => props.user,
  (newUser) => {
    if (newUser) initializeFormData(newUser);
  },
  { immediate: true }
);

function startProfileEdit() {
  isEditingProfile.value = true;
  profileMessage.value = "";
}

function cancelEdit() {
  Object.assign(formData, originalData);
  isEditingProfile.value = false;
  profileMessage.value = "";
  profileSuccess.value = true;
  clearProfileErrors();
}

function togglePasswordEdit() {
  if (isEditingPassword.value) {
    formData.password = "";
    formData.confirmPassword = "";
    clearPasswordErrors();
    passwordMessage.value = "";
    passwordSuccess.value = true;
    isEditingPassword.value = false;
  } else {
    isEditingPassword.value = true;
    passwordMessage.value = "";
  }
}

function clearProfileErrors() {
  Object.keys(profileErrors).forEach((k) => (profileErrors[k] = ""));
}
function clearPasswordErrors() {
  Object.keys(passwordErrors).forEach((k) => (passwordErrors[k] = ""));
}
function clearProfileError(field) {
  profileErrors[field] = "";
  if (profileMessage.value && !profileSuccess.value) profileMessage.value = "";
}
function clearPasswordError(field) {
  passwordErrors[field] = "";
  if (passwordMessage.value && !passwordSuccess.value) passwordMessage.value = "";
}

function validateProfile() {
  let isValid = true;
  clearProfileErrors();

  if (!formData.name.trim()) {
    profileErrors.name = "El nombre completo es requerido";
    isValid = false;
  }

  if (!formData.email.trim()) {
    profileErrors.email = "El correo electrónico es requerido";
    isValid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
    profileErrors.email = "El formato del correo electrónico es inválido";
    isValid = false;
  }

  return isValid;
}

function validatePassword() {
  let isValid = true;
  clearPasswordErrors();

  if (!formData.password) {
    passwordErrors.password = "La nueva contraseña es requerida";
    isValid = false;
  } else if (formData.password.length < 6) {
    passwordErrors.password = "La contraseña debe tener al menos 6 caracteres";
    isValid = false;
  }

  if (!formData.confirmPassword) {
    passwordErrors.confirmPassword = "Debe confirmar la contraseña";
    isValid = false;
  } else if (formData.password !== formData.confirmPassword) {
    passwordErrors.confirmPassword = "Las contraseñas no coinciden";
    isValid = false;
  }

  return isValid;
}

async function updateProfile() {
  if (!validateProfile()) return;

  if (!userId.value) {
    profileMessage.value = "No se pudo identificar al usuario para actualizar.";
    profileSuccess.value = false;
    return;
  }

  loadingProfile.value = true;

  const payload = {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    avatar: formData.avatar,
    bio: formData.bio,
  };

  const result = await userService.updateProfile(userId.value, payload);

  if (result.success) {
    profileMessage.value = "Perfil actualizado correctamente";
    profileSuccess.value = true;
    isEditingProfile.value = false;
    Object.assign(originalData, payload);
  } else {
    profileMessage.value = result.message || "Ocurrió un error al actualizar el perfil";
    profileSuccess.value = false;
  }

  loadingProfile.value = false;
}

async function updatePassword() {
  if (!validatePassword()) return;

  if (!userId.value) {
    passwordMessage.value = "No se pudo identificar al usuario para actualizar la contraseña.";
    passwordSuccess.value = false;
    return;
  }

  loadingPassword.value = true;

  const result = await userService.updatePassword(userId.value, formData.password);

  if (result.success) {
    passwordMessage.value = "Contraseña actualizada correctamente";
    passwordSuccess.value = true;
    formData.password = "";
    formData.confirmPassword = "";
    clearPasswordErrors();
    isEditingPassword.value = false;
  } else {
    passwordMessage.value = result.message || "Ocurrió un error al actualizar la contraseña";
    passwordSuccess.value = false;
  }

  loadingPassword.value = false;
}

function initializeFormData(user) {
  Object.assign(formData, {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    bio: user.bio || "",
    avatar: user.avatar || avatarUrl,
    password: "",
    confirmPassword: "",
  });

  Object.assign(originalData, {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    bio: formData.bio,
    avatar: formData.avatar,
  });
}

async function copyEmail() {
  const email = String(props.user?.email || "").trim();
  if (!email) return;

  try {
    await navigator.clipboard.writeText(email);
    $buefy?.toast?.open?.({ message: "Correo copiado", type: "is-success", duration: 1800 });
  } catch (e) {
    $buefy?.toast?.open?.({ message: "No se pudo copiar el correo", type: "is-danger", duration: 2200 });
  }
}

const { formatDate, timeSince } = utils;
</script>

<style scoped>
.user-manager {
  --c1: #4f46e5;
  --c2: #9a6dff;
  --c3: #ec4899;
  --border: rgba(148, 163, 184, 0.22);
  --shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
  --shadow2: 0 18px 50px rgba(15, 23, 42, 0.12);
}

/* Left */
.profile-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.role-pill {
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.14);
}

.section-info {
  padding: 0.35rem 0 0.85rem;
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
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.btn-icon:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.quick-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-top: 1rem;
}

.quick-stat {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.75);
  border-radius: 16px;
  padding: 0.75rem;
  text-align: center;
}

.quick-stat__v {
  margin: 0;
  font-weight: 900;
  color: #111827;
}
.quick-stat__k {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 800;
}

/* status dot */
.dot-status {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
  margin-right: 0.35rem;
  box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.25);
}
.dot--ok {
  background: #23d160;
}
.dot--bad {
  background: #ff3860;
}

/* security */
.section-seguridad {
  margin-top: 1rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.45);
  padding-top: 1rem;
}

.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

/* Right */

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  margin-bottom: 1rem;
}

.card-head__title {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.card-head__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.hint-line {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.82rem;
  color: #6b7280;
  background: rgba(79, 70, 229, 0.06);
  border: 1px solid rgba(79, 70, 229, 0.15);
  padding: 0.65rem 0.75rem;
  border-radius: 14px;
}

/* Animaciones */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.pulse-animation {
  animation: pulse 1.35s infinite;
}
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.35);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(79, 70, 229, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
  }
}

/* Mensajes (más “premium”) */
:deep(.message.is-danger) {
  border-left: 4px solid #ff3860;
}
:deep(.message.is-success) {
  border-left: 4px solid #23d160;
}
:deep(.message .message-body) {
  border-radius: 14px;
}

/* Textarea bio */
:deep(textarea.textarea-bio) {
  min-height: 170px;
  padding-top: 0.75rem;
  resize: vertical;
}

/* Inputs más suaves */
:deep(.input),
:deep(.textarea) {
  border-radius: 14px;
}
:deep(.control .icon) {
  color: rgba(79, 70, 229, 0.85);
}

/* Responsive */
@media (max-width: 768px) {
  .quick-stats {
    grid-template-columns: 1fr;
  }
  .card-head {
    flex-direction: column;
    align-items: stretch;
  }
  .card-head__actions {
    justify-content: flex-end;
  }
}
</style>
