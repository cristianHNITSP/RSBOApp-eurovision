<!-- src/components/ag-grid/navtools/NavtoolsRibbon.vue -->
<template>
  <div class="navtools-card navtools-card--ribbon">
    <DynamicTabs v-model="localActiveTab" :tabs="RIBBON_TABS" class="ribbon-tabs">
      <!-- Tira de EDICIÓN -->
      <template #edicion>
        <div class="ribbon-actions-row">
          <b-field grouped group-multiline>
            <NavButton
              tooltip="Ctrl+Z"
              icon="undo-alt"
              :disabled="!canUndo"
              @click="$emit('undo')"
            >
              Deshacer
            </NavButton>

            <NavButton
              tooltip="Ctrl+Y"
              icon="redo-alt"
              :disabled="!canRedo"
              @click="$emit('redo')"
            >
              Rehacer
            </NavButton>

            <NavButton
              tooltip="Ctrl+C"
              icon="copy"
              @click="$emit('copy')"
            >
              Copiar
            </NavButton>

            <NavButton
              tooltip="Ctrl+X"
              icon="cut"
              @click="$emit('cut')"
            >
              Cortar
            </NavButton>

            <NavButton
              v-if="!isMobile"
              tooltip="Ctrl+V"
              icon="paste"
              @click="$emit('paste')"
            >
              Pegar
            </NavButton>
          </b-field>
        </div>
      </template>

      <!-- Tira de ESTRUCTURA -->
      <template #estructura>
        <div class="ribbon-actions-row">
          <b-field grouped group-multiline>
            <NavButton
              icon="plus-square"
              type="is-light"
              :disabled="opPending"
              @click="$emit('add-row')"
            >
              {{ rowActionLabel }}
            </NavButton>

            <NavButton
              v-if="allowColumns"
              icon="plus"
              type="is-light"
              :disabled="opPending"
              @click="$emit('add-column')"
            >
              {{ colActionLabel }}
            </NavButton>
          </b-field>
        </div>
      </template>

      <!-- Tira de DATOS -->
      <template #datos>
        <div class="ribbon-actions-row">
          <b-field grouped group-multiline>
            <NavButton icon="filter" @click="$emit('clear-filters')">
              Limpiar filtros
            </NavButton>

            <NavButton icon="sort-amount-down-alt" @click="$emit('reset-sort')">
              Restablecer orden
            </NavButton>

            <NavButton
              extra-class="rbtn--primary"
              :type="dirty ? 'is-primary' : 'is-light'"
              icon="save"
              :disabled="!dirty || saving || opPending"
              @click="$emit('save')"
            >
              <span v-if="saving || opPending">Guardando…</span>
              <span v-else>Guardar cambios</span>
            </NavButton>

            <NavButton
              icon="undo"
              :disabled="!dirty || saving || opPending"
              @click="$emit('discard')"
            >
              Descartar cambios
            </NavButton>

            <NavButton icon="file-export" @click="$emit('export')">
              Generar Excel
            </NavButton>
          </b-field>
        </div>
      </template>
    </DynamicTabs>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import DynamicTabs from "@/components/DynamicTabs.vue";
import NavButton from "./NavButton.vue";

const RIBBON_TABS = [
  { key: 'edicion',    label: 'Edición',    icon: 'edit' },
  { key: 'estructura', label: 'Estructura', icon: 'border-all' },
  { key: 'datos',      label: 'Datos',      icon: 'database' },
];

const props = defineProps({
  activeTab:      { type: String, default: 'edicion' },
  canUndo:        Boolean,
  canRedo:        Boolean,
  isMobile:       Boolean,
  opPending:      Boolean,
  rowActionLabel: String,
  colActionLabel: String,
  allowColumns:   Boolean,
  dirty:          Boolean,
  saving:         Boolean
})

const emit = defineEmits([
  'update:activeTab',
  'undo', 'redo', 'copy', 'cut', 'paste',
  'add-row', 'add-column',
  'clear-filters', 'reset-sort', 'save', 'discard', 'export'
])

const localActiveTab = ref(props.activeTab)
watch(() => props.activeTab, (v) => localActiveTab.value = v)
watch(localActiveTab, (v) => emit('update:activeTab', v))
</script>
