// src/composables/useAccessibility.js
import { reactive, readonly } from "vue";

const UI_EVENT = "rsbo:ui";

const STORAGE_KEYS = {
  theme: "ui-theme", // light | dark | system
  fontSize: "ui-font-size", // xs | sm | md | lg
  reducedMotion: "ui-reduced-motion", // on | off | system
  reducedEffects: "ui-reduced-effects", // boolean
  contrast: "ui-contrast", // high | normal
  readableFont: "ui-readable-font", // boolean
  focusOutline: "ui-focus-outline", // boolean
};

const FONT_SIZES = {
  xs: "85%",
  sm: "92.5%",
  md: "100%",
  lg: "112.5%",
};

let initialized = false;

const mediaDark = window.matchMedia("(prefers-color-scheme: dark)");
const mediaReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = reactive({
  theme: "system",
  resolvedTheme: "light",
  fontSize: "md",
  reducedMotionPref: "system",
  resolvedReducedMotion: false,
  reducedEffects: false,
  contrast: "normal",
  readableFont: false,
  focusOutline: true,
});

function persist(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn("[a11y] persist failed", err);
  }
}

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function resolveTheme(theme) {
  const base = ["light", "dark", "system"].includes(theme) ? theme : "system";
  return base === "system" ? (mediaDark.matches ? "dark" : "light") : base;
}

function applyTheme(theme) {
  state.theme = ["light", "dark", "system"].includes(theme) ? theme : "system";
  state.resolvedTheme = resolveTheme(state.theme);

  const html = document.documentElement;
  html.dataset.theme = state.resolvedTheme;
  html.style.colorScheme = state.resolvedTheme === "dark" ? "dark" : "light";
}

function setTheme(theme) {
  applyTheme(theme);
  persist(STORAGE_KEYS.theme, state.theme);
}

function toggleTheme() {
  const next = state.resolvedTheme === "dark" ? "light" : "dark";
  setTheme(next);
}

function applyFontSize(sizeKey) {
  const key = FONT_SIZES[sizeKey] ? sizeKey : "md";
  state.fontSize = key;
  document.documentElement.style.fontSize = FONT_SIZES[key];
}

function setFontSize(sizeKey) {
  applyFontSize(sizeKey);
  persist(STORAGE_KEYS.fontSize, state.fontSize);
}

function applyReducedMotion(pref) {
  const mode = ["on", "off", "system"].includes(pref) ? pref : "system";
  state.reducedMotionPref = mode;
  const enabled =
    mode === "on" ? true : mode === "off" ? false : mediaReduced.matches;
  state.resolvedReducedMotion = enabled;
  document.documentElement.dataset.reducedMotion = enabled ? "true" : "false";
}

function setReducedMotion(pref) {
  applyReducedMotion(pref);
  persist(STORAGE_KEYS.reducedMotion, state.reducedMotionPref);
}

function toggleReducedMotion() {
  const next = state.reducedMotionPref === "on" ? "off" : "on";
  setReducedMotion(next);
}

function applyReducedEffects(enabled) {
  const on = !!enabled;
  state.reducedEffects = on;
  if (on) document.documentElement.dataset.reducedEffects = "true";
  else document.documentElement.removeAttribute("data-reduced-effects");
}

function setReducedEffects(enabled) {
  applyReducedEffects(enabled);
  persist(STORAGE_KEYS.reducedEffects, onOff(enabled));
}

function toggleReducedEffects() {
  setReducedEffects(!state.reducedEffects);
}

function applyContrast(mode) {
  const next = mode === "high" ? "high" : "normal";
  state.contrast = next;
  document.documentElement.dataset.contrast = next;
}

function setContrast(mode) {
  applyContrast(mode);
  persist(STORAGE_KEYS.contrast, state.contrast);
}

function toggleContrast() {
  setContrast(state.contrast === "high" ? "normal" : "high");
}

function applyReadableFont(enabled) {
  state.readableFont = !!enabled;
  document.documentElement.dataset.readableFont = state.readableFont
    ? "true"
    : "false";
}

function setReadableFont(enabled) {
  applyReadableFont(enabled);
  persist(STORAGE_KEYS.readableFont, onOff(enabled));
}

