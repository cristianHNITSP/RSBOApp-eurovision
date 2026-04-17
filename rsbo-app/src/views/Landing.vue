<!-- src/views/LandingView.vue -->
<template>
  <div class="landing" ref="landingRoot">
    <!-- Fondo animado -->
    <div class="background-animated" ref="floatingContainer" aria-hidden="true"></div>

    <!-- Topbar -->
    <header class="landing-topbar">
      <div class="landing-topbar__inner container">
        <div class="brand" role="button" tabindex="0" @click="scrollToTop" @keyup.enter="scrollToTop">
          <img :src="logoImg" alt="Laboratorio Eurovisión" class="brand__logo" />
          <div class="brand__text">
            <p class="brand__name">Laboratorio Eurovisión</p>
            <p class="brand__tag">Sistema interno · Inventario y pedidos</p>
          </div>
        </div>

        <div class="topbar-actions">
          <span class="pill pill--info">
            <b-icon icon="lock" size="is-small" class="mr-1" />
            Uso interno
          </span>

          <b-button type="is-primary" size="is-small" icon-left="user" class="btn-cta" @click="openLogin">
            Iniciar sesión
          </b-button>
        </div>
      </div>
    </header>

    <!-- CONTENT -->
    <main class="landing-content">
      <!-- HERO -->
      <section class="hero hero-euro">
        <div class="container">
          <div class="columns is-vcentered is-variable is-7">
            <div class="column is-12-tablet is-6-desktop">
              <div class="pill-row animate-fade-up">
                <span class="pill pill--primary">
                  <b-icon icon="check-circle" size="is-small" class="mr-1" />
                  Control centralizado
                </span>
                <span class="pill pill--light">
                  <b-icon icon="chart-bar" size="is-small" class="mr-1" />
                  Indicadores al instante
                </span>
                <span class="pill pill--light">
                  <b-icon icon="shield-alt" size="is-small" class="mr-1" />
                  Acceso por roles
                </span>
              </div>

              <h1 class="hero-title animate-fade-up">
                Gestiona inventario, pedidos y usuarios<br />
                <span class="hero-title__accent">sin complicaciones</span>.
              </h1>

              <p class="hero-subtitle animate-fade-up">
                Plataforma interna del laboratorio para administrar existencias por combinaciones de graduación
                (esférica, cilíndrica, adición y base), con roles de acceso y registro de cambios.
              </p>

              <div class="hero-actions animate-fade-up">
                <b-button type="is-primary" size="is-medium" icon-left="sign-in-alt" class="btn-hero"
                  @click="openLogin">
                  Iniciar sesión
                </b-button>

                <a class="btn-ghost" href="#features">
                  <b-icon icon="info-circle" size="is-small" class="mr-1" />
                  Ver módulos
                </a>

                <a class="btn-ghost" href="#como">
                  <b-icon icon="play-circle" size="is-small" class="mr-1" />
                  Cómo funciona
                </a>
              </div>

              <p class="hero-note animate-fade-up">
                <b-icon icon="exclamation-circle" size="is-small" class="mr-1" />
                Acceso exclusivo para personal autorizado. Las cuentas se gestionan internamente.
              </p>
            </div>

            <div class="column is-12-tablet is-6-desktop">
              <!-- Preview -->
              <div class="preview-card animate-fade-up" role="presentation">
                <div class="preview-card__head">
                  <span class="pill pill--primary pill--sm">
                    <b-icon icon="layer-group" size="is-small" class="mr-1" />
                    Panel general
                  </span>
                  <span class="pill pill--light pill--sm">
                    <b-icon icon="sync-alt" size="is-small" class="mr-1" />
                    Al día
                  </span>
                </div>

                <div class="preview-card__body">
                  <div class="columns is-mobile is-multiline is-variable is-2">
                    <div class="column is-6">
                      <div class="mini-stat">
                        <p class="mini-stat__k">Plantillas</p>
                        <p class="mini-stat__v">Base · Esférica/Cilíndrica · Adición</p>
                      </div>
                    </div>
                    <div class="column is-6">
                      <div class="mini-stat">
                        <p class="mini-stat__k">Usuarios</p>
                        <p class="mini-stat__v">Roles y permisos</p>
                      </div>
                    </div>

                    <div class="column is-12">
                      <div class="mini-list">
                        <div class="mini-list__row">
                          <span class="dot dot--ok"></span>
                          <span>Existencias por rangos y pasos</span>
                        </div>
                        <div class="mini-list__row">
                          <span class="dot dot--warn"></span>
                          <span>Validación de límites definidos</span>
                        </div>
                        <div class="mini-list__row">
                          <span class="dot dot--info"></span>
                          <span>Registro de cambios (auditoría)</span>
                        </div>
                      </div>
                    </div>

                    <div class="column is-12">
                      <div class="preview-card__cta">
                        <b-button type="is-light" size="is-small" icon-left="user" @click="openLogin">
                          Acceder
                        </b-button>
                        <span class="is-size-7 has-text-grey">Sugerencia: activa “Recordar correo” para entrar más
                          rápido.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="preview-card__foot">
                  <span class="pill pill--light pill--sm">
                    <b-icon icon="life-ring" size="is-small" class="mr-1" />
                    Ayuda integrada
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- glows -->
        <div class="hero-glow hero-glow--a" aria-hidden="true"></div>
        <div class="hero-glow hero-glow--b" aria-hidden="true"></div>
      </section>

      <!-- FEATURES -->
      <section id="features" class="section section-soft">
        <div class="container">
          <header class="section-head">
            <span class="pill pill--primary">
              <b-icon icon="stars" size="is-small" class="mr-1" />
              Módulos principales
            </span>
            <h2 class="section-title">Todo lo esencial, bien organizado</h2>
            <p class="section-subtitle">
              Interfaz ágil y consistente, diseñada para el trabajo diario del laboratorio.
            </p>
          </header>

          <div class="columns is-multiline is-variable is-5">
            <div class="column is-12-mobile is-6-tablet is-3-desktop">
              <article class="feature-card animate-fade-up">
                <div class="feature-card__icon">
                  <b-icon icon="th" size="is-medium" />
                </div>
                <h3 class="feature-card__title">Inventario</h3>
                <p class="feature-card__text">
                  Plantillas por tipo (base, esférica/cilíndrica y esférica/adición), con filtros y validación.
                </p>
              </article>
            </div>

            <div class="column is-12-mobile is-6-tablet is-3-desktop">
              <article class="feature-card animate-fade-up">
                <div class="feature-card__icon">
                  <b-icon icon="users" size="is-medium" />
                </div>
                <h3 class="feature-card__title">Usuarios</h3>
                <p class="feature-card__text">
                  Roles, permisos y administración interna para mantener el control de acceso.
                </p>
              </article>
            </div>

            <div class="column is-12-mobile is-6-tablet is-3-desktop">
              <article class="feature-card animate-fade-up">
                <div class="feature-card__icon">
                  <b-icon icon="clipboard-check" size="is-medium" />
                </div>
                <h3 class="feature-card__title">Trazabilidad</h3>
                <p class="feature-card__text">
                  Registro claro de cambios: quién hizo qué y cuándo. Útil para revisión y control.
                </p>
              </article>
            </div>

            <div class="column is-12-mobile is-6-tablet is-3-desktop">
              <article class="feature-card animate-fade-up">
                <div class="feature-card__icon">
                  <b-icon icon="life-ring" size="is-medium" />
                </div>
                <h3 class="feature-card__title">Centro de ayuda</h3>
                <p class="feature-card__text">
                  Guías y soluciones para los casos más comunes, con soporte de consulta dentro del sistema.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- COMO FUNCIONA -->
      <section id="como" class="section">
        <div class="container">
          <header class="section-head">
            <span class="pill pill--light">
              <b-icon icon="play-circle" size="is-small" class="mr-1" />
              Cómo funciona
            </span>
            <h2 class="section-title">Un flujo simple y consistente</h2>
            <p class="section-subtitle">Inicia sesión, trabaja en plantillas y consulta el control del sistema.</p>
          </header>

          <div class="columns is-multiline is-variable is-5">
            <div class="column is-12-tablet is-4-desktop">
              <div class="step-card animate-fade-up">
                <div class="step-card__n">
                  <b-icon icon="sign-in-alt" size="is-small" />
                </div>
                <div class="step-card__body">
                  <p class="step-card__t">Paso 1</p>
                  <p class="step-card__d">Inicia sesión con tu cuenta del laboratorio.</p>
                </div>
              </div>
            </div>

            <div class="column is-12-tablet is-4-desktop">
              <div class="step-card animate-fade-up">
                <div class="step-card__n">
                  <b-icon icon="th" size="is-small" />
                </div>
                <div class="step-card__body">
                  <p class="step-card__t">Paso 2</p>
                  <p class="step-card__d">Gestiona plantillas, rangos y existencias con validación automática.</p>
                </div>
              </div>
            </div>

            <div class="column is-12-tablet is-4-desktop">
              <div class="step-card animate-fade-up">
                <div class="step-card__n">
                  <b-icon icon="clipboard-check" size="is-small" />
                </div>
                <div class="step-card__body">
                  <p class="step-card__t">Paso 3</p>
                  <p class="step-card__d">Revisa el historial de cambios y administra usuarios por rol.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="cta-strip animate-fade-up">
            <div class="cta-strip__left">
              <p class="cta-strip__t">¿Listo para acceder?</p>
              <p class="cta-strip__d">Ingresa al sistema interno con tu cuenta del laboratorio.</p>
            </div>
            <div class="cta-strip__right">
              <b-button type="is-primary" icon-left="sign-in-alt" @click="openLogin">
                Iniciar sesión
              </b-button>
            </div>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="landing-footer">
        <div class="container">
          <div class="footer-inner">
            <div class="footer-brand">
              <img :src="logoImg" alt="Laboratorio Eurovisión" class="footer-logo"
                style="object-fit: cover; width: 34px; height: 34px;" />
              <div>
                <p class="footer-name">Laboratorio Eurovisión</p>
                <p class="footer-copy">© {{ year }} · Todos los derechos reservados</p>
              </div>
            </div>

            <div class="footer-links">
              <a href="#features" class="footer-link">Módulos</a>
              <a href="#como" class="footer-link">Cómo funciona</a>
              <button class="footer-link button is-text" type="button" @click="openLogin">Acceder</button>
            </div>
          </div>
        </div>
      </footer>
    </main>

    <!-- LOGIN MODAL (BUEFY) -->
    <b-modal v-model="showLoginPanel" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in"
      aria-role="dialog" aria-modal :width="modalWidth" @after-enter="focusEmail">
      <div class="modal-card login-modal">
        <header class="modal-card-head login-modal__head">
          <div>
            <p class="modal-card-title login-modal__title">Iniciar sesión</p>
            <p class="login-modal__sub">Sistema interno · Laboratorio Eurovisión</p>
          </div>
        </header>

        <section class="modal-card-body login-modal__body">
          <div class="login-badge">
            <span class="pill pill--light pill--sm">
              <b-icon icon="shield-alt" size="is-small" class="mr-1" />
              Sesión protegida
            </span>
            <span class="pill pill--light pill--sm">
              <b-icon icon="clock" size="is-small" class="mr-1" />
              Expira automáticamente
            </span>
          </div>

          <b-field label="Correo electrónico" label-position="on-border">
            <b-input ref="emailInput" v-model="credentials.username" type="email" autocomplete="email" icon="envelope"
              placeholder="tu.correo@empresa.com" @keyup.enter="loginUser" />
          </b-field>

          <b-field label="Contraseña" label-position="on-border">
            <b-input v-model="credentials.password" :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password" icon="lock" placeholder="••••••••" password-reveal
              @keyup.enter="loginUser" />
          </b-field>

          <div class="login-tools">
            <b-checkbox v-model="rememberUsername" size="is-small">
              Recordar correo
            </b-checkbox>

            <button class="button is-text is-small" type="button" @click="showPassword = !showPassword">
              <span class="icon is-small">
                <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
              </span>
              <span>{{ showPassword ? "Ocultar" : "Mostrar" }}</span>
            </button>
          </div>

          <div class="login-hint">
            <b-icon icon="info-circle" size="is-small" class="mr-1" />
            Si olvidaste tu acceso, contacta al administrador del sistema.
          </div>
        </section>

        <footer class="modal-card-foot login-modal__foot">
          <b-button @click="showLoginPanel = false" :disabled="isLoggingIn">Cancelar</b-button>
          <b-button type="is-primary" :loading="isLoggingIn" :disabled="!canSubmit" icon-left="sign-in-alt"
            @click="loginUser">
            Entrar
          </b-button>
        </footer>
      </div>
    </b-modal>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useIntersectionObserver } from "@/composables/ui/useIntersectionObserver";
