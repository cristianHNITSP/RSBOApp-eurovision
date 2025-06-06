<template>
  <b-tooltip
    :label="label"
    :position="calculatedPosition"
    :multilined="multilined"
    :size="size"
    v-bind="$attrs"
  >
    <slot />
  </b-tooltip>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  multilined: { type: Boolean, default: false },
  size: { type: String, default: 'is-medium' }
})

const calculatedPosition = ref('is-bottom')
let triggerEl = null

const MARGIN = 40

function positionsEqual(pos1, pos2) {
  return pos1 === pos2
}

// Debounce para no saturar el cálculo
let debounceTimeout = null
function debounceUpdatePosition() {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(updatePosition, 100)
}

function updatePosition() {
  if (!triggerEl) return
  const rect = triggerEl.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  let vertical = 'bottom'
  let horizontal = ''

  if (rect.bottom + MARGIN > vh) vertical = 'top'
  else if (rect.top - MARGIN < 0) vertical = 'bottom'

  if (rect.right + MARGIN > vw) horizontal = 'left'
  else if (rect.left - MARGIN < 0) horizontal = 'right'

  const newPosition = horizontal ? `is-${vertical}-${horizontal}` : `is-${vertical}`

  // Solo actualizamos si cambió la posición para evitar rerender y loop
  if (!positionsEqual(calculatedPosition.value, newPosition)) {
    calculatedPosition.value = newPosition
  }
}

onMounted(() => {
  nextTick(() => {
    const root = document.querySelector('.dynamic-tooltip-trigger-root')
    if (root) {
      triggerEl = root.firstElementChild
      updatePosition()
    }

    window.addEventListener('resize', debounceUpdatePosition)
    window.addEventListener('scroll', debounceUpdatePosition)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', debounceUpdatePosition)
  window.removeEventListener('scroll', debounceUpdatePosition)
})
</script>

<style scoped>
.dynamic-tooltip-trigger-root {
  display: inline-block;
}
</style>
