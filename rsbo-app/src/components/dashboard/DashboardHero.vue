<template>
  <section class="db-hero" v-motion-fade-visible-once>
    <div class="hero-role-line" :style="roleBannerStyle"></div>

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
            <span class="hm-item" v-if="user?.email">
              <i class="fas fa-envelope"></i> {{ user.email }}
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
            <span class="pcta-label">Administrar perfil</span>
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
            <div class="hqs-val">{{ stats?.devolucionesPendientes ?? '—' }}</div>
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
  user:             { type: Object,  default: null },
  loading:          { type: Boolean, default: false },
  stats:            { type: Object,  default: null },
  roleLabel:        { type: String,  default: '' },
  roleIconClass:    { type: String,  default: '' },
  roleRingColor:    { type: String,  default: '#906fe1' },
  roleBannerStyle:  { type: Object,  default: () => ({}) },
  rolePillStyle:    { type: Object,  default: () => ({}) },
  environmentLabel: { type: String,  default: '' },
  canSeeInventory:  { type: Boolean, default: false },
  canSeeOrders:     { type: Boolean, default: false },
  canSeeDevolutions:{ type: Boolean, default: false },
});

const avatarLoaded = ref(false);
const avatarUrl    = ref('https://github.com/octocat.png');

function loadAvatar(url) {
  avatarLoaded.value = false;
  avatarUrl.value = url;
  const img = new Image();
  img.src = url;
  img.onload  = () => { avatarLoaded.value = true; };
  img.onerror = () => { avatarUrl.value = 'https://github.com/octocat.png'; avatarLoaded.value = true; };
}

watch(() => props.user?.avatar, v => loadAvatar(v?.trim() ? v : 'https://github.com/octocat.png'), { immediate: true });

const greeting      = computed(() => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; });
const firstName     = computed(() => (props.user?.name || 'Usuario').split(' ')[0]);
const lastLoginLabel = computed(() => {
  if (!props.user?.lastLogin) return 'Primera sesión';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(props.user.lastLogin));
});

const ROLE_BIO = {
  root:        'Control total del sistema Eurovisión.',
  eurovision:  'Encargado general de la óptica.',
  supervisor:  'Supervisa operaciones diarias.',
  ventas:      'Atención al cliente y gestión de pedidos.',
  laboratorio: 'Técnico de laboratorio.',
};
const userBio = computed(() => props.user?.bio || ROLE_BIO[props.user?.roleName] || 'Usuario del sistema Eurovisión.');
</script>
