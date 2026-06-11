<template>
  <b-button
    class="menu-toggle-btn"
    :type="type"
    :size="size"
    :icon-left="icon"
    @click="$emit('click')"
  />
</template>

<script setup>
defineProps({
  icon: { type: String, default: "bars" },
  type: { type: String, default: "" },
  size: { type: String, default: "is-small" }
});
defineEmits(['click']);
</script>

<style scoped>
/* ── Toggle = un .menu-item-icon del Sidebar ──────────────────────────────
   Mismos tokens y mismo feel que la cajita de icono de un item del sidebar:
   tile slate translúcido, icono muted, borde inset y barrido espejo + lift
   al hover. Funciona en claro y oscuro (los tokens ya cambian por tema). */
.menu-toggle-btn.button {
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: var(--static-color-rgba-148-163-184-0-12);
  color: var(--text-muted);
  box-shadow: inset 0 0 0 1px var(--static-color-rgba-148-163-184-0-14);

  position: relative;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1),
    background-color 0.2s ease, box-shadow 0.3s ease;
}

/* Barrido espejo (idéntico a los items del sidebar) */
.menu-toggle-btn.button::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, var(--fx-shine) 50%, transparent 70%);
  opacity: 0;
  pointer-events: none;
}

/* Hover: mismo tinte e elevación que .menu-item:hover .menu-item-icon */
.menu-toggle-btn.button:hover {
  background: var(--c-primary-alpha);
  color: var(--c-primary);
}

.menu-toggle-btn.button:hover::after {
  animation: mt-shimmer 0.9s ease-out;
}

.menu-toggle-btn.button:active {
  transform: scale(0.96);
}

.menu-toggle-btn.button :deep(.icon) {
  font-size: 0.95rem;
}

@keyframes mt-shimmer {
  0%   { transform: translateX(-100%) skewX(-12deg); opacity: 1; }
  100% { transform: translateX(300%)  skewX(-12deg); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .menu-toggle-btn.button,
  .menu-toggle-btn.button:hover,
  .menu-toggle-btn.button:active {
    transition: background-color 0.2s ease, color 0.2s ease;
    transform: none;
  }
  .menu-toggle-btn.button:hover::after {
    animation: none;
  }
}
</style>
