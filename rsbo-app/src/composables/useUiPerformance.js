// src/composables/useUiPerformance.js
import { ref, readonly } from "vue";

const KEY = "ui-reduced-motion"; // separado de reduced-effects
const reducedMotion = ref(false);

function applyToHtml(enabled) {
  const html = document.documentElement;
  if (enabled) html.setAttribute("data-reduced-motion", "true");
  else html.removeAttribute("data-reduced-motion");
}

function readFromStorage() {
  const saved = localStorage.getItem(KEY);
  const enabled = saved === "true";
  reducedMotion.value = enabled;
  applyToHtml(enabled);
}

function setReducedMotion(val) {
  const enabled = !!val;
  reducedMotion.value = enabled;
  localStorage.setItem(KEY, enabled ? "true" : "false");
  applyToHtml(enabled);

  // ✅ notifica a otros tabs/componentes (mismo tab)
  window.dispatchEvent(new CustomEvent("ui:reduced-motion", { detail: enabled }));
}

let listenersReady = false;
function ensureListeners() {
  if (listenersReady) return;
  listenersReady = true;

  // cambios desde otra pestaña
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) readFromStorage();
  });

  // cambios desde el mismo tab (evento custom)
  window.addEventListener("ui:reduced-motion", (e) => {
    const enabled = !!e.detail;
    reducedMotion.value = enabled;
    applyToHtml(enabled);
  });
}

// ✅ aplicar inmediato (evita flash)
if (typeof window !== "undefined") {
  readFromStorage();
  ensureListeners();
}

export function useUiPerformance() {
  return {
    reducedMotion: readonly(reducedMotion),
    setReducedMotion,
    refreshReducedMotion: readFromStorage,
  };
}
