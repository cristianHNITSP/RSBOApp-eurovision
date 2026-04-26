<!-- src/components/optica/OpticaToolbar.vue -->
<script setup>
/**
 * OpticaToolbar - Componente compartido para la barra de herramientas de las secciones.
 * Maneja búsqueda, filtros de estado/categoría y acciones globales.
 */
import { onBeforeUnmount } from 'vue';

const props = defineProps({
  section: { type: Object, required: true },
  searchPlaceholder: { type: String, default: "Buscar..." },
  filterPlaceholder: { type: String, default: "Todos" },
  filterOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(["reload", "toggle-trash", "create"]);

// ── DEBOUNCE LOGIC ──
let debounceTimer = null;

function handleSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const q = props.section.searchQ || "";
    // Solo recargar si está vacío (limpiar) o tiene al menos 3 caracteres
    if (q.length === 0 || q.length >= 3) {
      emit("reload");
    }
  }, 450); // Tiempo de espera optimizado para reducir carga en servidor
}

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="section-toolbar">
    <b-field grouped group-multiline class="mb-2">
      <b-field class="toolbar-field">
        <b-input v-model="section.searchQ" :placeholder="searchPlaceholder" icon="search" size="is-small"
          @input="handleSearchInput" />
      </b-field>

      <b-field v-if="filterOptions.length" class="toolbar-field">
        <b-select v-model="section.filterField" size="is-small">
          <option value="all">{{ filterPlaceholder }}</option>
          <option v-for="opt in filterOptions" :key="opt" :value="opt">
            {{ opt }}
          </option>
        </b-select>
      </b-field>
    </b-field>

    <div class="toolbar-actions">
      <b-button size="is-small" :type="section.showTrash ? 'is-warning' : 'is-light'" icon-left="trash"
        @click="$emit('toggle-trash')">
        {{ section.showTrash ? "Ver activos" : "Papelera" }}
      </b-button>

      <b-button size="is-small" icon-left="sync-alt" :loading="section.loading" @click="$emit('reload')" />

      <b-button v-if="!section.showTrash" size="is-small" type="is-primary" icon-left="plus" @click="$emit('create')">
        Agregar
      </b-button>
    </div>
  </div>
</template>
