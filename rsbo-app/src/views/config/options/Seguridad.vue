<!-- rsbo-app/src/views/config/options/Seguridad.vue -->
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

    <div class="sec-grid">

      <!-- ══ SESIONES ACTIVAS ══════════════════════════════════════════════ -->
      <div class="sec-card sec-card--wide">
        <div class="sec-card__head">
          <div class="sec-title">
            <b-icon icon="laptop" size="is-small" class="mr-2" />
            Sesiones activas
          </div>
          <div class="is-flex is-align-items-center gap-2">
            <b-tag type="is-info is-light" rounded size="is-small">
              {{ sessions.length }} sesión{{ sessions.length !== 1 ? 'es' : '' }}
            </b-tag>
            <b-tooltip label="Cerrar todas las demás sesiones" position="is-left" append-to-body>
              <b-button type="is-danger is-light" size="is-small" icon-pack="fas" icon-left="sign-out-alt"
                :loading="loadingRevoke" :disabled="sessions.filter(s => !s.isCurrent).length === 0"
                @click="confirmRevokeAll">
                Cerrar otras
              </b-button>
            </b-tooltip>
            <b-button type="is-light" size="is-small" icon-pack="fas" icon-left="sync" :loading="loadingSessions"
              @click="loadSessions" />
          </div>
        </div>

        <div class="sec-card__body">
          <div v-if="loadingSessions" class="sec-empty">
            <b-icon pack="fas" icon="spinner" custom-class="fa-spin" />
            <span>Cargando sesiones...</span>
          </div>

          <div v-else-if="!sessions.length" class="sec-empty">
            <b-icon pack="fas" icon="laptop" size="is-medium" />
            <span>Sin sesiones registradas</span>
          </div>

          <div v-else class="sessions-list">
            <div v-for="session in sessions" :key="session.id" class="session-item"
              :class="{ 'session-item--current': session.isCurrent }">
              <div class="session-item__icon">
                <b-icon pack="fas" :icon="getOsIcon(session)" size="is-medium" />
              </div>
              <div class="session-item__info">
                <div class="session-item__device">
                  {{ getDisplayDevice(session) }}
                  <b-tag v-if="session.isCurrent" type="is-success" size="is-small" rounded class="ml-2">
                    Esta sesión
                  </b-tag>
                </div>
                <div class="session-item__meta">
                  <span v-if="session.deviceInfo?.ip" class="session-meta-item">
                    <b-icon pack="fas" icon="map-marker-alt" size="is-small" />
                    <b-tooltip :label="session.deviceInfo.ip" position="is-top" append-to-body>
                      {{ ipCache[session.deviceInfo.ip] || session.deviceInfo.ip }}
                    </b-tooltip>
                  </span>
                  <span class="session-meta-item">
                    <b-icon pack="fas" icon="clock" size="is-small" />
                    {{ session.lastUsedAt ? 'Activo ' + timeAgo(session.lastUsedAt) : 'Inicio ' +
                      timeAgo(session.createdAt) }}
                  </span>
                  <span v-if="session.expiresAt" class="session-meta-item">
                    <b-icon pack="fas" icon="hourglass-half" size="is-small" />
                    Expira {{ timeAgo(session.expiresAt, true) }}
                  </span>
                </div>
              </div>
              <div class="session-item__actions">
                <b-tooltip v-if="!session.isCurrent" label="Cerrar esta sesión" position="is-left" append-to-body>
                  <b-button type="is-danger is-light" size="is-small" icon-pack="fas" icon-left="times"
                    :loading="revokingId === session.id" @click="confirmRevokeOne(session)" />
                </b-tooltip>
                <b-icon v-else pack="fas" icon="check-circle" class="current-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ CAMBIAR CONTRASEÑA ════════════════════════════════════════════ -->
      <div class="sec-card">
        <div class="sec-card__head">
          <div class="sec-title">
            <b-icon icon="key" size="is-small" class="mr-2" />
            Cambiar contraseña
          </div>
          <b-tag type="is-warning is-light" rounded size="is-small">Requiere relogin</b-tag>
        </div>

        <div class="sec-card__body">
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
            <b-input v-model="pwForm.confirm" type="password" password-reveal placeholder="Repite la nueva contraseña"
              :disabled="loadingPw" />
          </b-field>

          <div class="is-flex is-justify-content-flex-end mt-4">
            <b-button type="is-primary" icon-pack="fas" icon-left="key" :loading="loadingPw" :disabled="!pwFormValid"
              @click="submitChangePassword">
              Actualizar contraseña
            </b-button>
          </div>
        </div>
      </div>

      <!-- ══ INFORMACIÓN DE CUENTA ═════════════════════════════════════════ -->
      <div class="sec-card">
        <div class="sec-card__head">
          <div class="sec-title">
            <b-icon icon="info-circle" size="is-small" class="mr-2" />
            Estado de cuenta
          </div>
          <b-tag type="is-success is-light" rounded size="is-small">
            {{ user?.isActive !== false ? 'Activa' : 'Inactiva' }}
          </b-tag>
        </div>

        <div class="sec-card__body">
          <div class="sec-stat-list">
            <div class="sec-stat">
              <span class="sec-stat__label">Último inicio de sesión</span>
              <span class="sec-stat__val">
                {{ user?.lastLogin ? fmtDate(user.lastLogin) : 'No disponible' }}
              </span>
            </div>
            <div class="sec-stat">
              <span class="sec-stat__label">Sesiones activas</span>
              <span class="sec-stat__val">{{ sessions.length }}</span>
            </div>
            <div class="sec-stat">
              <span class="sec-stat__label">Cuenta creada</span>
              <span class="sec-stat__val">
                {{ user?.createdAt ? fmtDate(user.createdAt) : 'No disponible' }}
              </span>
            </div>
            <div class="sec-stat">
              <span class="sec-stat__label">Usuario</span>
              <span class="sec-stat__val mono">{{ user?.username || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>


    <teleport to="body">

      <!-- ── Modal: cerrar una sesión ──────────────────────────────────────── -->
      <b-modal v-model="showRevokeOneModal" has-modal-card trap-focus :destroy-on-hide="true" aria-role="dialog"
        aria-modal>
        <div class="modal-card" style="max-width: 420px; width: 100%;">
          <header class="modal-card-head revoke-modal-head--warning">
            <p class="modal-card-title">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              Cerrar sesión
            </p>
            <button class="delete" aria-label="close" @click="showRevokeOneModal = false" />
          </header>
          <section class="modal-card-body">
            <p>
              Se cerrará la sesión de
              <strong>{{ pendingRevokeSession ? getDisplayDevice(pendingRevokeSession) : 'este dispositivo' }}</strong>.
              El dispositivo perderá el acceso inmediatamente.
            </p>
          </section>
          <footer class="modal-card-foot">
            <b-button @click="showRevokeOneModal = false" :disabled="revokingId !== null">
              Cancelar
            </b-button>
            <b-button type="is-danger" icon-pack="fas" icon-left="times" :loading="revokingId !== null"
              @click="onConfirmRevokeOne">
              Cerrar sesión
            </b-button>
          </footer>
        </div>
      </b-modal>

      <!-- ── Modal: cerrar todas las demás sesiones ─────────────────────────── -->
      <b-modal v-model="showRevokeAllModal" has-modal-card trap-focus :destroy-on-hide="true" aria-role="dialog"
        aria-modal>
        <div class="modal-card" style="max-width: 440px; width: 100%;">
          <header class="modal-card-head revoke-modal-head--danger">
            <p class="modal-card-title">
              <i class="fas fa-sign-out-alt mr-2"></i>
              Cerrar otras sesiones
            </p>
            <button class="delete" aria-label="close" @click="showRevokeAllModal = false" />
          </header>
          <section class="modal-card-body">
            <p class="mb-3">
              Se cerrarán
              <strong>{{sessions.filter(s => !s.isCurrent).length}} sesión(es)</strong>
              activas en otros dispositivos.
            </p>
            <div class="revoke-notice">
              <i class="fas fa-info-circle mr-2"></i>
              Esta acción no se puede deshacer. Los demás dispositivos perderán el acceso inmediatamente.
            </div>
          </section>
          <footer class="modal-card-foot">
            <b-button @click="showRevokeAllModal = false" :disabled="loadingRevoke">
              Cancelar
            </b-button>
            <b-button type="is-danger" icon-pack="fas" icon-left="sign-out-alt" :loading="loadingRevoke"
              @click="onConfirmRevokeAll">
              Cerrar sesiones
            </b-button>
          </footer>
        </div>
      </b-modal>


    </teleport>


  </section>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { fetchSessions, revokeSession, revokeOtherSessions, changePassword } from '@/services/security';
import { labToast } from '@/composables/shared/useLabToast';

const props = defineProps({
  user: { type: Object, default: null },
});

// ── Sesiones ────────────────────────────────────────────────────────────────
const sessions = ref([]);
const loadingSessions = ref(false);
const loadingRevoke = ref(false);
const revokingId = ref(null);

// ── Geocalización de IPs ──
const ipCache = reactive({});

async function resolveIp(ip) {
  // Ignorar IPs ya resueltas
  if (!ip || ipCache[ip]) return;

  // Detectar IPs privadas o locales
  const isPrivate =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.includes('localhost') ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);

  if (isPrivate) {
    ipCache[ip] = 'Red local';
    return;
  }

  try {
    const res = await fetch(`https://freeipapi.com/api/json/${ip}`);
    const data = await res.json();
    if (data.cityName && data.countryName) {
      ipCache[ip] = `${data.cityName}, ${data.countryName}`;
    }
  } catch (err) {
    console.warn(`No se pudo geolocalizar la IP: ${ip}`, err);
  }
}

// Resolver IPs automáticamente cuando cambian las sesiones
watch(sessions, (newSessions) => {
  newSessions.forEach(s => {
    if (s.deviceInfo?.ip) resolveIp(s.deviceInfo.ip);
  });
}, { deep: true });

// Estado de los modales de confirmación
const showRevokeOneModal = ref(false);
const showRevokeAllModal = ref(false);
const pendingRevokeSession = ref(null);

async function loadSessions() {
  loadingSessions.value = true;
  try {
    const { data } = await fetchSessions();
    sessions.value = Array.isArray(data) ? data : [];
  } catch {
    labToast.danger('No se pudieron cargar las sesiones.');
  } finally {
    loadingSessions.value = false;
  }
}

// ── Cerrar una sesión ──────────────────────────────────────────────────────
function confirmRevokeOne(session) {
  pendingRevokeSession.value = session;
  showRevokeOneModal.value = true;
}

async function onConfirmRevokeOne() {
  showRevokeOneModal.value = false;
  if (pendingRevokeSession.value) {
    await doRevokeOne(pendingRevokeSession.value.id);
    pendingRevokeSession.value = null;
  }
}

async function doRevokeOne(sessionId) {
  revokingId.value = sessionId;
  try {
    await revokeSession(sessionId);
    sessions.value = sessions.value.filter((s) => s.id !== sessionId);
    labToast.success('Sesión cerrada.');
  } catch {
    labToast.danger('No se pudo cerrar la sesión.');
  } finally {
    revokingId.value = null;
  }
}

// ── Cerrar todas las demás sesiones ───────────────────────────────────────
function confirmRevokeAll() {
  showRevokeAllModal.value = true;
}

async function onConfirmRevokeAll() {
  showRevokeAllModal.value = false;
  await doRevokeAll();
}

async function doRevokeAll() {
  loadingRevoke.value = true;
  try {
    const { data } = await revokeOtherSessions();
    labToast.success(`${data.revoked ?? 'Otras'} sesión(es) cerrada(s).`);
  } catch {
    labToast.danger('No se pudieron cerrar las sesiones.');
  } finally {
    // Siempre recarga la lista, independientemente del resultado de la API
    await loadSessions();
    loadingRevoke.value = false;
  }
}

// ── Cambiar contraseña ───────────────────────────────────────────────────────
const pwForm = ref({ current: '', next: '', confirm: '' });
const loadingPw = ref(false);

const pwStrength = computed(() => {
  const p = pwForm.value.next;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return score;
});

const pwStrengthMsg = computed(() => {
  const p = pwForm.value.next;
  if (!p) return '';
  const labels = ['', 'Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
  return labels[pwStrength.value] || '';
});

const pwStrengthType = computed(() => {
  const s = pwStrength.value;
  if (!pwForm.value.next) return '';
  if (s <= 1) return 'is-danger';
  if (s <= 2) return 'is-warning';
  if (s <= 3) return 'is-info';
  return 'is-success';
});

const pwMatchMsg = computed(() => {
  if (!pwForm.value.confirm) return '';
  return pwForm.value.next === pwForm.value.confirm ? '' : 'Las contraseñas no coinciden';
});
const pwMatchType = computed(() => {
  if (!pwForm.value.confirm) return '';
  return pwForm.value.next === pwForm.value.confirm ? 'is-success' : 'is-danger';
});

const pwFormValid = computed(() =>
  pwForm.value.current.length > 0
  && pwForm.value.next.length >= 8
  && pwForm.value.next === pwForm.value.confirm
);

async function submitChangePassword() {
  if (!pwFormValid.value) return;
  loadingPw.value = true;
  try {
    await changePassword({ currentPassword: pwForm.value.current, newPassword: pwForm.value.next });
    labToast.success('Contraseña actualizada. Inicia sesión nuevamente.');
    pwForm.value = { current: '', next: '', confirm: '' };
    // El backend cerró todas las sesiones → redirigir al login
    setTimeout(() => { window.location.href = '/'; }, 1800);
  } catch (err) {
    const msg = err?.response?.data?.error || 'Error al cambiar la contraseña.';
    labToast.danger(msg);
  } finally {
    loadingPw.value = false;
  }
}

const currentDeviceInfo = computed(() => {
  if (typeof window === 'undefined') return { browser: 'Navegador', os: 'Sistema', name: 'Navegador en Sistema' };
  const ua = navigator.userAgent;
  let browser = 'Navegador';
  let os = 'Sistema';

  // Prioridad a Firefox para evitar falsos positivos de Safari/Chrome
  if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Edg') !== -1) browser = 'Edge';
  else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';

  if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Windows') !== -1) os = 'Windows';
  else if (ua.indexOf('Macintosh') !== -1 || ua.indexOf('Mac OS X') !== -1) os = 'macOS';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';

  return { browser, os, name: `${browser} en ${os}` };
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function getDisplayDevice(session) {
  if (!session) return 'Dispositivo desconocido';
  if (session.isCurrent) return currentDeviceInfo.value.name;
  return session.deviceInfo?.deviceName || 'Dispositivo desconocido';
}

function getOsIcon(session) {
  let os = session?.deviceInfo?.os;
  if (session?.isCurrent) os = currentDeviceInfo.value.os;

  if (!os) return 'laptop';
  const s = os.toLowerCase();
  if (s.includes('linux')) return 'server';
  if (s.includes('windows')) return 'laptop';
  if (s.includes('macos') || s.includes('mac')) return 'laptop';
  if (s.includes('android')) return 'mobile-alt';
  if (s.includes('iphone') || s.includes('ipad')) return 'mobile-alt';
  return 'laptop';
}

function timeAgo(dateStr, future = false) {
  if (!dateStr) return '';
  const diff = future
    ? new Date(dateStr).getTime() - Date.now()
    : Date.now() - new Date(dateStr).getTime();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  if (mins < 1) return future ? 'en unos segundos' : 'ahora mismo';
  if (mins < 60) return future ? `en ${mins} min` : `hace ${mins} min`;
  if (hours < 24) return future ? `en ${hours} h` : `hace ${hours} h`;
  if (days === 1) return future ? 'mañana' : 'ayer';
  return future ? `en ${days} días` : `hace ${days} días`;
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

onMounted(() => loadSessions());
</script>

<style scoped>
.sec-wrap {
  border-radius: 12px;
  padding: 1.25rem;
  background: linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-muted) 100%);
  box-shadow: var(--shadow-sm);
  border-bottom: 1px solid var(--border-solid);
}

.config-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 1rem;
}

/* ── Grid ────────────────────────────────────────────────────────────────── */
.sec-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.9rem;
}

/* ── Card glassmorphism ──────────────────────────────────────────────────── */
.sec-card {
  grid-column: span 6;
  background: color-mix(in srgb, var(--surface-solid) 72%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border-solid);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}

.sec-card--wide {
  grid-column: span 12;
}

.sec-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border-solid);
  background: color-mix(in srgb, var(--bg-subtle) 60%, transparent);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sec-title {
  font-weight: 900;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
}

