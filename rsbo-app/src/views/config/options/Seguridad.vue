<template>
  <section class="sec-wrap">

    <header class="page-section-header mb-4">
      <div>
        <span class="config-pill">
          <b-icon icon="shield-alt" size="is-small" class="mr-1" />
          Seguridad
        </span>
        <h2>Seguridad de la cuenta</h2>
        <p class="psh-desc">
          Gestiona tus sesiones activas, cambia tu contraseña y controla el acceso a tu cuenta.
        </p>
      </div>
    </header>

    <div class="columns is-multiline is-variable is-3 lq-stagger">

      <!-- ── Sesiones activas ──────────────────────────────────────────────── -->
      <SecCard :wide="true">
        <template #head>
          <div class="sec-title">
            <b-icon icon="laptop" size="is-small" class="mr-2" />
            Sesiones activas
          </div>
          <div class="is-flex is-align-items-center gap-2">
            <b-tag type="is-info is-light" rounded size="is-small">
              {{ sessions.length }} sesión{{ sessions.length !== 1 ? 'es' : '' }}
            </b-tag>
            <b-tooltip label="Cerrar todas las demás sesiones" position="is-left" append-to-body>
              <b-button
                type="is-danger is-light"
                size="is-small"
                icon-pack="fas"
                icon-left="sign-out-alt"
                :loading="loadingRevoke"
                :disabled="sessions.filter(s => !s.isCurrent).length === 0"
                @click="confirmRevokeAll"
              >
                Cerrar otras
              </b-button>
            </b-tooltip>
            <b-button
              type="is-light"
              size="is-small"
              icon-pack="fas"
              icon-left="sync"
              :loading="loadingSessions"
              @click="loadSessions"
            />
          </div>
        </template>

        <div v-if="loadingSessions" class="sec-empty">
          <b-icon pack="fas" icon="spinner" custom-class="fa-spin" />
          <span>Cargando sesiones...</span>
        </div>

        <div v-else-if="!sessions.length" class="sec-empty">
          <b-icon pack="fas" icon="laptop" size="is-medium" />
          <span>Sin sesiones registradas</span>
        </div>

        <div v-else class="sessions-list">
          <SecuritySessionItem
            v-for="session in sessions"
            :key="session.id"
            :session="session"
            :revoking-id="revokingId"
            :ip-cache="ipCache"
            :get-display-device="getDisplayDevice"
            :get-os-icon="getOsIcon"
            :time-ago="timeAgo"
            @revoke="confirmRevokeOne(sessions.find(s => s.id === $event))"
          />
        </div>
      </SecCard>

      <!-- ── Cambiar contraseña ────────────────────────────────────────────── -->
      <SecCard>
        <template #head>
          <div class="sec-title">
            <b-icon icon="key" size="is-small" class="mr-2" />
            Cambiar contraseña
          </div>
          <b-tag type="is-warning is-light" rounded size="is-small">Requiere relogin</b-tag>
        </template>

        <p class="sec-hint mb-3">
          Al cambiar la contraseña, todas tus sesiones activas serán cerradas por seguridad.
        </p>

        <b-field label="Contraseña actual">
          <b-input v-model="pwForm.current" type="password" password-reveal placeholder="••••••••"
            :disabled="loadingPw" />
        </b-field>

        <b-field label="Nueva contraseña" :message="pwStrengthMsg" :type="pwStrengthType">
          <b-input v-model="pwForm.next" type="password" password-reveal placeholder="Mínimo 8 caracteres"
            :disabled="loadingPw" />
        </b-field>

        <b-field label="Confirmar nueva contraseña" :type="pwMatchType" :message="pwMatchMsg">
          <b-input v-model="pwForm.confirm" type="password" password-reveal
            placeholder="Repite la nueva contraseña" :disabled="loadingPw" />
        </b-field>

        <div class="is-flex is-justify-content-flex-end mt-4">
          <b-button
            type="is-primary"
            icon-pack="fas"
            icon-left="key"
            :loading="loadingPw"
            :disabled="!pwFormValid"
            @click="submitChangePassword"
          >
            Actualizar contraseña
          </b-button>
        </div>
      </SecCard>

      <!-- ── Estado de cuenta ─────────────────────────────────────────────── -->
      <SecCard>
        <template #head>
          <div class="sec-title">
            <b-icon icon="info-circle" size="is-small" class="mr-2" />
            Estado de cuenta
          </div>
          <b-tag type="is-success is-light" rounded size="is-small">
            {{ user?.isActive !== false ? 'Activa' : 'Inactiva' }}
          </b-tag>
        </template>

        <div class="sec-stat-list">
          <div class="sec-stat">
            <span class="sec-stat__label">Último inicio de sesión</span>
            <span class="sec-stat__val">{{ user?.lastLogin ? fmtDate(user.lastLogin) : 'No disponible' }}</span>
          </div>
          <div class="sec-stat">
            <span class="sec-stat__label">Sesiones activas</span>
            <span class="sec-stat__val">{{ sessions.length }}</span>
          </div>
          <div class="sec-stat">
            <span class="sec-stat__label">Cuenta creada</span>
            <span class="sec-stat__val">{{ user?.createdAt ? fmtDate(user.createdAt) : 'No disponible' }}</span>
          </div>
          <div class="sec-stat">
            <span class="sec-stat__label">Usuario</span>
            <span class="sec-stat__val mono">{{ user?.username || '—' }}</span>
          </div>
        </div>
      </SecCard>

    </div>

    <SecurityRevokeModals
      :show-one="showRevokeOneModal"
      :show-all="showRevokeAllModal"
      :pending-session="pendingRevokeSession"
      :revoking-id="revokingId"
      :loading-revoke="loadingRevoke"
      :other-count="sessions.filter(s => !s.isCurrent).length"
      :get-display-device="getDisplayDevice"
      @update:show-one="showRevokeOneModal = $event"
      @update:show-all="showRevokeAllModal = $event"
      @confirm-one="onConfirmRevokeOne"
      @confirm-all="onConfirmRevokeAll"
    />

  </section>
</template>

<script setup>
import './Seguridad.css';

import SecCard               from '@/components/config/SecCard.vue';
import SecuritySessionItem   from '@/components/config/SecuritySessionItem.vue';
import SecurityRevokeModals  from '@/components/config/SecurityRevokeModals.vue';

import { useSecuritySessions } from '@/components/config/composables/useSecuritySessions.js';
import { usePasswordChange }   from '@/components/config/composables/usePasswordChange.js';

defineProps({
  user: { type: Object, default: null },
});

const {
  sessions,
  loadingSessions,
  loadingRevoke,
  revokingId,
  ipCache,
  showRevokeOneModal,
  showRevokeAllModal,
  pendingRevokeSession,
  loadSessions,
  confirmRevokeOne,
  onConfirmRevokeOne,
  confirmRevokeAll,
  onConfirmRevokeAll,
  getDisplayDevice,
  getOsIcon,
  timeAgo,
} = useSecuritySessions();

const {
  pwForm,
  loadingPw,
  pwStrengthMsg,
  pwStrengthType,
  pwMatchMsg,
  pwMatchType,
  pwFormValid,
  submitChangePassword,
} = usePasswordChange();

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
</script>
