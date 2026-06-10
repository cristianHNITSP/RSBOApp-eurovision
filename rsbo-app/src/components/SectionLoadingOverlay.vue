<!-- ============================================================
  SectionLoadingOverlay.vue — Loading glass de SECCIÓN (no del grid).
  Cubre la zona de la sección mientras se resuelve el boot:
  catálogo + restauración de sesión + carga inicial de la lista.
  Spinner glass; tokens theme-aware (--surface-overlay / --fx-blur),
  nada hardcodeado. El blur respeta el tema alto-contraste (--fx-blur:0).
  ============================================================ -->
<template>
  <div class="section-loading" role="status" aria-live="polite" aria-busy="true">
    <span class="section-loading__ring"></span>
    <span class="section-loading__label">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: "Cargando…" },
});
</script>

<style scoped>
.section-loading {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  border-radius: inherit;
  background: var(--surface-overlay);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
}

.section-loading__ring {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2.5px solid var(--c-primary-alpha);
  border-top-color: var(--c-primary);
  border-right-color: var(--c-primary);
  animation: section-loading-spin 0.85s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  box-shadow: 0 0 14px var(--c-primary-alpha);
}

.section-loading__label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-primary);
}

@keyframes section-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .section-loading__ring {
    animation: none;
  }
}
</style>
