<template>
  <div
    class="um-card um-card--glass"
    :class="{ 'card-glow-ok': user?.isActive, 'card-glow-bad': !user?.isActive }"
  >
    <!-- Header pills -->
    <div class="profile-card__top">
      <div class="pill-row">
        <span class="pill pill--light">
          <span class="icon is-small mr-1"><i class="fas fa-user"></i></span>
          Perfil
        </span>

        <span class="pill" :class="user?.isActive ? 'pill--ok' : 'pill--bad'">
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
          :model-value="avatarModel"
          :edit-mode="isEditing"
          :placeholder="avatarPlaceholder"
          @update:model-value="$emit('update:avatarModel', $event)"
        />
      </div>

      <h2 class="title is-4 mb-1 mt-3 um-title">{{ displayName }}</h2>

      <div class="email-row">
        <p class="subtitle is-6 has-text-grey mt-1 mb-0">@{{ displayUsername }}</p>

        <button
          class="button is-white is-small btn-icon"
          type="button"
          title="Copiar usuario"
          @click="$emit('copy-username')"
        >
          <span class="icon is-small"><i class="fas fa-copy"></i></span>
        </button>
      </div>

      <div class="quick-stats">
        <div class="quick-stat">
          <p class="quick-stat__v">{{ formatDate(user?.createdAt) }}</p>
          <p class="quick-stat__k">Miembro desde</p>
        </div>

        <div class="quick-stat">
          <p class="quick-stat__v">{{ timeSince(user?.lastLogin) }}</p>
          <p class="quick-stat__k">Último acceso</p>
        </div>
      </div>
    </div>

    <!-- Security (commented out intentionally — preserved for future use) -->
    <!--
    <div class="section-seguridad">
      ...
    </div>
    -->
  </div>
</template>

<script setup>
import AvatarPicker from '@/components/AvatarPicker.vue';
import { utils } from '@/services/myUserCRUD';

const { formatDate, timeSince } = utils;

defineProps({
  user:              { type: Object,  default: null },
  avatarModel:       { type: String,  default: '' },
  isEditing:         { type: Boolean, default: false },
  avatarPlaceholder: { type: String,  default: '' },
  displayName:       { type: String,  default: '' },
  displayUsername:   { type: String,  default: '' },
  roleName:          { type: String,  default: '' },
  statusLabel:       { type: String,  default: '' },
  statusDotClass:    { type: String,  default: '' },
});

defineEmits(['update:avatarModel', 'copy-username']);
</script>
