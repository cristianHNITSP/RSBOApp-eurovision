<template>
  <div class="a11y-fab" :class="{ 'is-open': open }">
    <transition name="fade-scale">
      <div v-if="open" class="a11y-panel" role="dialog" aria-label="Preferencias rápidas de accesibilidad">
        <header class="a11y-head">
          <div>
            <p class="a11y-title">Accesibilidad rápida</p>
            <p class="a11y-hint">Afecta a todo el proyecto.</p>
          </div>
          <b-button size="is-small" type="is-text" icon-left="times" @click="open = false" aria-label="Cerrar" />
        </header>

        <div class="a11y-group">
          <label for="theme-select">Tema</label>
          <b-select id="theme-select" v-model="theme" size="is-small">
            <option value="light">Claro</option>
            <option value="dark">Obscuro</option>
            <option value="system">Automático</option>
          </b-select>
        </div>

        <div class="a11y-grid">
          <div class="a11y-group">
            <label for="font-select">Tamaño</label>
            <b-select id="font-select" v-model="fontSize" size="is-small">
              <option value="xs">XS</option>
              <option value="sm">SM</option>
              <option value="md">MD</option>
              <option value="lg">LG</option>
            </b-select>
          </div>

          <div class="a11y-group">
            <label for="motion-select">Animaciones</label>
            <b-select id="motion-select" v-model="reducedMotion" size="is-small">
              <option value="system">Auto</option>
              <option value="on">Reducir</option>
              <option value="off">Normal</option>
            </b-select>
          </div>
        </div>

        <div class="a11y-toggles">
          <b-switch v-model="contrastHigh" size="is-small" type="is-primary">Contraste alto</b-switch>
          <b-switch v-model="readable" size="is-small" type="is-primary">Fuente legible</b-switch>
          <b-switch v-model="reducedFx" size="is-small" type="is-primary">FX suaves</b-switch>
          <b-switch v-model="focus" size="is-small" type="is-primary">Foco visible</b-switch>
        </div>

        <div class="a11y-footer">
          <span class="a11y-summary" aria-live="polite">{{ summary }}</span>
          <div class="a11y-actions">
            <b-button size="is-small" type="is-light" icon-left="undo" @click="reset">Restablecer</b-button>
            <b-button size="is-small" :type="theme === 'dark' ? 'is-dark' : 'is-primary'" icon-left="adjust" @click="toggleTheme">
              Alternar
            </b-button>
          </div>
        </div>
      </div>
    </transition>

    <b-tooltip label="Accesibilidad" position="is-left" append-to-body>
      <b-button class="fab-btn" type="is-primary" icon-left="universal-access" size="is-medium"
        @click="open = !open" aria-label="Abrir accesibilidad" />
    </b-tooltip>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useAccessibility } from "@/composables/useAccessibility";

const open = ref(false);

const {
  state: a11y,
  setTheme,
  toggleTheme,
  setFontSize,
  setReducedMotion,
  setReducedEffects,
  setContrast,
  setReadableFont,
  setFocusOutline,
} = useAccessibility();

const theme = computed({ get: () => a11y.theme, set: (v) => setTheme(v) });
const fontSize = computed({ get: () => a11y.fontSize, set: (v) => setFontSize(v) });
const reducedMotion = computed({ get: () => a11y.reducedMotionPref, set: (v) => setReducedMotion(v) });
const reducedFx = computed({ get: () => a11y.reducedEffects, set: (v) => setReducedEffects(v) });
const contrastHigh = computed({ get: () => a11y.contrast === "high", set: (v) => setContrast(v ? "high" : "normal") });
const readable = computed({ get: () => a11y.readableFont, set: (v) => setReadableFont(v) });
const focus = computed({ get: () => a11y.focusOutline, set: (v) => setFocusOutline(v) });

const summary = computed(() => {
  const bits = [];
  bits.push(`Tema ${a11y.resolvedTheme}`);
  bits.push(a11y.contrast === "high" ? "contraste alto" : "contraste normal");
  bits.push(`texto ${a11y.fontSize}`);
  bits.push(a11y.resolvedReducedMotion ? "motion reducido" : "motion normal");
  if (a11y.reducedEffects) bits.push("FX suaves");
  if (a11y.readableFont) bits.push("legible");
  return bits.join(" · ");
});

function reset() {
  setTheme("system");
  setFontSize("md");
  setReducedMotion("system");
  setReducedEffects(false);
  setContrast("normal");
  setReadableFont(false);
  setFocusOutline(true);
}

function handleEsc(e) {
  if (e.key === "Escape" && open.value) open.value = false;
}

onMounted(() => window.addEventListener("keydown", handleEsc));
onBeforeUnmount(() => window.removeEventListener("keydown", handleEsc));
</script>

<style scoped>
.a11y-fab {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 2200;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.fab-btn :deep(.button) {
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
}

.a11y-panel {
  width: min(320px, calc(100vw - 2rem));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-soft);
  padding: 0.75rem;
}

.a11y-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.a11y-title {
  margin: 0;
  font-weight: 900;
  color: var(--text);
}

.a11y-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted);
}

.a11y-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.a11y-group label {
  font-weight: 800;
  color: var(--text);
  font-size: 0.85rem;
}

.a11y-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.a11y-toggles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
  margin: 0.65rem 0;
}

.a11y-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.a11y-summary {
  font-size: 0.82rem;
  color: var(--muted);
  font-weight: 700;
}

.a11y-actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

@media (max-width: 520px) {
  .a11y-fab {
    right: 0.75rem;
    bottom: 0.75rem;
  }

  .a11y-panel {
    width: calc(100vw - 1.5rem);
  }
}
</style>