import { useAuthService } from "@/services/authService.js";
import { labToast } from "@/composables/shared/useLabToast";
import logoImg from "@/assets/img/logo-euro.png";

useIntersectionObserver(".animate-fade-up");

const route = useRoute();
const router = useRouter();

/* =========================
 * LOGIN (FUNCIONAL + PERSISTE CORREO)
 * ========================= */
const showLoginPanel = ref(false);
const showPassword = ref(false);
const rememberUsername = ref(false);
const isLoggingIn = ref(false);
const emailInput = ref(null);

const credentials = reactive({ username: "", password: "" });
const { handleLogin } = useAuthService();

const SAVED_USERNAME_KEY = "euro.savedUsername";

const canSubmit = computed(() => {
  const u = String(credentials.username || "").trim();
  const p = String(credentials.password || "").trim();
  return u.length > 4 && p.length > 0 && !isLoggingIn.value;
});

function openLogin() {
  showLoginPanel.value = true;
}

function focusEmail() {
  // intenta foco en input al abrir modal
  nextTick(() => {
    const el = emailInput.value;
    // b-input expone .focus() en algunos builds; si no, fallback al input interno
    if (el?.focus) return el.focus();
    const inp = el?.$el?.querySelector?.("input");
    inp?.focus?.();
  });
}

