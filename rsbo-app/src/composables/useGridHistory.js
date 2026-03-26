/**
 * useGridHistory — grid-level undo/redo for AG-Grid inventory templates.
 *
 * Tracks every cell edit as an operation { key, field, oldValue, newValue, meta }.
 * The consuming template calls push() after each edit, and undo()/redo() to reverse/replay.
 *
 * Usage in template:
 *   const history = useGridHistory({ maxSize: 200 })
 *   // on cell edit:
 *   history.push({ key: '0_50', field: 'existencias', oldValue: 3, newValue: 7, meta: { sph: 0.5 } })
 *   // undo/redo:
 *   const op = history.undo()   // returns the reversed operation to apply
 *   const op = history.redo()   // returns the operation to re-apply
 */
import { ref, computed } from 'vue'

export function useGridHistory({ maxSize = 300 } = {}) {
  const undoStack = ref([])   // Array<Operation>
  const redoStack = ref([])   // Array<Operation>
  const _applying = ref(false) // guard re-entrancy

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  /**
   * Record a cell edit operation.
   * @param {Object} op  — { key, field, oldValue, newValue, meta? }
   *   key: the pendingChanges key (e.g. "0_50", "-1.00|0.75", "-1.00|0.75|180")
   *   field: column field that changed (e.g. "existencias", "cyl_0_75")
   *   oldValue: value before edit
   *   newValue: value after edit
   *   meta: arbitrary data the template needs to reconstruct the change
   */
  function push(op) {
    if (_applying.value) return // don't record during undo/redo replay
    if (undoStack.value.length >= maxSize) undoStack.value.shift()
    undoStack.value.push({ ...op, _ts: Date.now() })
    redoStack.value = [] // any new edit clears redo
  }

  /**
   * Undo the last operation.
   * Returns { op, reversed: true } so the template knows what to revert.
   * Returns null if stack is empty.
   */
  function undo() {
    if (!undoStack.value.length) return null
    _applying.value = true
    const op = undoStack.value.pop()
    redoStack.value.push(op)
    _applying.value = false
    return { ...op, reversed: true }
  }

  /**
   * Redo the last undone operation.
   * Returns { op, reversed: false } so the template knows what to re-apply.
   * Returns null if stack is empty.
   */
  function redo() {
    if (!redoStack.value.length) return null
    _applying.value = true
    const op = redoStack.value.pop()
    undoStack.value.push(op)
    _applying.value = false
    return { ...op, reversed: false }
  }

  /** Clear all history (e.g. after save or view switch). */
  function clear() {
    undoStack.value = []
    redoStack.value = []
  }

  /** True while an undo/redo is being applied — templates check this to avoid re-push. */
  const isApplying = computed(() => _applying.value)

  return { push, undo, redo, clear, canUndo, canRedo, isApplying, undoStack, redoStack }
}
