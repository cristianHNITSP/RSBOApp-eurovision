<script setup>
// Contenido del panel de búsqueda: skeleton / vacío / historial+hint / resultados.
// Recibe el controlador (useGlobalSearch) como prop y delega la interacción.
import { computed } from "vue";
import SearchSkeleton from "./SearchSkeleton.vue";
import SearchEmpty from "./SearchEmpty.vue";
import SearchHint from "./SearchHint.vue";
import SearchFooter from "./SearchFooter.vue";
import SearchHistoryItem from "./items/SearchHistoryItem.vue";

const props = defineProps({ ctrl: { type: Object, required: true } });

const c = props.ctrl;
const noResults = computed(
  () => !c.loading.value && !c.hasResults.value && c.query.value.trim().length >= c.MIN_CHARS
);

/** Índice seleccionable (cursor) de un ítem dado su posición en flatItems. */
function selIndex(flatIdx) {
  return c.itemIndexes.value.indexOf(flatIdx);
}
</script>

<template>
  <div class="gs-dropdown" role="listbox">
    <!-- Cargando -->
    <SearchSkeleton v-if="c.loading.value" />

    <!-- Sin resultados -->
    <SearchEmpty v-else-if="noResults" :query="c.query.value" />

    <!-- Query corta → historial + hint -->
    <template v-else-if="c.showHistory.value">
      <template v-if="c.history.value.length">
        <div class="gs-group-header">
          <i class="fas fa-history gs-group-header__icon" /> Recientes
          <button class="gs-clear-history" title="Borrar historial" @click.stop="c.onClearHistory()">
            <i class="fas fa-trash-alt" />
          </button>
        </div>
        <div
          v-for="(h, idx) in c.history.value"
          :key="h.id"
          class="gs-item gs-item--history"
          :class="{ 'gs-item--active': c.cursor.value === idx }"
          role="option"
          @click="c.selectHistory(h)"
          @mouseenter="c.cursor.value = idx"
        >
          <SearchHistoryItem :entry="h" @remove="c.onRemoveHistory" />
        </div>
      </template>
      <SearchHint />
    </template>

    <!-- Resultados -->
    <template v-else>
      <template v-for="(row, idx) in c.flatItems.value" :key="idx">
        <div v-if="row.kind === 'header'" class="gs-group-header">
          <i :class="`fas fa-${row.icon}`" class="gs-group-header__icon" />
          {{ row.label }}
          <span class="gs-group-count">{{ row.count }}</span>
        </div>
        <div
          v-else
          class="gs-item"
          :class="{ 'gs-item--active': c.cursor.value === selIndex(idx) }"
          role="option"
          @click="c.selectItem(row)"
          @mouseenter="c.cursor.value = selIndex(idx)"
        >
          <component :is="row.def.item" :item="row.data" :query="c.query.value" />
        </div>
      </template>
    </template>

    <SearchFooter v-if="!c.loading.value && (c.hasResults.value || (c.showHistory.value && c.history.value.length))" />
  </div>
</template>
