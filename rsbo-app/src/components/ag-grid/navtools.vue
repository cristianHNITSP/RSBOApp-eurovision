<!-- src/components/ag-grid/navtools.vue -->
<template>
  <section class="navtools">
    <!-- 1. META & BADGE -->
    <NavtoolsMeta
      :tipo-human="tipoHuman"
      :material="material"
      :tratamientos-label="tratamientosLabel"
      :total-rows="totalRows"
      :server-badge="serverBadge"
      :last-saved-label="lastSavedLabel"
    />

    <!-- 2. RIBBON ACTIONS -->
    <NavtoolsRibbon
      v-model:activeTab="activeTab"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-mobile="isMobile"
      :op-pending="opPending"
      :row-action-label="rowActionLabel"
      :col-action-label="colActionLabel"
      :allow-columns="allowColumns"
      :dirty="dirty"
      :saving="saving"
      @undo="handleUndoClick"
      @redo="handleRedoClick"
      @copy="handleCopyClick"
      @cut="handleCutClick"
      @paste="handlePasteClick"
      @add-row="openAddRowModal"
      @add-column="openAddColumnModal"
      @clear-filters="emit('clear-filters')"
      @reset-sort="emit('reset-sort')"
      @save="handleSaveInternal"
      @discard="handleDiscard"
      @export="emit('export')"
    />

    <!-- 3. FORMULA BAR (FX) -->
    <NavtoolsFxBar
      v-model="localValue"
      @fx-input="handleFxInput"
      @apply="applyChange"
    />

    <!-- 4. OVERLAY DIRTY -->
    <DirtyFloat
      :dirty="dirty"
      :saving="saving"
      :op-pending="opPending"
      :change-key="dirtyChangeTick"
      @save="handleSaveInternal"
      @discard="handleDiscard"
    />
  </section>
</template>

<script setup>
import { ref, watch, computed, toRefs, getCurrentInstance, onBeforeUnmount } from 'vue'
import { normalizeAck } from "@/utils/errorSanitizer.js"

// Components
import NavtoolsMeta from "./navtools/NavtoolsMeta.vue"
import NavtoolsRibbon from "./navtools/NavtoolsRibbon.vue"
import NavtoolsFxBar from "./navtools/NavtoolsFxBar.vue"
import DirtyFloat from "@/components/ag-grid/DirtyFloat.vue"

// Composables
import { useNavtoolsMessaging } from "../../composables/ag-grid/navtools/useNavtoolsMessaging"
import { useNavtoolsClipboard } from "../../composables/ag-grid/navtools/useNavtoolsClipboard"
import { useNavtoolsHistory } from "../../composables/ag-grid/navtools/useNavtoolsHistory"
import { useNavtoolsModals } from "../../composables/ag-grid/navtools/useNavtoolsModals"

const props = defineProps({
  modelValue:  { type: [Number, String], default: '' },
  dirty:       { type: Boolean, default: false },
  saving:      { type: Boolean, default: false },
  totalRows:   { type: Number,  default: 0 },
  sheetName:   { type: String,  default: '' },
  tipoMatriz:  { type: String,  default: '' },
  material:    { type: String,  default: '' },
  tratamientos: { type: Array,   default: () => [] },
  lastSavedAt: { type: [String, Date], default: null },
  gridCanUndo: { type: Boolean, default: false },
  gridCanRedo: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:modelValue', 'add-row', 'add-column', 'clear-filters', 'reset-sort',
  'save-request', 'discard-changes', 'export', 'fx-input', 'fx-commit',
  'grid-undo', 'grid-redo', 'grid-copy', 'grid-cut', 'grid-paste'
])

const { modelValue, tipoMatriz, gridCanUndo, gridCanRedo } = toRefs(props)
const activeTab = ref('edicion')
const localValue = ref(props.modelValue ?? '')
const fxDirty = ref(false)

// ─── 1. Messaging & Status ──────────────────────────────────────────
const { opPending, serverBadge, safeToast, toastFromAck, markServerOk, markServerErr } = useNavtoolsMessaging()

const emitWithAck = (eventName, ...args) => {
  return new Promise((resolve) => {
    let done = false
    const ack = (payload) => { if (done) return; done = true; resolve(payload) }
    emit(eventName, ...args, ack)
    setTimeout(() => { if (done) return; done = true; resolve(undefined) }, 3000)
  })
}

