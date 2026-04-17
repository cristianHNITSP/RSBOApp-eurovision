/**
 * src/composables/ag-grid/navtools/useNavtoolsHistory.js
 * Lógica para el historial local (Undo/Redo) de la barra de fórmulas.
 */

import { ref, watch, computed } from 'vue'

export function useNavtoolsHistory({ modelValue, localValue, gridCanUndo, gridCanRedo, onUpdate }) {
  const MAX_HISTORY = 200
  const undoStack = ref([])
  const redoStack = ref([])
  const isApplyingHistory = ref(false)

  const canUndo = computed(() => gridCanUndo.value || undoStack.value.length > 0)
  const canRedo = computed(() => gridCanRedo.value || redoStack.value.length > 0)

  watch(
    () => modelValue.value,
    (val, oldVal) => {
      if (!isApplyingHistory.value && oldVal !== undefined && oldVal !== val) {
        if (undoStack.value.length >= MAX_HISTORY) undoStack.value.shift()
        undoStack.value.push(oldVal ?? '')
        redoStack.value = []
      }
      localValue.value = val ?? ''
    }
  )

  const undo = () => {
    if (!undoStack.value.length) return
    const current = modelValue.value ?? ''
    const previous = undoStack.value.pop()
    redoStack.value.push(current)
    isApplyingHistory.value = true
    onUpdate(previous)
    // Usamos nextTick implícito o setTimeout para resetear el flag
    setTimeout(() => (isApplyingHistory.value = false), 0)
  }

  const redo = () => {
    if (!redoStack.value.length) return
    const current = modelValue.value ?? ''
    const next = redoStack.value.pop()
    undoStack.value.push(current)
    isApplyingHistory.value = true
    onUpdate(next)
    setTimeout(() => (isApplyingHistory.value = false), 0)
  }

  return {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    undo,
    redo
  }
}
