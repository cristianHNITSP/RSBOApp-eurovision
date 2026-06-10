<template>
  <section class="db-hero mx-5 mt-5 lq-enter">
    <div class="columns is-multiline is-vcentered is-variable is-4 p-5 mb-0">
      <!-- Columna izquierda: avatar + datos -->
      <div class="column">
        <article class="media mb-0">
          <figure class="media-left mr-4">
            <div class="avatar-shell" :style="{ '--rc': roleRingColor }">
              <div class="avatar-inner">
                <b-skeleton v-if="!avatarLoaded" :width="96" :height="96" animated style="border-radius:50%" />
                <img v-else :src="avatarUrl" alt="avatar" class="avatar-img" />
              </div>
              <div class="avatar-status-dot"></div>
            </div>
          </figure>

          <div class="media-content">
            <div class="tags mb-1">
              <span class="tag is-rounded is-uppercase has-text-weight-bold role-chip" :style="rolePillStyle">
                <i :class="roleIconClass" class="mr-1"></i>
                {{ roleLabel }}
              </span>
              <span class="tag is-rounded env-chip">{{ environmentLabel }}</span>
            </div>

            <p class="is-size-6 has-text-weight-semibold hero-soft mb-0">
              Bienvenido a <span class="has-text-weight-bold brand-solid">Eurovisión</span>
            </p>
            <h2 class="title is-4 mb-1 mt-0" v-if="!loading">
              {{ greeting }}, <strong>{{ firstName }}</strong>
            </h2>
            <b-skeleton v-else :width="220" :height="28" animated class="mt-1" />

            <p class="is-size-7 hero-soft mb-1" v-if="!loading">{{ userBio }}</p>
            <b-skeleton v-else :width="300" :height="16" animated class="mt-1 mb-1" />

            <div class="tags mb-0" v-if="!loading">
              <span class="is-size-7 hero-soft mr-3">
                <b-icon icon="clock" size="is-small" class="hm-icon" />
                Último acceso: <b>{{ lastLoginLabel }}</b>
              </span>
              <span class="is-size-7 hero-soft" v-if="user?.username">
                <b-icon icon="at" size="is-small" class="hm-icon" /> {{ user.username }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <!-- Columna derecha: perfil + stats rápidas -->
      <div class="column is-narrow is-12-mobile" v-if="!loading">
        <button class="button is-fullwidth profile-cta mb-3" @click="$router.push('/l/mi.perfil.panel')">
          <img :src="avatarUrl" class="pcta-avatar mr-2" alt="" />
          <span class="has-text-left">
            <span class="is-block is-size-7 has-text-weight-semibold">{{ firstName }}</span>
            <span class="is-block is-size-7 hero-soft">Administrar perfil</span>
          </span>
          <b-icon icon="arrow-right" size="is-small" class="ml-3 pcta-arrow" />
        </button>

        <nav class="level is-mobile hero-quick-stats px-4 py-2 mb-0">
          <div class="level-item has-text-centered" v-if="canSeeInventory">
            <div>
              <p class="title is-5 mb-0">{{ stats?.activeSheets ?? '—' }}</p>
              <p class="is-size-7 is-uppercase hero-soft">Hojas</p>
            </div>
          </div>
          <div class="level-item has-text-centered" v-if="canSeeOrders">
            <div>
              <p class="title is-5 mb-0">{{ stats?.ordersPending ?? '—' }}</p>
              <p class="is-size-7 is-uppercase hero-soft">Pendientes</p>
            </div>
          </div>
          <div class="level-item has-text-centered" v-if="canSeeDevolutions">
            <div>
              <p class="title is-5 mb-0">
                {{ (stats?.devolucionesPendientes ?? 0) + (stats?.devolucionesEnRevision ?? 0) }}
              </p>
              <p class="is-size-7 is-uppercase hero-soft">Devoluc.</p>
            </div>
          </div>
        </nav>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { getAvatar, AVATAR_DEFAULTS } from '@/utils/avatarHelper';

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  stats: { type: Object, default: null },
  roleLabel: { type: String, default: '' },
  roleIconClass: { type: String, default: '' },
  roleRingColor: { type: String, default: '#a332bd' },
  roleBannerStyle: { type: Object, default: () => ({}) },
  rolePillStyle: { type: Object, default: () => ({}) },
  environmentLabel: { type: String, default: '' },
  canSeeInventory: { type: Boolean, default: false },
  canSeeOrders: { type: Boolean, default: false },
  canSeeDevolutions: { type: Boolean, default: false },
});

const avatarLoaded = ref(false);
const avatarUrl = ref(AVATAR_DEFAULTS.DASHBOARD);

function loadAvatar(url) {
  avatarLoaded.value = false;
  avatarUrl.value = url;
  const img = new Image();
  img.src = url;
  img.onload = () => { avatarLoaded.value = true; };
  img.onerror = () => {
    avatarUrl.value = AVATAR_DEFAULTS.DASHBOARD;
    avatarLoaded.value = true;
  };
}

watch(() => props.user?.avatar, v => loadAvatar(getAvatar(v, 'DASHBOARD')), { immediate: true });

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
/* Identidad de color mate vía tokens — layout 100% Bulma */
.db-hero {
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* Avatar con anillo de rol sólido */
.avatar-shell {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--rc, var(--c-primary));
  padding: 3px;
}

.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--surface-solid);
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
  background: var(--c-success);
  border: 2.5px solid var(--surface-solid);
}

.role-chip {
  letter-spacing: 0.07em;
}

.env-chip {
  color: var(--text-muted);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}

.brand-solid {
  color: var(--c-primary);
}

.hero-soft {
  color: var(--text-muted);
}

.hm-icon {
  color: var(--c-primary);
  vertical-align: middle;
}

.profile-cta {
  height: auto;
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  justify-content: flex-start;
}

.profile-cta:hover {
  background: var(--bg-muted);
}

.pcta-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--border);
}

.pcta-arrow {
  color: var(--c-primary);
}

.hero-quick-stats {
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
</style>