async function loginUser() {
  if (!canSubmit.value) return;

  isLoggingIn.value = true;
  try {
    // Mantiene tu lógica existente: tu authService maneja tokens/toasts/redirects
    await Promise.resolve(handleLogin(credentials, showLoginPanel));

    // Persistencia de correo
    if (rememberUsername.value) {
      const u = String(credentials.username || "").trim();
      if (u) localStorage.setItem(SAVED_USERNAME_KEY, u);
    } else {
      localStorage.removeItem(SAVED_USERNAME_KEY);
    }

    credentials.password = "";
  } finally {
    isLoggingIn.value = false;
  }
}

/**
 * Persistencia “en vivo”:
 * - si marcas recordar, guarda al escribir
 * - si desmarcas, borra
 */
watch(rememberUsername, (on) => {
  if (!on) {
    localStorage.removeItem(SAVED_USERNAME_KEY);
    return;
  }
  const u = String(credentials.username || "").trim();
  if (u) localStorage.setItem(SAVED_USERNAME_KEY, u);
});

watch(
  () => credentials.username,
  (u) => {
    if (!rememberUsername.value) return;
    const cleaned = String(u || "").trim();
    if (cleaned) localStorage.setItem(SAVED_USERNAME_KEY, cleaned);
  }
);

/* =========================
 * AUTH REASON -> TOAST + ABRIR MODAL
 * ========================= */
