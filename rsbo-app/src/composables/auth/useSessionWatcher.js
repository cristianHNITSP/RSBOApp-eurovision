// src/composables/auth/useSessionWatcher.js
//
// Watcher singleton de sesión:
// - Hace polling a /access/session-info cada 2 min para conocer el `expiresAt` real.
// - Cada 30s recalcula segundos restantes y emite eventos:
//     * session:warning   cuando quedan <= WARNING_SECONDS (5 min)
//     * session:expired   cuando llegan a 0
// - Expone refresh() que fuerza /access/check-session (renueva si toca) y reactualiza expiresAt.
//
// El componente <SessionExpiryModal /> escucha estos eventos.

import { ref, computed } from "vue";
import { fetchSessionInfo, forceRenew } from "@/services/session";

const WARNING_SECONDS  = 5 * 60;       // 5 min
const TICK_MS          = 30 * 1000;    // recálculo local
const POLL_MS          = 2 * 60 * 1000; // refresca expiresAt desde server

const expiresAt       = ref(null); // Date | null
const secondsRemaining = computed(() => {
  if (!expiresAt.value) return Infinity;
  return Math.max(0, Math.floor((expiresAt.value.getTime() - Date.now()) / 1000));
});

let _tickTimer = null;
let _pollTimer = null;
let _started   = false;
let _warned    = false;
let _expired   = false;

function emit(name, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function tick() {
  if (!_started || !expiresAt.value) return;
  const s = secondsRemaining.value;

  if (s <= 0 && !_expired) {
    _expired = true;
    emit("session:expired");
    // También avisar al resto del sistema (router cache, etc.)
    emit("auth:session-expired");
    return;
  }

  if (s > 0 && s <= WARNING_SECONDS && !_warned) {
    _warned = true;
    emit("session:warning", { secondsRemaining: s });
  }

  // Si volvimos a tener bastante tiempo (renovó), reactivar el aviso para futuros ciclos
  if (s > WARNING_SECONDS && _warned) {
    _warned = false;
  }
}

async function poll() {
  try {
    const { data } = await fetchSessionInfo();
    if (data?.expiresAt) {
      expiresAt.value = new Date(data.expiresAt);
    }
  } catch {
    // Si falla con 401, el interceptor de axios ya redirige.
    // Otros fallos: los ignoramos en silencio.
  }
}

async function refresh() {
  try {
    await forceRenew();
    await poll(); // refresca el expiresAt visible
  } catch {
    /* noop */
  }
}

function reset() {
  expiresAt.value = null;
  _warned  = false;
  _expired = false;
}

function start() {
  if (_started) return;
  _started = true;
  _warned  = false;
  _expired = false;
  poll();
  _tickTimer = setInterval(tick, TICK_MS);
  _pollTimer = setInterval(poll, POLL_MS);
}

function stop() {
  _started = false;
  if (_tickTimer) clearInterval(_tickTimer);
  if (_pollTimer) clearInterval(_pollTimer);
  _tickTimer = null;
  _pollTimer = null;
  reset();
}

export function useSessionWatcher() {
  return {
    expiresAt,
    secondsRemaining,
    start,
    stop,
    refresh,
    poll,
    reset,
  };
}
