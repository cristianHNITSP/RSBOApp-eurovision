<template>
  <section v-motion-fade-visible-once class="user-manager um-root">

    <UserSkeleton v-if="props.loading" />

    <div v-else class="columns is-multiline">
      <div class="column is-4">
        <UserProfileCard
          :user="props.user"
          :avatar-model="formData.avatar"
          :is-editing="isEditingProfile"
          :avatar-placeholder="avatarPlaceholder"
          :display-name="displayName"
          :display-username="displayUsername"
          :role-name="roleName"
          :status-label="statusLabel"
          :status-dot-class="statusDotClass"
          @update:avatar-model="formData.avatar = $event"
          @copy-username="copyUsername"
        />
      </div>

      <div class="column is-8">
        <UserProfileForm
          :user="props.user"
          :form="formData"
          :errors="profileErrors"
          :is-editing="isEditingProfile"
          :loading="loadingProfile"
          :message="profileMessage"
          :success="profileSuccess"
          :role-name="roleName"
          :clear-error="clearProfileError"
          @start-edit="startProfileEdit"
          @cancel-edit="cancelEdit"
          @save="updateProfile"
          @update:message="profileMessage = $event"
        />
      </div>
    </div>

    <div class="um-glow um-glow--a" aria-hidden="true"></div>
    <div class="um-glow um-glow--b" aria-hidden="true"></div>
  </section>
</template>

<script setup>
import { watch, computed } from 'vue';
import './MiUser.css';

import UserSkeleton     from '@/components/config/UserSkeleton.vue';
import UserProfileCard  from '@/components/config/UserProfileCard.vue';
import UserProfileForm  from '@/components/config/UserProfileForm.vue';

import { labToast }       from '@/composables/shared/useLabToast';
import { useProfileForm } from '@/composables/auth/useProfileForm';
import { usePasswordForm } from '@/composables/auth/usePasswordForm';
import { getAvatar, AVATAR_DEFAULTS } from '@/utils/avatarHelper';

const props = defineProps({
  user:    { type: Object,  default: null },
  loading: { type: Boolean, default: false },
});

const userId = computed(() => props.user?._id || props.user?.id || '');

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

// eslint-disable-next-line no-unused-vars
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

const displayName      = computed(() => props.user?.name     || 'Error al cargar usuario.');
const displayUsername  = computed(() => props.user?.username || '—');
const roleName         = computed(() => props.user?.role?.name || 'Sin rol asignado');
const statusLabel      = computed(() => (props.user?.isActive ? 'Activo' : 'Inactivo'));
const statusDotClass   = computed(() => (props.user?.isActive ? 'dot--ok' : 'dot--bad'));
const avatarPlaceholder = computed(() => getAvatar(props.user?.avatar || formData.avatar, 'PROFILE'));

watch(() => props.user, (u) => { if (u) initProfile(u); }, { immediate: true });

async function copyUsername() {
  const username = String(props.user?.username || '').trim();
  if (!username) return;
  try {
    await navigator.clipboard.writeText(username);
    labToast.success('Usuario copiado', 1800);
  } catch {
    labToast.danger('No se pudo copiar el usuario', 2200);
  }
}
</script>