function toggleReadableFont() {
  setReadableFont(!state.readableFont);
}

function applyFocusOutline(enabled) {
  state.focusOutline = !!enabled;
  document.documentElement.dataset.focusOutline = state.focusOutline
    ? "true"
    : "false";
}

function setFocusOutline(enabled) {
  applyFocusOutline(enabled);
  persist(STORAGE_KEYS.focusOutline, onOff(enabled));
}

function toggleFocusOutline() {
  setFocusOutline(!state.focusOutline);
}

function onOff(val) {
  return val ? "true" : "false";
}

function hydrateFromStorage() {
  const savedTheme = read(STORAGE_KEYS.theme);
  const savedFont = read(STORAGE_KEYS.fontSize);
  const savedReduceMotion = read(STORAGE_KEYS.reducedMotion);
  const savedReduceFx = read(STORAGE_KEYS.reducedEffects);
  const savedContrast = read(STORAGE_KEYS.contrast);
  const savedReadable = read(STORAGE_KEYS.readableFont);
  const savedFocus = read(STORAGE_KEYS.focusOutline);

  if (savedTheme) state.theme = savedTheme;
  if (savedFont) state.fontSize = savedFont;
  if (savedReduceMotion) state.reducedMotionPref = savedReduceMotion;
  if (savedReduceFx) state.reducedEffects = savedReduceFx === "true";
  if (savedContrast) state.contrast = savedContrast;
  if (savedReadable) state.readableFont = savedReadable === "true";
  if (savedFocus) state.focusOutline = savedFocus !== "false";
}

function applyAll() {
  applyTheme(state.theme);
  applyFontSize(state.fontSize);
  applyReducedMotion(state.reducedMotionPref);
  applyReducedEffects(state.reducedEffects);
  applyContrast(state.contrast);
  applyReadableFont(state.readableFont);
  applyFocusOutline(state.focusOutline);
}

function handleUiEvent(e) {
  try {
    const detail = e?.detail || {};
    const { type, value } = detail;

    if (type === "toggle-dark") return toggleTheme();
    if (type === "set-dark") return setTheme(value ? "dark" : "light");
    if (type === "set-theme") return setTheme(value);

    if (type === "set-font") return setFontSize(value);

    if (type === "toggle-reduced-motion") return toggleReducedMotion();
    if (type === "set-reduced-motion") return setReducedMotion(value);

    if (type === "toggle-reduced-effects") return toggleReducedEffects();
    if (type === "set-reduced-effects") return setReducedEffects(!!value);

    if (type === "toggle-contrast") return toggleContrast();
    if (type === "set-contrast") return setContrast(value);

    if (type === "toggle-readable-font") return toggleReadableFont();
    if (type === "set-readable-font") return setReadableFont(!!value);

    if (type === "toggle-focus-outline") return toggleFocusOutline();
    if (type === "set-focus-outline") return setFocusOutline(!!value);
  } catch (err) {
    console.error("[a11y] ui event error", err);
  }
}

function initAccessibility() {
  if (initialized) return;
  initialized = true;

  hydrateFromStorage();
  applyAll();

  if (mediaDark.addEventListener) {
    mediaDark.addEventListener("change", () => {
      if (state.theme === "system") applyTheme(state.theme);
    });
  }

  if (mediaReduced.addEventListener) {
    mediaReduced.addEventListener("change", () => {
      if (state.reducedMotionPref === "system")
        applyReducedMotion(state.reducedMotionPref);
    });
  }

  window.addEventListener(UI_EVENT, handleUiEvent);
}

function disposeAccessibility() {
  if (!initialized) return;
  window.removeEventListener(UI_EVENT, handleUiEvent);
}

export function useAccessibility() {
  initAccessibility();

  return {
    state: readonly(state),
    setTheme,
    toggleTheme,
    setFontSize,
    setReducedMotion,
    toggleReducedMotion,
    setReducedEffects,
    toggleReducedEffects,
    setContrast,
    toggleContrast,
    setReadableFont,
    toggleReadableFont,
    setFocusOutline,
    toggleFocusOutline,
    disposeAccessibility,
  };
}

export { UI_EVENT };
