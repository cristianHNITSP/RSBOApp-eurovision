<template>
  <b-modal
    :model-value="mode !== 'idle'"
    :can-cancel="mode === 'warning' ? ['escape'] : false"
    has-modal-card
    trap-focus
    :destroy-on-hide="false"
    aria-role="alertdialog"
    aria-modal
    @update:model-value="onModalToggle"
  >
    <div class="modal-card sx-card">
      <header class="modal-card-head" :class="headClass">
        <p class="modal-card-title">
          <b-icon
            pack="fas"
            :icon="mode === 'expired' ? 'lock' : 'hourglass-half'"
            class="mr-2"
          />
          {{ mode === 'expired' ? 'Sesión expirada' : 'Tu sesión está por expirar' }}
        </p>
      </header>

      <section class="modal-card-body sx-body">
        <template v-if="mode === 'warning'">
          <p class="mb-2">
            Por seguridad, tu sesión se cerrará automáticamente en
            <strong>{{ countdownLabel }}</strong>.
          </p>
          <p class="is-size-7 has-text-grey">
            Pulsa <strong>Seguir conectado</strong> para extenderla.
          </p>
        </template>

        <template v-else>
          <p class="mb-2">
            Tu sesión expiró por inactividad. Para continuar trabajando necesitas
            iniciar sesión nuevamente.
          </p>
          <p class="is-size-7 has-text-grey">
            Los cambios sin guardar pueden perderse.
          </p>
        </template>
      </section>

      <footer class="modal-card-foot sx-foot">
        <template v-if="mode === 'warning'">
          <b-button @click="logoutNow" :disabled="busy">Cerrar sesión</b-button>
          <b-button
            type="is-primary"
            icon-pack="fas"
            icon-left="rotate"
            :loading="busy"
            @click="extend"
          >
            Seguir conectado
          </b-button>
        </template>

        <template v-else>
          <b-button
            type="is-primary"
            icon-pack="fas"
            icon-left="sign-in-alt"
            @click="goToLogin"
          >
            Iniciar sesión
          </b-button>
        </template>
      </footer>
    </div>
  </b-modal>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useSessionWatcher } from "@/composables/auth/useSessionWatcher";

const watcher = useSessionWatcher();

const mode = ref("idle"); // 'idle' | 'warning' | 'expired'
const busy = ref(false);

const headClass = computed(() =>
  mode.value === "expired" ? "sx-head--danger" : "sx-head--warning"
);

const countdownLabel = computed(() => {
  const s = watcher.secondsRemaining.value;
  if (!Number.isFinite(s)) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")} min`;
});

function onWarning() {
  if (mode.value === "expired") return;
  mode.value = "warning";
}

function onExpired() {
  mode.value = "expired";
}

async function extend() {
  busy.value = true;
  try {
    await watcher.refresh();
    if (watcher.secondsRemaining.value > 5 * 60) {
      mode.value = "idle";
    }
  } finally {
    busy.value = false;
  }
}

async function logoutNow() {
  // Disparar el evento de expiración: el resto del sistema (axios, router) lo maneja.
  window.dispatchEvent(new CustomEvent("auth:session-expired"));
  window.location.href = "/";
}

function goToLogin() {
  window.location.href = "/";
}

function onModalToggle(open) {
  // En modo warning permitimos cerrar con escape: pasa a idle hasta el próximo tick.
  if (!open && mode.value === "warning") mode.value = "idle";
}

onMounted(() => {
  window.addEventListener("session:warning", onWarning);
  window.addEventListener("session:expired", onExpired);
});

onBeforeUnmount(() => {
  window.removeEventListener("session:warning", onWarning);
  window.removeEventListener("session:expired", onExpired);
});
</script>

<style scoped>
.sx-card { max-width: 460px; width: 100%; }
.sx-body { padding: 1.1rem 1.25rem; }
.sx-foot { justify-content: flex-end; gap: 0.5rem; }

.sx-head--warning {
  background: rgba(254, 243, 199, 0.92);
  color: rgba(120, 53, 15, 0.95);
}
.sx-head--danger {
  background: rgba(254, 226, 226, 0.92);
  color: rgba(127, 29, 29, 0.95);
}
.sx-head--warning .modal-card-title,
.sx-head--danger .modal-card-title {
  color: inherit;
  font-weight: 800;
}
</style>
