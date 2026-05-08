<!-- src/views/Landing.vue -->
<template>
  <div class="landing-minimal">
    <!-- Fondo animado -->
    <div class="background-animated" ref="floatingContainer" aria-hidden="true"></div>

    <!-- Liquid Blobs -->
    <div class="liquid-blob liquid-blob--1"></div>
    <div class="liquid-blob liquid-blob--2"></div>
    <div class="liquid-blob liquid-blob--3"></div>

    <div class="login-wrapper">
      <div class="login-card animate-fade-up" :class="{ visible: isLoaded }">
        <header class="login-header">
          <img src="/eurovision.svg" alt="Laboratorio Eurovisión" class="login-logo" />
          <h1 class="login-title">Laboratorio Eurovisión</h1>
          <p class="login-subtitle">
            <span class="login-tag">Sistema interno <b>Acceso autorizado</b></span>
          </p>
        </header>

        <section class="login-body">
          <b-field label="Nombre de usuario" label-position="on-border">
            <b-input v-model="credentials.username" type="text" icon="user" placeholder="Tu usuario"
              @keyup.enter="loginUser" />
          </b-field>

          <b-field label="Contraseña" label-position="on-border">
            <b-input v-model="credentials.password" type="password" icon="lock" placeholder="••••••••" password-reveal
              @keyup.enter="loginUser" />
          </b-field>

          <div class="login-options">
            <b-checkbox v-model="rememberUsername">Recordar usuario</b-checkbox>
          </div>

          <b-button type="is-primary" :loading="isLoggingIn" :disabled="!canSubmit" icon-left="sign-in-alt" expanded
            class="btn-login" @click="loginUser">
            Iniciar sesión
          </b-button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthService } from "@/services/authService.js";
import { useLabToast } from "@/composables/shared/useLabToast";

const route = useRoute();
const router = useRouter();
const { handleLogin } = useAuthService();
const { show: showToast } = useLabToast();

const isLoaded = ref(false);
const isLoggingIn = ref(false);
const rememberUsername = ref(false);
const credentials = reactive({ username: "", password: "" });

/* =========================
 * FONDO ANIMADO (ICONOS FLOTANTES)
 * ========================= */
const floatingContainer = ref(null);
const icons = ref([]);
let cycleInterval = null;

const MAX_ICONS = 14;
const MIN_DISTANCE = 12;

const iconTypes = [
  { icon: "glasses", size: "fa-2x" },
  { icon: "eye", size: "fa-2x" },
  { icon: "search", size: "fa-2x" },
];

const animations = [
  { name: "floatUpDown", duration: 1.2 },
  { name: "floatLeftRight", duration: 1.0 },
  { name: "floatRotate", duration: 1.4 },
];

let nextId = 0;

function createIconElement(id) {
  const iconType = iconTypes[id % iconTypes.length];
  const anim = animations[id % animations.length];

  const el = document.createElement("i");
  el.classList.add("fas", `fa-${iconType.icon}`, "floating-icon", iconType.size);

  el.style.position = "absolute";
  el.style.animationName = anim.name;
  el.style.animationDuration = `${anim.duration}s`;
  el.style.animationTimingFunction = "ease-in-out";
  el.style.animationIterationCount = "infinite";
  el.style.animationDirection = Math.random() < 0.5 ? "normal" : "reverse";
  el.style.opacity = "0";
  el.style.pointerEvents = "none";
  el.style.userSelect = "none";

  return el;
}

function isPositionValid(top, left, currentEl) {
  for (const icon of icons.value) {
    if (icon === currentEl) continue;
    const t = parseFloat(icon.dataset.top);
    const l = parseFloat(icon.dataset.left);
    const dist = Math.sqrt((t - top) ** 2 + (l - left) ** 2);
    if (dist < MIN_DISTANCE) return false;
  }
  return true;
}

function setPosition(el) {
  let top, left, attempts = 0;
  do {
    top = Math.random() * 80 + 10;
    left = Math.random() * 80 + 10;
    attempts++;
  } while (!isPositionValid(top, left, el) && attempts < 50);

  el.style.top = `${top}%`;
  el.style.left = `${left}%`;
  el.dataset.top = String(top);
  el.dataset.left = String(left);
}

function initIcons() {
  const container = floatingContainer.value;
  if (!container) return;

  for (let i = 0; i < MAX_ICONS; i++) {
    const el = createIconElement(i);
    setPosition(el);
    container.appendChild(el);
    icons.value.push(el);

    setTimeout(() => {
      el.style.transition = "opacity 900ms ease-in-out";
      el.style.opacity = "0.20"; /* Aumentado */
    }, 30);
  }

  nextId = MAX_ICONS;
}

function cycleIcons() {
  const container = floatingContainer.value;
  if (!container) return;

  const icon = icons.value.shift();
  if (!icon) return;

  icon.style.transition = "opacity 700ms ease-in-out";
  icon.style.opacity = "0";

  setTimeout(() => {
    setPosition(icon);

    const anim = animations[nextId % animations.length];
    icon.style.animationName = anim.name;
    icon.style.animationDuration = `${anim.duration}s`;
    icon.style.animationDirection = Math.random() < 0.5 ? "normal" : "reverse";

    icon.style.transition = "opacity 900ms ease-in-out";
    icon.style.opacity = "0.20"; /* Aumentado */

    icons.value.push(icon);
  }, 720);

  nextId = (nextId + 1) % 1000000;
}

const SAVED_USERNAME_KEY = "euro.savedUsername";

