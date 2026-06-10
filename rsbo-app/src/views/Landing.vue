<!-- src/views/Landing.vue -->
<template>
  <section class="hero is-fullheight landing-hero">
    <FloatingIconsBackdrop
      :count="16"
      :icons="['glasses', 'eye', 'magnifying-glass', 'flask', 'box-open', 'droplet']"
    />

    <div class="hero-body landing-body">
      <div class="container">
        <div class="columns is-centered">
          <div class="column is-12-mobile is-10-tablet is-9-desktop is-7-widescreen">
            <div class="card login-card lq-enter">
              <div class="columns is-gapless is-multiline m-0">
                <!-- ── Panel de marca ───────────────────────────────
                     OJO: is-gapless fuerza padding:0 !important en .column,
                     por eso el padding vive en el wrapper interno. -->
                <div class="column is-12-mobile is-5-tablet login-brand is-flex is-align-items-center">
                  <div class="p-5">
                    <figure class="image is-64x64 mb-4">
                      <img src="/eurovision.svg" alt="Laboratorio Eurovisión" class="login-brand__logo" />
                    </figure>

                    <h1 class="title is-4 login-brand__title mb-2">Laboratorio Eurovisión</h1>
                    <p class="is-size-7 login-brand__soft mb-0">
                      Plataforma interna de inventario óptico, ventas y laboratorio.
                    </p>

                    <div class="mt-5">
                      <p class="icon-text is-align-items-center is-size-7 has-text-weight-semibold mb-2">
                        <b-icon icon="boxes-stacked" size="is-small" class="mr-2" />
                        <span>Inventario en tiempo real</span>
                      </p>
                      <p class="icon-text is-align-items-center is-size-7 has-text-weight-semibold mb-2">
                        <b-icon icon="flask" size="is-small" class="mr-2" />
                        <span>Pedidos directos a laboratorio</span>
                      </p>
                      <p class="icon-text is-align-items-center is-size-7 has-text-weight-semibold mb-0">
                        <b-icon icon="user-shield" size="is-small" class="mr-2" />
                        <span>Acceso seguro por roles</span>
                      </p>
                    </div>

                    <span class="tag is-rounded login-brand__tag mt-5">
                      Sistema interno · Acceso autorizado
                    </span>
                  </div>
                </div>

                <!-- ── Formulario ─────────────────────────────────── -->
                <div class="column is-12-mobile is-7-tablet login-form">
                  <div class="p-5">
                    <h2 class="title is-5 mb-1">Iniciar sesión</h2>
                    <p class="is-size-7 login-form__hint mb-5">
                      Usa las credenciales asignadas por tu administrador.
                    </p>

                    <b-field label="Nombre de usuario" label-position="on-border">
                      <b-input
                        v-model="credentials.username"
                        type="text"
                        icon="user"
                        placeholder="Tu usuario"
                        autocomplete="username"
                        @keyup.enter="loginUser"
                      />
                    </b-field>

                    <b-field label="Contraseña" label-position="on-border" class="mt-5">
                      <b-input
                        v-model="credentials.password"
                        type="password"
                        icon="lock"
                        placeholder="••••••••"
                        password-reveal
                        autocomplete="current-password"
                        @keyup.enter="loginUser"
                      />
                    </b-field>

                    <b-field class="mt-4">
                      <b-checkbox v-model="rememberUsername">Recordar usuario</b-checkbox>
                    </b-field>

                    <b-button
                      type="is-primary"
                      size="is-medium"
                      expanded
                      icon-left="sign-in-alt"
                      class="mt-4"
                      :loading="isLoggingIn"
                      :disabled="!canSubmit"
                      @click="loginUser"
                    >
                      Iniciar sesión
                    </b-button>

                    <p class="is-size-7 login-form__hint mt-5 mb-0">
                      <b-icon icon="shield-halved" size="is-small" class="mr-1" />
                      Conexión cifrada. Tu sesión expira automáticamente por inactividad.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p class="has-text-centered is-size-7 landing-foot mt-4">
              © {{ currentYear }} Laboratorio Eurovisión — ¿Problemas para entrar? Contacta a tu encargado.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthService } from "@/services/authService.js";
import { useLabToast } from "@/composables/shared/useLabToast";
import FloatingIconsBackdrop from "@/components/auth/FloatingIconsBackdrop.vue";

const route = useRoute();
const router = useRouter();
const { handleLogin } = useAuthService();
const { show: showToast } = useLabToast();

const isLoggingIn = ref(false);
const rememberUsername = ref(false);
const credentials = reactive({ username: "", password: "" });
const currentYear = new Date().getFullYear();

const SAVED_USERNAME_KEY = "euro.savedUsername";

const canSubmit = computed(() => {
  const u = String(credentials.username || "").trim();
  const p = String(credentials.password || "").trim();
  return u.length >= 4 && p.length > 0 && !isLoggingIn.value;
});

async function loginUser() {
  if (!canSubmit.value) return;

  // Guardar ANTES de handleLogin: el servicio purga las credenciales en memoria.
  if (rememberUsername.value) {
    localStorage.setItem(SAVED_USERNAME_KEY, credentials.username);
  } else {
    localStorage.removeItem(SAVED_USERNAME_KEY);
  }

  isLoggingIn.value = true;
  try {
    // El handleLogin del authService ya maneja la redirección y los toasts de éxito/error
    await handleLogin(credentials);
  } finally {
    isLoggingIn.value = false;
  }
}

onMounted(() => {
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
</script>

<style scoped>
/* Solo color/identidad vía tokens — layout y responsive son 100% Bulma */
.landing-hero {
  position: relative;
  background: var(--bg-base);
}

.landing-body {
  position: relative;
  z-index: 1;
}

.login-card {
  background: var(--surface-raised);
  border: 1px solid var(--border-solid);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

/* Panel de marca: púrpura profundo sólido (token de marca, no el primario
   de acento — en dark ese sería neón sobre área grande) */
.login-brand {
  background: var(--surface-brand);
  color: var(--text-on-brand);
}

.login-brand__logo {
  background: var(--bg-base);
  border: 1px solid var(--border-solid);
  border-radius: var(--radius-md);
  padding: 6px;
}

.login-brand__title,
.login-brand .icon-text {
  color: var(--text-on-brand);
}

.login-brand__soft {
  color: var(--text-on-brand);
  opacity: 0.82;
}

.login-brand__tag {
  background: var(--surface-brand-deep);
  color: var(--text-on-brand);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.68rem;
}

.login-form {
  background: var(--surface-raised);
}

.login-form__hint {
  color: var(--text-muted);
}

.landing-foot {
  color: var(--text-muted);
}
</style>
