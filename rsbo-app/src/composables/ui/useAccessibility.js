// src/composables/ui/useAccessibility.js
import { reactive, readonly } from "vue";

/**
 * ============================================================
 * useAccessibility.js — GESTOR DE PREFERENCIAS DE USUARIO
 * ============================================================
 * Centraliza la persistencia (localStorage), el estado reactivo
 * y la aplicación de estilos al DOM (data-attributes) para
 * temas, fuentes, movimiento y contraste.
 * ============================================================
 */

export const UI_EVENT = "rsbo:ui";

// ─── REGISTRO DE PREFERENCIAS ────────────────────────────────────
// Cada entrada define cómo se comporta una preferencia.
// Esto permite extender el sistema sin crear funciones repetitivas.
const PREFERENCES = {
  theme: {
    key: "ui-theme",
    default: "system",
    valid: ["light", "dark", "system"],
    apply: (val) => {
      const resolved = val === "system" 
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : val;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      return { resolvedTheme: resolved };
    }
  },
  fontSize: {
    key: "ui-font-size",
    default: "md",
    map: { xs: "85%", sm: "92.5%", md: "100%", lg: "112.5%" },
    apply: (val, config) => {
      const mapped = config.map[val] || config.map.md;
      document.documentElement.style.fontSize = mapped;
    }
  },
  reducedMotion: {
    key: "ui-reduced-motion",
    default: "system",
    apply: (val) => {
      const isSystem = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const enabled = val === "on" ? true : (val === "off" ? false : isSystem);
      document.documentElement.dataset.reducedMotion = String(enabled);
      return { resolvedReducedMotion: enabled };
    }
  },
  reducedEffects: {
    key: "ui-reduced-effects",
    default: false,
    apply: (val) => {
      if (val) document.documentElement.dataset.reducedEffects = "true";
      else document.documentElement.removeAttribute("data-reduced-effects");
    }
  },
  contrast: {
    key: "ui-contrast",
    default: "normal",
    valid: ["normal", "high"],
    apply: (val) => {
      document.documentElement.dataset.contrast = val;
    }
  },
  readableFont: {
    key: "ui-readable-font",
    default: false,
    apply: (val) => {
      document.documentElement.dataset.readableFont = String(val);
    }
  },
  focusOutline: {
    key: "ui-focus-outline",
    default: true,
    apply: (val) => {
      document.documentElement.dataset.focusOutline = String(val);
    }
  }
};

// ─── ESTADO SINGLETON ────────────────────────────────────────────
const state = reactive({
  resolvedTheme: "light",
  resolvedReducedMotion: false,
  ...Object.fromEntries(Object.entries(PREFERENCES).map(([k, v]) => [k, v.default]))
});

let initialized = false;

// ─── UTILIDADES INTERNAS ──────────────────────────────────────────
const storage = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, String(val)); } catch (e) { console.warn("[a11y] Storage block", e); } }
};

const orchestrator = {
  /** Aplica una preferencia al estado y al DOM */
  apply: (id, value) => {
    const config = PREFERENCES[id];
    if (!config) return;

    // Validar si aplica
    if (config.valid && !config.valid.includes(value)) value = config.default;
    
    // Ejecutar lógica de aplicación DOM
    const result = config.apply(value, config);
    
    // Actualizar estado reactivo
    state[id] = value;
    if (result) Object.assign(state, result);
  },

  /** Persiste y aplica una preferencia */
  set: (id, value) => {
    orchestrator.apply(id, value);
    storage.set(PREFERENCES[id].key, value);
  },

  /** Cicla entre valores (boolean o lista) */
  toggle: (id) => {
    const config = PREFERENCES[id];
    const current = state[id];
    if (typeof current === "boolean") {
      orchestrator.set(id, !current);
    } else if (config.valid) {
      const idx = config.valid.indexOf(current);
      const next = config.valid[(idx + 1) % config.valid.length];
      orchestrator.set(id, next);
    } else if (id === "reducedMotion") {
      // Caso especial manual para alternar on/off/system si se desea, 
      // o simplemente alternar on/off.
      orchestrator.set(id, current === "on" ? "off" : "on");
    }
  }
};

// ─── HANDLERS ────────────────────────────────────────────────────
function handleUiEvent(e) {
  const { type, value } = e?.detail || {};
  if (!type) return;

  // Mapeo automático de eventos rsbo:ui -> orquestador
  const actionMap = {
    "set-theme": () => orchestrator.set("theme", value),
    "toggle-dark": () => orchestrator.toggle("theme"),
    "set-font": () => orchestrator.set("fontSize", value),
    "set-reduced-motion": () => orchestrator.set("reducedMotion", value),
    "toggle-reduced-motion": () => orchestrator.toggle("reducedMotion"),
    "set-reduced-effects": () => orchestrator.set("reducedEffects", !!value),
    "toggle-reduced-effects": () => orchestrator.toggle("reducedEffects"),
    "set-contrast": () => orchestrator.set("contrast", value),
    "toggle-contrast": () => orchestrator.toggle("contrast"),
    "set-readable-font": () => orchestrator.set("readableFont", !!value),
    "toggle-readable-font": () => orchestrator.toggle("readableFont"),
    "set-focus-outline": () => orchestrator.set("focusOutline", !!value),
    "toggle-focus-outline": () => orchestrator.toggle("focusOutline"),
  };

  if (actionMap[type]) actionMap[type]();
}

function initAccessibility() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // 1. Cargar desde Storage
  Object.keys(PREFERENCES).forEach(id => {
    const saved = storage.get(PREFERENCES[id].key);
    if (saved !== null) {
      let val = saved;
      if (typeof PREFERENCES[id].default === "boolean") val = saved === "true";
      state[id] = val;
    }
  });

  // 2. Aplicar todo al DOM inicialmente
  Object.keys(PREFERENCES).forEach(id => orchestrator.apply(id, state[id]));

  // 3. Listeners de sistema
  const mediaDark = window.matchMedia("(prefers-color-scheme: dark)");
  const mediaReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  mediaDark.addEventListener?.("change", () => { if (state.theme === "system") orchestrator.apply("theme", "system"); });
  mediaReduced.addEventListener?.("change", () => { if (state.reducedMotion === "system") orchestrator.apply("reducedMotion", "system"); });
  
  window.addEventListener(UI_EVENT, handleUiEvent);
}

// ─── EXPORTACIÓN ─────────────────────────────────────────────────
export function useAccessibility() {
  initAccessibility();

  return {
    state: readonly(state),
    // Acciones granulares expuestas
    setTheme: (v) => orchestrator.set("theme", v),
    toggleTheme: () => orchestrator.toggle("theme"),
    setFontSize: (v) => orchestrator.set("fontSize", v),
    setReducedMotion: (v) => orchestrator.set("reducedMotion", v),
    toggleReducedMotion: () => orchestrator.toggle("reducedMotion"),
    setReducedEffects: (v) => orchestrator.set("reducedEffects", v),
    toggleReducedEffects: () => orchestrator.toggle("reducedEffects"),
    setContrast: (v) => orchestrator.set("contrast", v),
    toggleContrast: () => orchestrator.toggle("contrast"),
    setReadableFont: (v) => orchestrator.set("readableFont", v),
    toggleReadableFont: () => orchestrator.toggle("readableFont"),
    setFocusOutline: (v) => orchestrator.set("focusOutline", v),
    toggleFocusOutline: () => orchestrator.toggle("focusOutline"),
    // Cleanup
    dispose: () => {
      window.removeEventListener(UI_EVENT, handleUiEvent);
      initialized = false;
    }
  };
}