.sec-card__body {
  padding: 0.9rem 1rem;
  flex: 1;
}

.sec-hint {
  font-size: 0.83rem;
  color: var(--text-muted);
}

/* ── Sesiones ────────────────────────────────────────────────────────────── */
.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
  border: 1px solid var(--border-solid);
  background: var(--bg-muted);
  transition: background 0.15s;
}

.session-item--current {
  border-color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 8%, var(--bg-muted));
}

.session-item__icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.session-item--current .session-item__icon {
  color: var(--c-primary);
}

.session-item__info {
  flex: 1;
  min-width: 0;
}

.session-item__device {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.session-item__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
}

.session-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.session-item__actions {
  flex-shrink: 0;
}

.current-icon {
  color: var(--c-success, #257953);
}

/* ── Estado de cuenta ───────────────────────────────────────────────────── */
.sec-stat-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.sec-stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--border-solid);
}

.sec-stat:last-child {
  border-bottom: none;
}

.sec-stat__label {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.sec-stat__val {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
}

/* ── Estado vacío ───────────────────────────────────────────────────────── */
.sec-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* ── Misc ───────────────────────────────────────────────────────────────── */
.gap-2 {
  gap: 0.5rem;
}

.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
}

@media screen and (max-width: 768px) {
  .sec-card {
    grid-column: span 12;
  }
}

/* ── Cabeceras de modales ────────────────────────────────────────────────── */
.revoke-modal-head--warning {
  background: rgba(254, 243, 199, 0.92);
  color: rgba(120, 53, 15, 0.95);
}

.revoke-modal-head--danger {
  background: rgba(254, 226, 226, 0.92);
  color: rgba(127, 29, 29, 0.95);
}

.revoke-modal-head--warning .modal-card-title,
.revoke-modal-head--danger .modal-card-title {
  color: inherit;
  font-weight: 800;
}

/* ── Info notice dentro del body ─────────────────────────────────────────── */
.revoke-notice {
  background: color-mix(in srgb, var(--c-info, #3273dc) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--c-info, #3273dc) 25%, transparent);
  border-radius: 8px;
  padding: 0.65rem 0.9rem;
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