const AUTH_REASON_TO_TOAST = {
  "no-token": { message: "Necesitas iniciar sesión para continuar.", type: "is-warning" },
  "token-expired": { message: "Tu sesión expiró. Inicia sesión nuevamente.", type: "is-warning" },
  "invalid-token": { message: "No pudimos validar tu sesión. Inicia sesión de nuevo.", type: "is-danger" },
};

onMounted(() => {
  // Restaurar usuario recordado
  const saved = localStorage.getItem(SAVED_USERNAME_KEY);
  if (saved) {
    credentials.username = saved;
    rememberUsername.value = true;
  }

  // Query authReason en redirect
  const authReason = route.query.authReason;
  if (authReason) {
    const toastConfig =
      AUTH_REASON_TO_TOAST[authReason] || { message: "Tu sesión no está activa. Inicia sesión para continuar.", type: "is-danger" };

    labToast.show(toastConfig.message, toastConfig.type, 4000);
    showLoginPanel.value = true;

    router.replace({ query: { ...route.query, authReason: undefined } });
  }

  // Toast global opcional
  const showToast = (event) => {
    const detail = event?.detail;
    const message =
      typeof detail === "object" && detail?.message
        ? detail.message
        : detail || "Tu sesión expiró. Inicia sesión nuevamente.";
    const type = typeof detail === "object" && detail?.type ? detail.type : "is-danger";
    labToast.show(message, type, 3000);
  };

  window.addEventListener("show-toast-session-expired", showToast);
  onBeforeUnmount(() => window.removeEventListener("show-toast-session-expired", showToast));
});