const canSubmit = computed(() => {
  const u = String(credentials.username || "").trim();
  const p = String(credentials.password || "").trim();
  return u.length >= 4 && p.length > 0 && !isLoggingIn.value;
});

async function loginUser() {
  if (!canSubmit.value) return;

  isLoggingIn.value = true;
  try {
    // El handleLogin del authService ya maneja la redirección y los toasts de éxito/error
    await handleLogin(credentials);

    if (rememberUsername.value) {
      localStorage.setItem(SAVED_USERNAME_KEY, credentials.username);
    } else {
      localStorage.removeItem(SAVED_USERNAME_KEY);
    }
  } finally {
    isLoggingIn.value = false;
  }
}

onMounted(() => {
  initIcons();
  cycleInterval = window.setInterval(cycleIcons, 1600);

  // Animación de entrada
  setTimeout(() => { isLoaded.value = true; }, 100);

  // Restaurar usuario recordado
  const saved = localStorage.getItem(SAVED_USERNAME_KEY);
  if (saved) {
    credentials.username = saved;
    rememberUsername.value = true;
  }

  // Manejar razones de redirección por falta de auth
  const authReason = route.query.authReason;
  if (authReason) {
    showToast("Tu sesión ha expirado o no es válida. Por favor inicia sesión.", "is-warning", 4000);
    router.replace({ query: { ...route.query, authReason: undefined } });
  }
});

onBeforeUnmount(() => {
  if (cycleInterval) window.clearInterval(cycleInterval);
  const container = floatingContainer.value;
  if (container) container.innerHTML = "";
  icons.value = [];
});
</script>

<style scoped>
.landing-minimal {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background-color: var(--bg-base);
  background-image:
    radial-gradient(circle at 0% 0%, var(--c-primary-alpha), transparent 60%),
    radial-gradient(circle at 100% 0%, var(--c-sidebar-pink-alpha), transparent 60%),
    radial-gradient(circle at 50% 100%, var(--c-sidebar-warm-alpha), transparent 60%);
  background-size: 200% 200%;
  animation: liquidBg 15s ease infinite;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  transition: background-color var(--transition-slow);
}

@keyframes liquidBg {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Liquid Blobs */
.liquid-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px); /* Más blur */
  z-index: 0;
  opacity: 0.6; /* Más opacidad */
  animation: blobMove 25s infinite alternate ease-in-out;
}

.liquid-blob--1 {
  width: 600px;
  height: 600px;
  background: var(--c-primary);
  top: -200px;
  left: -200px;
}

.liquid-blob--2 {
  width: 550px;
  height: 550px;
  background: var(--c-sidebar-pink);
  bottom: -150px;
  right: -150px;
  animation-duration: 30s;
}

.liquid-blob--3 {
  width: 500px;
  height: 500px;
  background: var(--c-sidebar-warm);
  top: 20%;
  left: 55%;
  animation-duration: 35s;
}

@keyframes blobMove {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(40px, 60px) scale(1.1); }
}

/* fondo animado */
.background-animated {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
  z-index: 1;
}

.floating-icon {
  color: var(--c-primary);
  filter: blur(0.4px);
}

.login-wrapper {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 2;
}

.login-card {
  background: var(--surface-raised);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  transition: background-color var(--transition-base), border-color var(--transition-base);
}

/* Forzar legibilidad en labels e inputs de Buefy usando tokens */
:deep(.label) {
  color: var(--text-primary) !important;
  font-weight: 700;
  font-size: 0.85rem;
}

:deep(.input) {
  background: var(--bg-muted) !important;
  border: 1px solid var(--border-input) !important;
  color: var(--text-primary) !important;
  border-radius: var(--radius-md) !important;
  height: 2.8rem;
  transition: all var(--transition-fast) !important;
}

:deep(.input:focus) {
  border-color: var(--c-primary) !important;
  box-shadow: 0 0 0 3px var(--c-primary-alpha) !important;
}

:deep(.input::placeholder) {
  color: var(--text-muted) !important;
}

:deep(.checkbox) {
  color: var(--text-secondary) !important;
}

.login-header {
  padding: 3rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, var(--c-primary), var(--c-sidebar-pink));
  color: white;
  position: relative;
}

.login-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}

.login-logo {
  width: 54px;
  height: 54px;
  margin-bottom: 1rem;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.login-title {
  font-size: 1.5rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: -0.02em;
}

.login-subtitle {
  opacity: 0.9;
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 0.75rem;
}

.login-tag {
  background: rgba(255, 255, 255, 0.15);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: inline-block;
}

.login-body {
  padding: 2.5rem 2.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: transparent;
}

.login-options {
  margin-top: -0.5rem;
}

.btn-login {
  height: 3rem;
  font-weight: 700;
  border-radius: 12px;
  margin-top: 0.5rem;
}

.animate-fade-up {
  opacity: 0;
  transform: translateY(24px);
  transition: all 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}

.animate-fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 480px) {
  .login-body {
    padding: 2rem 1.5rem;
  }

  .login-header {
    padding: 2rem 1.5rem;
  }
}

/* keyframes */
@keyframes floatUpDown {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-22px) rotate(10deg); }
}

@keyframes floatLeftRight {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  50% { transform: translateX(70px) rotate(-10deg); }
}

@keyframes floatRotate {
  0%, 100% { transform: rotate(0) translateY(0); }
  50% { transform: rotate(360deg) translateY(-12px); }
}
</style>
