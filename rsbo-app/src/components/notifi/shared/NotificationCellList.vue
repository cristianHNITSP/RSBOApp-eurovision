<script setup>
/**
 * NotificationCellList — lista de dioptrías en alerta de una notificación de stock.
 * 100% Buefy/Bulma nativo (sin CSS propio):
 *  - Navegador de ejes con `buttons` / `button is-rounded` (matrices tóricas).
 *  - Filas con `tag` nativo de Bulma (spans ligeros, no <b-tag>) + helpers de flex/spacing.
 *  - `coordChips` se precalcula UNA vez (no inline por render) → expandir es fluido.
 *  - El alto del scroll es funcional (inline), no estilo: el resto va por clases Bulma.
 * Emite `cell-click(cell)` para el deep-link de dioptría.
 */
import { ref, computed } from "vue";
import { coordChips } from "./useNotifFormat.js";

const props = defineProps({
  cells: { type: Array, default: () => [] },
});
const emit = defineEmits(["cell-click"]);

const selectedAxis = ref(null);

const hasAxisData = computed(() =>
  props.cells.some((c) => c.axis !== null && c.axis !== undefined)
);

const axes = computed(() =>
  [...new Set(props.cells.map((c) => String(c.axis)).filter((a) => a !== "null" && a !== "undefined"))]
    .sort((a, b) => Number(b) - Number(a))
);

const activeAxis = computed(() => selectedAxis.value || axes.value[0]);

// Filas con chips precalculados y clase del tag de nivel (una sola vez por cambio de datos/eje).
const rows = computed(() => {
  const base = hasAxisData.value
    ? props.cells.filter((c) => String(c.axis) === String(activeAxis.value))
    : props.cells;
  return base.map((cell, i) => ({
    cell,
    key: `${cell.cellKey ?? ""}:${cell.eye ?? ""}:${i}`,
    chips: coordChips(cell),
    levelClass: cell.level === "CRITICO" ? "is-danger" : "is-warning",
  }));
});
</script>

<template>
  <div>
    <!-- Navegador de grados (eje) — tórico -->
    <div v-if="hasAxisData" class="buttons are-small mb-1">
      <button
        v-for="ax in axes"
        :key="ax"
        type="button"
        class="button is-small is-rounded"
        :class="activeAxis === ax ? 'is-primary' : 'is-light'"
        @click="selectedAxis = ax"
      >{{ ax }}°</button>
    </div>

    <!-- Lista: scroll personalizado (cross-browser), filas Bulma compactas -->
    <div class="notif-scroll">
      <div
        v-for="row in rows"
        :key="row.key"
        class="cell-row-lite is-flex is-align-items-center is-clickable px-2 py-0"
        role="button"
        tabindex="0"
        title="Abrir y enfocar esta dioptría"
        @click.stop="emit('cell-click', row.cell)"
        @keydown.enter.stop="emit('cell-click', row.cell)"
      >
        <span class="tag is-small" :class="row.levelClass">{{ row.cell.level }}</span>

        <span class="tags is-flex-grow-1 ml-2 mb-0">
          <span
            v-for="(chip, ci) in row.chips"
            :key="ci"
            class="tag is-light is-small mb-0"
          >
            <strong v-if="chip.k" class="mr-1 is-uppercase">{{ chip.k }}</strong>{{ chip.v }}
          </span>
        </span>

        <span class="has-text-weight-bold is-size-7 ml-2 cell-row-lite__stock">
          {{ row.cell.existencias }} pza{{ row.cell.existencias !== 1 ? "s" : "" }}
        </span>

        <!-- Pista visual de que la fila es redirigible (deep-link a la dioptría) -->
        <b-icon pack="fas" icon="arrow-up-right-from-square" size="is-small" class="cell-row-lite__go ml-2" />
      </div>
    </div>

    <p v-if="hasAxisData" class="is-size-7 has-text-grey has-text-centered pt-1">
      Mostrando eje {{ activeAxis }}° ({{ rows.length }} ítems)
    </p>
  </div>
</template>

<style scoped>
/* ── Scroll personalizado, compatible con todos los navegadores ──────────────
   Firefox: scrollbar-width/scrollbar-color. WebKit (Chrome/Edge/Safari): ::-webkit-*. */
.notif-scroll {
  max-height: 240px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
/* Chrome/Edge/Safari — mismo patrón que .main-content (DashboardLayoutGrid.css).
   CLAVE: NO declarar scrollbar-width en el elemento; Chrome 121+ ignora
   ::-webkit-scrollbar si existe y cae al scrollbar nativo CON flechitas. */
.notif-scroll::-webkit-scrollbar { width: 6px; }
.notif-scroll::-webkit-scrollbar-track { background: transparent; }
.notif-scroll::-webkit-scrollbar-thumb {
  background: var(--static-color-rgba-148-163-184-0-35);
  border-radius: 999px;
}
.notif-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--static-color-rgba-148-163-184-0-55, var(--c-primary));
}
/* Fallback Firefox (no soporta ::-webkit-scrollbar) */
@supports not selector(::-webkit-scrollbar) {
  .notif-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--static-color-rgba-148-163-184-0-35) transparent;
  }
}

/* ── Fila compacta + redirigible ─────────────────────────────────────────────
   Reduce el alto: tags más chicos y la dioptría en una sola línea. */
.cell-row-lite {
  border-radius: 8px;
  min-height: 1.75rem;
  transition: background 140ms ease;
}
.cell-row-lite:hover,
.cell-row-lite:focus-visible {
  background: var(--c-primary-alpha);
  outline: none;
}
.cell-row-lite .tag {
  font-size: 0.62rem;
  height: 1.35em;
  padding-inline: 0.45em;
}
.cell-row-lite .tags { gap: 0.2rem; row-gap: 0.2rem; }
.cell-row-lite__stock { white-space: nowrap; font-size: 0.68rem; }
.cell-row-lite__go {
  color: var(--c-primary);
  opacity: 0.5;
  transition: opacity 140ms ease;
}
.cell-row-lite:hover .cell-row-lite__go,
.cell-row-lite:focus-visible .cell-row-lite__go {
  opacity: 1;
}
</style>