/* =========================
 * MODAL RESPONSIVE (FIX MOBILE)
 * ========================= */
const modalWidth = ref(560);

function updateModalWidth() {
  const w = typeof window !== "undefined" ? window.innerWidth : 560;
  modalWidth.value = Math.min(560, Math.max(320, w - 24));
}

onMounted(() => {
  updateModalWidth();
  window.addEventListener("resize", updateModalWidth, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateModalWidth);
});

/* =========================
 * UX HELPERS + SCROLL (FIX)
 * ========================= */
const year = computed(() => new Date().getFullYear());
const landingRoot = ref(null);

function scrollToTop() {
  // IMPORTANTE: como .landing tiene overflow-y:auto, scrolleamos el contenedor
  const el = landingRoot.value;
  if (el && typeof el.scrollTo === "function") {
    el.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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
      el.style.opacity = "0.10";
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
    icon.style.opacity = "0.10";

    icons.value.push(icon);
  }, 720);

  nextId = (nextId + 1) % 1000000;
}

onMounted(() => {
  initIcons();
  cycleInterval = window.setInterval(cycleIcons, 1600);
});

onBeforeUnmount(() => {
  if (cycleInterval) window.clearInterval(cycleInterval);
  const container = floatingContainer.value;
  if (container) container.innerHTML = "";
  icons.value = [];
});
</script>

<style scoped>
/* =========================
 * IMPORTANTE: FIX SCROLL VERTICAL
 * ========================= */
.landing {
  --primary: var(--c-primary);
  --border: var(--border);
  --shadow: var(--shadow-soft);
  --shadow-2: var(--shadow-lg);

  /* FIX: 100vh en móvil puede fallar; dvh se adapta mejor */
  height: 100dvh;
  min-height: 100vh;

  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;

  position: relative;
  background:
    radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.12), transparent 55%),
    radial-gradient(circle at 100% 10%, rgba(236, 72, 153, 0.10), transparent 55%),
    radial-gradient(circle at 60% 100%, rgba(249, 115, 22, 0.10), transparent 55%),
    var(--surface-solid);
}

/* contenido por encima del fondo */
.landing-content {
  position: relative;
  z-index: 1;
}

/* fondo animado */
.background-animated {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

.floating-icon {
  color: rgba(79, 70, 229, 0.55);
  filter: blur(0.2px);
}

/* TOPBAR */
.landing-topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  background: var(--surface-overlay);
  border-bottom: 1px solid var(--border);
}

.landing-topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0.75rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
  user-select: none;
}

.brand__logo {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  object-fit: cover;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.35);
}

.brand__name {
  font-weight: 900;
  font-size: 0.95rem;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.05;
}

