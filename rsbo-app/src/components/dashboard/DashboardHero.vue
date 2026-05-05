<template>
  <section class="db-hero" v-motion-fade-visible-once>

    <div class="hero-body">
      <!-- Columna izquierda: avatar + datos -->
      <div class="hero-left">
        <div class="avatar-shell" :style="{ '--rc': roleRingColor }">
          <div class="avatar-inner">
            <b-skeleton v-if="!avatarLoaded" :width="96" :height="96" animated style="border-radius:50%" />
            <img v-else :src="avatarUrl" alt="avatar" class="avatar-img" />
          </div>
          <div class="avatar-status-dot"></div>
        </div>

        <div class="hero-info">
          <div class="badge-row">
            <span class="role-chip" :style="rolePillStyle">
              <i :class="roleIconClass"></i>
              {{ roleLabel }}
            </span>
            <span class="env-chip">{{ environmentLabel }}</span>
          </div>

          <h1 class="hero-welcome-line">
            Bienvenido a <span class="brand-gradient">Eurovisión</span>
          </h1>
          <h2 class="hero-name" v-if="!loading">
            {{ greeting }}, <strong>{{ firstName }}</strong>
          </h2>
          <b-skeleton v-else :width="220" :height="28" animated class="mt-1" />

          <p class="hero-bio" v-if="!loading">{{ userBio }}</p>
          <b-skeleton v-else :width="300" :height="16" animated class="mt-1 mb-1" />

          <div class="hero-meta" v-if="!loading">
            <span class="hm-item">
              <i class="fas fa-clock"></i>
              Último acceso: <b>{{ lastLoginLabel }}</b>
            </span>
            <span class="hm-item" v-if="user?.username">
              <i class="fas fa-at"></i> {{ user.username }}
            </span>
          </div>
        </div>
      </div>

      <!-- Columna derecha: perfil + stats rápidas -->
      <div class="hero-right" v-if="!loading">
        <button class="profile-cta" @click="$router.push('/l/mi.perfil.panel')">
          <img :src="avatarUrl" class="pcta-avatar" alt="" />
          <div class="pcta-info">
            <span class="pcta-name">{{ firstName }}</span>
            <span class="pcta-label"> Administrar perfil</span>
          </div>
          <i class="fas fa-arrow-right pcta-arrow"></i>
        </button>

        <div class="hero-quick-stats" v-if="!loading">
          <div class="hqs-item" v-if="canSeeInventory">
            <div class="hqs-val">{{ stats?.activeSheets ?? '—' }}</div>
            <div class="hqs-label">Hojas</div>
          </div>
          <div class="hqs-sep" v-if="canSeeInventory"></div>
          <div class="hqs-item" v-if="canSeeOrders">
            <div class="hqs-val">{{ stats?.ordersPending ?? '—' }}</div>
            <div class="hqs-label">Pendientes</div>
          </div>
          <div class="hqs-sep" v-if="canSeeOrders && canSeeDevolutions"></div>
          <div class="hqs-item" v-if="canSeeDevolutions">
            <div class="hqs-val">{{ (stats?.devolucionesPendientes ?? 0) + (stats?.devolucionesEnRevision ?? 0) }}</div>
            <div class="hqs-label">Devoluc.</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  stats: { type: Object, default: null },
  roleLabel: { type: String, default: '' },
  roleIconClass: { type: String, default: '' },
  roleRingColor: { type: String, default: '#906fe1' },
  roleBannerStyle: { type: Object, default: () => ({}) },
  rolePillStyle: { type: Object, default: () => ({}) },
  environmentLabel: { type: String, default: '' },
  canSeeInventory: { type: Boolean, default: false },
  canSeeOrders: { type: Boolean, default: false },
  canSeeDevolutions: { type: Boolean, default: false },
});

const avatarLoaded = ref(false);
const avatarUrl = ref('/eurovision.svg');

function loadAvatar(url) {
  avatarLoaded.value = false;
  avatarUrl.value = url;
  const img = new Image();
  img.src = url;
  img.onload = () => { avatarLoaded.value = true; };
  img.onerror = () => { avatarUrl.value = '/eurovision.svg'; avatarLoaded.value = true; };
}

