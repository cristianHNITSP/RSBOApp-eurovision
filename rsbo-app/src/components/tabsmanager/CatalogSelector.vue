<!-- rsbo-app/src/components/tabsmanager/CatalogSelector.vue -->
<template>
  <div class="catalog-selector-fields">
    <!-- BASE -->
    <div class="field">
      <label class="label">Selecciona la Base</label>
      <div class="options-grid">
        <button
          v-for="base in catalogBases"
          :key="base.key"
          type="button"
          class="option-pill"
          :class="{ 'is-active': selectedBase === base.key }"
          @click="$emit('select-base', base.key)"
        >
          {{ base.label }}
        </button>
      </div>
    </div>

    <!-- MATERIALES -->
    <div class="field" v-if="selectedBase && materialRequired">
      <label class="label">Selecciona el Material</label>
      <div class="options-grid">
        <div v-for="mat in allMaterials" :key="mat" class="option-pill-wrapper">
          <b-tooltip v-if="!isMaterialAllowed(mat)" :label="`No disponible con ${baseLabel}`" position="is-top" type="is-dark" multilined>
            <button type="button" class="option-pill is-disabled" disabled>
              {{ mat }} <i class="fas fa-lock ml-1"></i>
            </button>
          </b-tooltip>
          <button
            v-else
            type="button"
            class="option-pill"
            :class="{ 'is-active': selectedMaterial === mat }"
            @click="$emit('select-material', mat)"
          >
            {{ mat }}
          </button>
        </div>
      </div>
      <p class="help is-danger mt-2" v-if="selectedBase && !hasAnyAllowedMaterial">
        No hay materiales compatibles con la base seleccionada.
      </p>
    </div>

    <!-- TRATAMIENTO -->
    <div class="field" v-if="showTratamiento && (materialRequired ? selectedMaterial : selectedBase)">
      <label class="label">Selecciona el Tratamiento</label>
      <div class="options-grid">
        <button
          v-for="t in allowedTratamientos"
          :key="t.key"
          type="button"
          class="option-pill"
          :class="{ 'is-active': selectedTratamientoKey === t.key }"
          @click="$emit('select-tratamiento', t.key)"
        >
          {{ t.label }}
        </button>
      </div>
      <p class="help is-danger mt-2" v-if="selectedMaterial && !allowedTratamientos.length">
        No hay tratamientos compatibles con la selección actual.
      </p>
    </div>

    <!-- VARIANTE -->
    <div class="field" v-if="showTratamiento && selectedTratamientoKey && varianteOptions.length">
      <label class="label">Selecciona la Variante</label>
      <div class="options-grid">
        <button
          v-for="v in varianteOptions"
          :key="v"
          type="button"
          class="option-pill"
          :class="{ 'is-active': selectedVariante === v }"
          @click="$emit('select-variante', v)"
        >
          {{ v }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  catalogBases:           { type: Array,   default: () => [] },
  selectedBase:           { type: String,  default: null },
  selectedMaterial:       { type: String,  default: null },
  selectedTratamientoKey: { type: String,  default: null },
  selectedVariante:       { type: String,  default: "" },
  materialRequired:       { type: Boolean, default: true },
  showTratamiento:        { type: Boolean, default: true },
  allMaterials:           { type: Array,   default: () => [] },
  allowedTratamientos:    { type: Array,   default: () => [] },
  varianteOptions:        { type: Array,   default: () => [] },
  isMaterialAllowed:      { type: Function, required: true },
  hasAnyAllowedMaterial:  { type: Boolean, default: true },
  baseLabel:              { type: String,  default: "" }
});

defineEmits(["select-base", "select-material", "select-tratamiento", "select-variante"]);
</script>

<style scoped src="./CatalogSelector.css"></style>
