<template>
  <transition name="mobile-search">
    <div v-if="isOpen" class="mobile-search-overlay" @click.self="$emit('close')">
      <div class="mobile-search-card">
        <div class="mobile-search-head">
          <span class="mobile-search-title">Buscar</span>
          <b-button
            size="is-small"
            type="is-light"
            icon-pack="fas"
            icon-left="times"
            @click="$emit('close')"
          />
        </div>

        <b-field class="m-0">
          <b-input
            ref="searchInput"
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
            placeholder="Buscar en el panel..."
            icon-pack="fas"
            icon="search"
            expanded
            rounded
          />
        </b-field>

        <p class="mobile-search-hint">Tip: aquí puedes conectar tu búsqueda global si quieres.</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  modelValue: String
})

const emit = defineEmits(['update:modelValue', 'close'])

const searchInput = ref(null)

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    nextTick(() => {
      try {
        const el = searchInput.value?.$el?.querySelector?.("input")
        el?.focus?.()
      } catch { /* silencioso */ }
    })
  }
})
</script>

<style scoped>
@import "./DashboardSearchOverlay.css";
</style>