watch(() => props.user?.avatar, v => loadAvatar(v?.trim() ? v : '/eurovision.svg'), { immediate: true });

const greeting = computed(() => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; });
const firstName = computed(() => (props.user?.name || 'Usuario').split(' ')[0]);
const lastLoginLabel = computed(() => {
  if (!props.user?.lastLogin) return 'Primera sesión';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(props.user.lastLogin));
});

const ROLE_BIO = {
  root: 'Control total del sistema Eurovisión.',
  eurovision: 'Encargado general de la óptica.',
  supervisor: 'Supervisa operaciones diarias.',
  ventas: 'Atención al cliente y gestión de pedidos.',
  laboratorio: 'Técnico de laboratorio.',
};
const userBio = computed(() => props.user?.bio || ROLE_BIO[props.user?.roleName] || 'Usuario del sistema Eurovisión.');
</script>

<style scoped>
/* ── Hero card ── */
.db-hero {
  position: relative;
  z-index: 1;
  margin: 1.25rem 1.25rem 0;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background:
    radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.12), transparent 55%),
    radial-gradient(circle at 100% 0, rgba(236, 72, 153, 0.10), transparent 55%),
    radial-gradient(circle at 60% 100%, rgba(249, 115, 22, 0.10), transparent 55%),
    var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}



.hero-body {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.5rem 1.75rem;
  flex-wrap: wrap;
}

/* Avatar */
.avatar-shell {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--rc, var(--c-primary)), rgba(255, 255, 255, 0.2));
  padding: 3px;
  box-shadow: 0 0 22px color-mix(in srgb, var(--rc, var(--c-primary)) 45%, transparent);
}

.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.avatar-status-dot {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #10b981;
  border: 2.5px solid var(--surface-solid);
  box-shadow: 0 0 8px rgba(16, 185, 129, .6);
}

/* Info */
.hero-left {
  display: flex;
  align-items: flex-start;
  gap: 1.1rem;
  flex: 1;
  min-width: 0;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
}

.role-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
}

.env-chip {
  font-size: 0.67rem;
  color: var(--text-muted);
  background: var(--bg-subtle);
  border: 1px solid var(--glass-border);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.hero-welcome-line {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0 0 0.15rem;
  letter-spacing: 0.01em;
}

.brand-gradient {
  background: linear-gradient(90deg, #7c3aed, #2563eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

.hero-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.3rem;
  line-height: 1.2;
}

.hero-bio {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0 0 0.4rem;
  max-width: 460px;
  line-height: 1.55;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.hm-item {
  font-size: 0.73rem;
  color: var(--text-muted);
}

.hm-item i {
  margin-right: 0.25rem;
  color: var(--c-primary);
}

.hm-item b {
  color: var(--text-primary);
}

/* Hero right */
.hero-right {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex-shrink: 0;
}

.profile-cta {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.65rem 0.9rem;
  border-radius: 0.9rem;
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  cursor: pointer;
  color: var(--text-primary);
  transition: background 0.16s, transform 0.12s, box-shadow 0.16s;
  white-space: nowrap;
}

.profile-cta:hover {
  background: var(--bg-muted);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.pcta-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--border);
}

.pcta-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.pcta-label {
  font-size: 0.67rem;
  color: var(--text-muted);
}

.pcta-arrow {
  color: var(--c-primary);
  font-size: 0.75rem;
  margin-left: 0.4rem;
}

/* Hero quick stats */
.hero-quick-stats {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.55rem 0.9rem;
}

.hqs-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hqs-val {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.hqs-label {
  font-size: 0.62rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
}

.hqs-sep {
  width: 1px;
  height: 30px;
  background: var(--border);
}

/* Responsive */
@media (max-width:768px) {
  .db-hero {
    margin: 0.75rem 0.75rem 0;
  }

  .hero-body {
    padding: 1rem 1.1rem;
    gap: 1rem;
  }

  .hero-right {
    width: 100%;
  }

  .hero-quick-stats {
    justify-content: space-around;
  }
}
</style>