// ─── 2. Clipboard ───────────────────────────────────────────────────
const { copyCell, cutCell, pasteCell } = useNavtoolsClipboard({
  localValue,
  onUpdate: (v) => emit('update:modelValue', v),
  safeToast
})

// ─── 3. History (Local Undo/Redo) ──────────────────────────────────
const { canUndo, canRedo, undo, redo } = useNavtoolsHistory({
  modelValue,
  localValue,
  gridCanUndo,
  gridCanRedo,
  onUpdate: (v) => emit('update:modelValue', v)
})

// ─── 4. Modals ───────────────────────────────────────────────────────
const internalInstance = getCurrentInstance()
const $buefy = internalInstance?.appContext?.config?.globalProperties?.$buefy

const { rowActionLabel, colActionLabel, allowColumns, openAddRowModal, openAddColumnModal } = useNavtoolsModals({
  tipoMatriz,
  $buefy,
  safeToast,
  opPending,
  emitWithAck,
  markServerOk,
  markServerErr,
  toastFromAck,
  normalizeAck,
  fmtSigned: (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return String(v ?? '')
    return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2)
  }
})

// ─── 5. UI Helpers (Meta labels) ────────────────────────────────────
const tipoHuman = computed(() => {
  const t = props.tipoMatriz || ''
  if (t === 'SPH_CYL') return 'Monofocal/Tórico'
  if (t === 'SPH_ADD') return 'Bifocal'
  if (t === 'BASE_ADD') return 'Progresivo'
  if (t === 'BASE') return 'Terminado/Base'
  return t
})

const tratamientosLabel = computed(() => {
  const list = props.tratamientos || []
  if (!list.length) return ''
  if (list.length > 2) return `${list[0]}, ${list[1]}...`
  return list.join(', ')
})

const lastSavedLabel = computed(() => {
  if (!props.lastSavedAt) return ''
  const d = new Date(props.lastSavedAt)
  return `Guardado: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})

// ─── 6. Event Handlers ──────────────────────────────────────────────
const handleUndoClick  = () => { if (props.gridCanUndo) emit('grid-undo'); else undo() }
const handleRedoClick  = () => { if (props.gridCanRedo) emit('grid-redo'); else redo() }
const handleCopyClick  = () => { emit('grid-copy'); copyCell() }
const handleCutClick   = () => { emit('grid-cut'); cutCell() }
const handlePasteClick = () => { emit('grid-paste'); pasteCell() }

const handleFxInput = (val) => { fxDirty.value = true; emit('fx-input', val) }
const applyChange = () => {
  if (!fxDirty.value) return
  fxDirty.value = false
  const rawText = String(localValue.value ?? '').trim()
  let next = rawText === '' ? 0 : (/^-?\d+(\.\d+)?$/.test(rawText) ? Number(rawText) : rawText)
  if (next !== props.modelValue) emit('update:modelValue', next)
  emit('fx-commit', rawText)
}

const handleSaveInternal = () => {
  if (!props.dirty) { safeToast('No hay cambios pendientes.', 'is-info'); return }
  $buefy?.dialog.confirm({
    title: 'Guardar cambios',
    message: '¿Estás seguro de guardar el inventario actual?',
    confirmText: 'Sí, guardar',
    type: 'is-primary',
    onConfirm: () => { emit('save-request') }
  })
}

const handleDiscard = () => {
  if (!props.dirty) return
  $buefy?.dialog.confirm({
    title: 'Descartar cambios',
    message: 'Se perderán todos los cambios no guardados. ¿Continuar?',
    confirmText: 'Descartar',
    type: 'is-danger',
    onConfirm: () => { emit('discard-changes') }
  })
}

// ─── 7. Dirty State & Unload ────────────────────────────────────────
const dirtyChangeTick = ref(0)
watch(() => props.modelValue, (v, o) => {
  fxDirty.value = false
  if (props.dirty && !props.saving && o !== undefined && v !== o) dirtyChangeTick.value++
})

const onBeforeUnload = (e) => { if (props.dirty) { e.preventDefault(); e.returnValue = '' } }
const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

watch(() => props.dirty, (is) => {
  if (is) window.addEventListener('beforeunload', onBeforeUnload)
  else { window.removeEventListener('beforeunload', onBeforeUnload); dirtyChangeTick.value = 0 }
}, { immediate: true })

onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<style src="./navtools.css"></style>