.brand__tag {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

/* HERO */
.hero-euro {
  position: relative;
  padding: 3.5rem 0 1.5rem;
}

.hero-title {
  font-weight: 900;
  font-size: 2.25rem;
  line-height: 1.05;
  color: var(--text-primary);
  margin-top: 0.75rem;
}

.hero-title__accent {
  background: linear-gradient(90deg, #4f46e5, #9a6dff, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-subtitle {
  margin-top: 0.85rem;
  font-size: 1rem;
  color: var(--text-secondary);
  max-width: 54ch;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.1rem;
  align-items: center;
}

.btn-hero {
  border-radius: 14px !important;
  box-shadow: 0 16px 32px rgba(79, 70, 229, 0.18);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.30);
  background: var(--surface-overlay);
  color: var(--text-primary);
  font-size: 0.85rem;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.btn-ghost:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  background: var(--surface-solid);
}

.hero-note {
  margin-top: 1rem;
  font-size: 0.82rem;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

/* pills */
.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

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
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  border-color: rgba(79, 70, 229, 0.18);
}

.pill--info {
  color: var(--text-primary);
  background: rgba(15, 23, 42, 0.06);
  border-color: var(--border);
}

.pill--light {
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  border-color: rgba(79, 70, 229, 0.12);
}

.pill--sm {
  font-size: 0.68rem;
  padding: 0.18rem 0.5rem;
}

.btn-cta {
  border-radius: 12px !important;
}

/* preview card */
.preview-card {
  border-radius: 16px;
  box-shadow: var(--shadow-2);
  border: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  overflow: hidden;
}

.preview-card__head,
.preview-card__foot {
  padding: 0.85rem 0.95rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
  background: radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.10), transparent 55%), var(--surface-raised);
  border-bottom: 1px solid var(--border);
}

.preview-card__foot {
  border-top: 1px solid var(--border);
  border-bottom: none;
}

.preview-card__body {
  padding: 0.95rem;
}

.mini-stat {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.7rem 0.75rem;
  background: var(--bg-subtle);
}

.mini-stat__k {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 800;
}

.mini-stat__v {
  margin: 0.15rem 0 0;
  font-size: 0.86rem;
  color: var(--text-primary);
  font-weight: 900;
}

.mini-list {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-solid);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mini-list__row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.25);
}

.dot--ok {
  background: #10b981;
}

.dot--warn {
  background: #f59e0b;
}

.dot--info {
  background: #60a5fa;
}

.preview-card__cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

/* sections */
.section-soft {
  border-top: 1px solid var(--border);
  background: var(--surface-overlay);
}

.section-head {
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--text-primary);
  margin: 0.15rem 0 0;
}

.section-subtitle {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  max-width: 70ch;
}

/* feature cards */
.feature-card {
  border-radius: 16px;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  padding: 1rem;
  height: 100%;
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.feature-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--primary);
  background: var(--c-primary-alpha);
  border: 1px solid rgba(79, 70, 229, 0.18);
}

.feature-card__title {
  margin: 0.65rem 0 0;
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--text-primary);
}

.feature-card__text {
  margin: 0.35rem 0 0;
  font-size: 0.86rem;
  color: var(--text-secondary);
  line-height: 1.25;
}

/* COMO FUNCIONA */
.step-card {
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface-solid);
  box-shadow: var(--shadow);
  padding: 0.95rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  height: 100%;
}

.step-card__n {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  border: 1px solid rgba(79, 70, 229, 0.18);
}

.step-card__t {
  margin: 0;
  font-weight: 900;
  color: var(--text-primary);
}

.step-card__d {
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.25;
}

.cta-strip {
  margin-top: 1.2rem;
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.18);
  background: radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.10), transparent 60%), var(--surface-solid);
  box-shadow: var(--shadow);
  padding: 0.95rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.cta-strip__t {
  margin: 0;
  font-weight: 900;
  color: var(--text-primary);
}

.cta-strip__d {
  margin: 0.15rem 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .cta-strip {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* footer */
.landing-footer {
  border-top: 1px solid var(--border);
  padding: 1.25rem 0;
  background: var(--surface-overlay);
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.footer-logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.35);
}

.footer-name {
  margin: 0;
  font-weight: 900;
  color: var(--text-primary);
}

.footer-copy {
  margin: 0.1rem 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.footer-link {
  color: var(--c-primary);
  font-weight: 800;
  font-size: 0.85rem;
}

/* glows */
.hero-glow {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  filter: blur(48px);
  opacity: 0.35;
  pointer-events: none;
}

.hero-glow--a {
  top: -180px;
  right: -140px;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.75), transparent 60%);
}

.hero-glow--b {
  bottom: -220px;
  left: -160px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.55), transparent 60%);
}

/* login modal */
.login-modal {
  border-radius: 16px;
  overflow: hidden;
}

.login-modal__head {
  background: linear-gradient(135deg, #4f46e5, #9a6dff, #ec4899);
  border-bottom: none;
}

.login-modal__title {
  color: var(--text-on-primary);
  font-weight: 900;
}

.login-modal__sub {
  margin: 0.15rem 0 0;
  color: var(--surface);
  font-size: 0.8rem;
  font-weight: 700;
}

.login-modal__body {
  background: radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.08), transparent 55%), var(--surface-solid);
}

.login-badge {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.login-tools {
  margin-top: 0.35rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.login-hint {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  background: var(--c-primary-alpha);
  border: 1px solid var(--border-strong);
  padding: 0.55rem 0.65rem;
  border-radius: 12px;
}

.login-modal__foot {
  justify-content: flex-end;
  gap: 0.5rem;
}

/* animate-fade-up */
.animate-fade-up {
  opacity: 0;
  transform: translateY(16px);
  transition: all 0.55s ease;
}

.animate-fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* keyframes */
@keyframes floatUpDown {

  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-22px) rotate(10deg);
  }
}

@keyframes floatLeftRight {

  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }

  50% {
    transform: translateX(70px) rotate(-10deg);
  }
}

@keyframes floatRotate {

  0%,
  100% {
    transform: rotate(0) translateY(0);
  }

  50% {
    transform: rotate(360deg) translateY(-12px);
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 1.85rem;
  }

  .landing-topbar__inner {
    padding: 0.75rem 0.6rem;
  }
}

/* =========================
 * MOBILE HARDENING (FIXES)
 * ========================= */

/* Bulma container: padding consistente en móvil */
:deep(.container) {
  padding-left: 1rem;
  padding-right: 1rem;
}

/* Topbar: wrap + ocultar tag para evitar overflow */
@media (max-width: 520px) {
  .landing-topbar__inner {
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .brand__logo {
    width: 34px;
    height: 34px;
  }

  .brand__name {
    font-size: 0.9rem;
  }

  .brand__tag {
    display: none;
  }

  .topbar-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .pill--info {
    letter-spacing: 0.06em;
    padding: 0.18rem 0.45rem;
  }
}

/* Hero CTAs a una columna en pantallas muy angostas */
@media (max-width: 420px) {
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-hero {
    width: 100%;
  }

  .btn-ghost {
    width: 100%;
    justify-content: center;
  }

  .hero-title {
    font-size: 1.65rem;
    line-height: 1.08;
  }

  .hero-subtitle {
    font-size: 0.95rem;
  }
}

/* Preview CTA: evitar empujes y overflow */
@media (max-width: 420px) {
  .preview-card__cta {
    flex-direction: column;
    align-items: stretch;
  }

  .preview-card__cta .is-size-7 {
    width: 100%;
  }
}

/* Footer: links envuelven */
@media (max-width: 520px) {
  .footer-links {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 0.6rem 0.9rem;
  }
}

@media (prefers-reduced-motion: reduce) {

  .floating-icon,
  .animate-fade-up,
  .feature-card,
  .btn-ghost {
    transition: none !important;
    animation: none !important;
  }
}
</style>
