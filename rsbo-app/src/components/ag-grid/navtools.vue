<!-- src/components/ag-grid/navtools.vue -->
<template>
  <section class="navtools">
    <!-- HEADER: META + ESTADO -->
    <nav class="level is-mobile mb-2 navtools-header">
      <div class="level-left">
        <div class="level-item">
          <div class="meta-tags-scroll" aria-label="Metadatos de hoja">
            <b-taglist class="meta-taglist">
              <b-tag v-if="tipoHuman" type="is-light" size="is-small">
                <b-icon icon="layer-group" size="is-small" class="mr-1" />
                {{ tipoHuman }}
              </b-tag>

              <b-tag v-if="material" type="is-light" size="is-small">
                <b-icon icon="gem" size="is-small" class="mr-1" />
                {{ material }}
              </b-tag>

              <b-tag v-if="tratamientosLabel" type="is-light" size="is-small">
                <b-icon icon="magic" size="is-small" class="mr-1" />
                {{ tratamientosLabel }}
              </b-tag>

              <b-tag v-if="totalRows != null" type="is-light" size="is-small">
                <b-icon icon="database" size="is-small" class="mr-1" />
                {{ totalRows }} filas
              </b-tag>
            </b-taglist>
          </div>
        </div>
      </div>

      <div class="level-right">
        <!-- ✅ Estado real del último request (success/error) -->
        <div class="level-item" v-if="serverBadge">
          <b-tag :type="serverBadge.type" size="is-small">
            <b-icon :icon="serverBadge.icon" size="is-small" class="mr-1" />
            {{ serverBadge.text }}
          </b-tag>
        </div>

        <div class="level-item" v-if="lastSavedLabel">
          <span class="is-size-7 has-text-grey last-saved">
            <b-icon icon="clock" size="is-small" class="mr-1" />
            {{ lastSavedLabel }}
          </span>
        </div>
      </div>
    </nav>

    <!-- TABS DE ACCIONES -->
    <b-tabs v-model="activeTab" size="is-small" type="is-toggle-rounded" class="p-0 m-0">
      <b-tab-item label="Edición" icon="edit">
        <div class="ribbon-actions-row">
          <b-field grouped group-multiline>
            <p class="control">
              <b-tooltip label="Ctrl+Z" position="is-top">
                <b-button size="is-small" icon-left="undo-alt" :disabled="!canUndo" @click="handleUndoClick">
                  Deshacer
                </b-button>
              </b-tooltip>
            </p>

            <p class="control">
              <b-tooltip label="Ctrl+Y" position="is-top">
                <b-button size="is-small" icon-left="redo-alt" :disabled="!canRedo" @click="handleRedoClick">
                  Rehacer
                </b-button>
              </b-tooltip>
            </p>

            <p class="control">
              <b-tooltip label="Ctrl+C" position="is-top">
                <b-button size="is-small" icon-left="copy" @click="handleCopyClick">
                  Copiar
                </b-button>
              </b-tooltip>
            </p>

            <p class="control">
              <b-tooltip label="Ctrl+X" position="is-top">
                <b-button size="is-small" icon-left="cut" @click="handleCutClick">
                  Cortar
                </b-button>
              </b-tooltip>
            </p>

            <p class="control" v-if="!isMobile">
              <b-tooltip label="Ctrl+V" position="is-top">
                <b-button size="is-small" icon-left="paste" @click="handlePasteClick">
                  Pegar
                </b-button>
              </b-tooltip>
            </p>
          </b-field>
        </div>
      </b-tab-item>

      <b-tab-item label="Estructura" icon="border-all">
        <div class="ribbon-actions-row">
          <b-field grouped group-multiline>
            <p class="control">
              <b-button
                size="is-small"
                icon-left="plus-square"
                type="is-light"
                :disabled="opPending"
                @click="openAddRowModal"
              >
                {{ rowActionLabel }}
              </b-button>
            </p>

            <p class="control" v-if="allowColumns">
              <b-button
                size="is-small"
                icon-left="plus"
                type="is-light"
                :disabled="opPending"
                @click="openAddColumnModal"
              >
                {{ colActionLabel }}
              </b-button>
            </p>
          </b-field>
        </div>
      </b-tab-item>

      <b-tab-item label="Datos" icon="database">
        <div class="ribbon-actions-row">
          <b-field grouped group-multiline>
            <p class="control">
              <b-button size="is-small" type="is-light" icon-left="filter" @click="emit('clear-filters')">
                Limpiar filtros
              </b-button>
            </p>

            <p class="control">
              <b-button size="is-small" type="is-light" icon-left="sort-amount-down-alt" @click="emit('reset-sort')">
                Restablecer orden
              </b-button>
            </p>

            <p class="control">
              <b-button
                size="is-small"
                :type="dirty ? 'is-primary' : 'is-light'"
                icon-left="save"
                :disabled="!dirty || saving || opPending"
                @click="handleSaveClick"
              >
                <span v-if="saving || opPending">Guardando…</span>
                <span v-else>Guardar cambios</span>
              </b-button>
            </p>

            <p class="control">
              <b-button
                size="is-small"
                type="is-light"
                icon-left="undo"
                :disabled="!dirty || saving || opPending"
                @click="handleDiscard"
              >
                Descartar cambios
              </b-button>
            </p>

            <p class="control">
              <b-button size="is-small" type="is-light" icon-left="file-export" @click="emit('export')">
                Exportar
              </b-button>
            </p>
          </b-field>
        </div>
      </b-tab-item>
    </b-tabs>

    <!-- BARRA FX -->
    <div class="mt-2 formula-bar-card">
      <b-tag type="is-light" class="formula-fx-tag"> fx </b-tag>
      <b-input
        v-model="localValue"
        type="text"
        inputmode="numeric"
        placeholder="Selecciona una celda"
        size="is-small"
        class="formula-input"
        @keyup.enter="applyChange"
        @blur="applyChange"
      />
      <b-button size="is-small" :rounded="true" type="is-primary" icon-left="check" class="formula-apply-button" @click="applyChange">
        Aplicar
      </b-button>
    </div>

    <!-- ✅ OVERLAY REAL: TELEPORT A BODY -->
    <teleport to="body">
      <transition name="dirty-float-slide">
        <div v-if="showDirtyFloat" class="dirty-float-root" role="status" aria-live="polite">
          <div class="dirty-float">
            <div class="dirty-float__content">
              <div class="dirty-float__left">
                <span class="dirty-float__icon" aria-hidden="true">
                  <b-icon icon="exclamation-triangle" size="is-small" />
                </span>

                <div class="dirty-float__texts">
                  <div class="dirty-float__title">Cambios sin guardar</div>
                  <div class="dirty-float__subtitle">
                    Guarda para no perder edición.
                    <span v-if="!isMobile" class="dirty-float__hint">Atajo: <b>Ctrl + S</b></span>
                  </div>
                </div>
              </div>

              <div class="dirty-float__actions">
                <b-button size="is-small" type="is-primary" icon-left="save" :disabled="saving || opPending" @click="handleSaveClick">
                  <span v-if="saving || opPending">Guardando…</span>
                  <span v-else>Guardar</span>
                </b-button>

                <b-button size="is-small" type="is-light" icon-left="undo" :disabled="saving || opPending" @click="handleDiscard">
                  Descartar
                </b-button>

                <b-button
                  size="is-small"
                  type="is-light"
                  icon-left="times"
                  :disabled="saving || opPending"
                  @click="dismissDirtyFloat"
                  title="Ocultar aviso"
                >
                  Ocultar
                </b-button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </section>
</template>

<script setup>
import { ref, watch, computed, defineProps, defineEmits, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  dirty: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  totalRows: { type: Number, default: 0 },
  sheetName: { type: String, default: '' },
  tipoMatriz: { type: String, default: '' },
  material: { type: String, default: '' },
  tratamientos: { type: Array, default: () => [] },
  lastSavedAt: { type: [String, Date], default: null }
})

const emit = defineEmits([
  'update:modelValue',
  'add-row',
  'add-column',
  'clear-filters',
  'reset-sort',
  'save-request',
  'discard-changes',
  'export'
])

const activeTab = ref(0)
const localValue = ref(props.modelValue ?? '')

const internalInstance = getCurrentInstance()
const $buefy = internalInstance?.appContext?.config?.globalProperties?.$buefy

/* ===================== Backend ACK (estado real) ===================== */
const opPending = ref(false)
const lastServer = ref({
  kind: 'idle', // 'idle' | 'ok' | 'error'
  text: '',
  status: null,
  at: null
})

const serverBadge = computed(() => {
  if (props.saving || opPending.value) return { type: 'is-info', icon: 'spinner', text: 'Procesando…' }
  if (lastServer.value.kind === 'error') return { type: 'is-danger', icon: 'times-circle', text: lastServer.value.text || 'Error' }
  if (lastServer.value.kind === 'ok') return { type: 'is-success', icon: 'check-circle', text: lastServer.value.text || 'Ok' }
  return null
})

const markServerOk = (text = 'Operación exitosa', status = null) => {
  lastServer.value = { kind: 'ok', text, status, at: new Date() }
}
const markServerErr = (text = 'Error', status = null) => {
  lastServer.value = { kind: 'error', text, status, at: new Date() }
}

const toastFromAck = (ack, { successFallback, errorFallback } = {}) => {
  if (!ack) return
  if (ack.ok === true) {
    $buefy?.toast.open({ message: ack.message || successFallback || 'Listo.', type: 'is-success' })
  } else if (ack.ok === false) {
    $buefy?.toast.open({ message: ack.message || errorFallback || 'Ocurrió un error.', type: 'is-danger' })
  }
}

/**
 * Emite evento con callback ACK:
 * El padre puede llamar ack({ ok, status, message }) cuando termine el request real al backend.
 * Si el padre no llama ack, esto NO asume éxito (solo muestra mensaje neutro).
 */
const emitWithAck = (eventName, ...args) => {
  const ACK_TIMEOUT_MS = 1500
  return new Promise((resolve) => {
    let done = false
    const ack = (payload) => {
      if (done) return
      done = true
      resolve(payload)
    }
    emit(eventName, ...args, ack)

    setTimeout(() => {
      if (done) return
      done = true
      resolve(undefined)
    }, ACK_TIMEOUT_MS)
  })
}

/* ========= Notificación flotante (FIX: vuelve a salir en nuevos cambios) ========= */
const dirtyFloatDismissed = ref(false)
const dirtyChangeTick = ref(0)

const showDirtyFloat = computed(() => props.dirty && !props.saving && !dirtyFloatDismissed.value)

const dismissDirtyFloat = () => {
  dirtyFloatDismissed.value = true
}

watch(
  () => props.modelValue,
  (val, oldVal) => {
    if (!props.dirty) return
    if (props.saving) return
    if (oldVal === undefined) return
    if (val === oldVal) return
    dirtyChangeTick.value++
  }
)

watch(dirtyChangeTick, () => {
  if (!props.dirty) return
  if (props.saving) return
  if (dirtyFloatDismissed.value) dirtyFloatDismissed.value = false
})

/* ========= Warn al cerrar pestaña ========= */
const onBeforeUnload = (e) => {
  if (!props.dirty) return
  e.preventDefault()
  e.returnValue = ''
}

watch(
  () => props.dirty,
  (isDirty) => {
    if (isDirty) window.addEventListener('beforeunload', onBeforeUnload)
    else {
      window.removeEventListener('beforeunload', onBeforeUnload)
      dirtyFloatDismissed.value = false
      dirtyChangeTick.value = 0
    }
  },
  { immediate: true }
)

/* ========= Historial undo/redo ========= */
const MAX_HISTORY = 200
const undoStack = ref([])
const redoStack = ref([])
const isApplyingHistory = ref(false)

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

watch(
  () => props.modelValue,
  (val, oldVal) => {
    if (!isApplyingHistory.value && oldVal !== undefined && oldVal !== val) {
      if (undoStack.value.length >= MAX_HISTORY) undoStack.value.shift()
      undoStack.value.push(oldVal ?? '')
      redoStack.value = []
    }
    localValue.value = val ?? ''
  }
)

const applyChange = () => {
  const raw = String(localValue.value ?? '').trim()
  if (raw === '') emit('update:modelValue', 0)
  else if (/^-?\d+(\.\d+)?$/.test(raw)) emit('update:modelValue', Number(raw))
  else emit('update:modelValue', raw)
}

const undo = () => {
  if (!undoStack.value.length) return
  const current = props.modelValue ?? ''
  const previous = undoStack.value.pop()
  redoStack.value.push(current)
  isApplyingHistory.value = true
  emit('update:modelValue', previous)
  setTimeout(() => (isApplyingHistory.value = false), 0)
}

const redo = () => {
  if (!redoStack.value.length) return
  const current = props.modelValue ?? ''
  const next = redoStack.value.pop()
  undoStack.value.push(current)
  isApplyingHistory.value = true
  emit('update:modelValue', next)
  setTimeout(() => (isApplyingHistory.value = false), 0)
}

const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text)
    else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  } catch (err) {
    console.error('Error copiando:', err)
    $buefy?.toast.open({ message: 'El navegador bloqueó el acceso al portapapeles.', type: 'is-danger' })
  }
}

const pasteFromClipboard = async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) return await navigator.clipboard.readText()
    return new Promise((resolve) => {
      const textarea = document.createElement('textarea')
      textarea.style.position = 'absolute'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      const handler = (e) => {
        const pasted = e.clipboardData?.getData('text') || ''
        resolve(pasted)
        document.body.removeChild(textarea)
      }
      textarea.addEventListener('paste', handler, { once: true })
      document.execCommand('paste')
    })
  } catch (err) {
    console.error('Error pegando:', err)
    $buefy?.toast.open({ message: 'El navegador bloqueó el acceso al portapapeles.', type: 'is-danger' })
    return ''
  }
}

const copyCell = async () => {
  if (localValue.value !== '' && localValue.value != null) await copyToClipboard(localValue.value.toString())
}
const cutCell = async () => {
  if (localValue.value !== '' && localValue.value != null) {
    await copyToClipboard(localValue.value.toString())
    emit('update:modelValue', 0)
  }
}
const pasteCell = async () => {
  const pasted = await pasteFromClipboard()
  if (!pasted) return
  const str = pasted.trim()
  if (/^-?\d+(\.\d+)?$/.test(str)) emit('update:modelValue', Number(str))
  else emit('update:modelValue', str)
}

const handleUndoClick = () => undo()
const handleRedoClick = () => redo()
const handleCopyClick = () => copyCell()
const handleCutClick = () => cutCell()
const handlePasteClick = () => pasteCell()

/* ========= Modales fila/columna ========= */
const PHYSICAL_LIMITS = Object.freeze({
  SPH: { min: -40, max: 40 },
  CYL: { min: -15, max: 15 },
  BASE: { min: -40, max: 40 },
  ADD: { min: 0, max: 8 }
})

const isQuarterStep = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return false
  const scaled = num * 4
  return Math.abs(scaled - Math.round(scaled)) < 1e-6
}

const fmtSigned = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value ?? '')
  const s = num.toFixed(2)
  return num >= 0 ? `+${s}` : s
}

const rowLabel = computed(() => {
  switch (props.tipoMatriz) {
    case 'SPH_CYL':
    case 'SPH_ADD':
      return 'SPH'
    case 'BASE_ADD':
    case 'BASE':
      return 'BASE'
    default:
      return 'valor'
  }
})

const colLabel = computed(() => {
  switch (props.tipoMatriz) {
    case 'SPH_CYL':
      return 'CYL'
    case 'SPH_ADD':
    case 'BASE_ADD':
      return 'ADD'
    case 'BASE':
      return 'valor'
    default:
      return 'valor'
  }
})

const allowColumns = computed(() => props.tipoMatriz !== 'BASE')

const getContextDimension = (kind) => {
  if (kind === 'row') {
    if (rowLabel.value === 'SPH') return 'SPH'
    if (rowLabel.value === 'BASE') return 'BASE'
  } else if (kind === 'col') {
    if (colLabel.value === 'CYL') return 'CYL'
    if (colLabel.value === 'ADD') return 'ADD'
  }
  return null
}

const rowActionLabel = computed(() => {
  const dim = getContextDimension('row')
  switch (dim) {
    case 'SPH': return 'Agregar esférica'
    case 'BASE': return 'Agregar base'
    default: return 'Agregar fila'
  }
})

const colActionLabel = computed(() => {
  const dim = getContextDimension('col')
  switch (dim) {
    case 'CYL': return 'Agregar cilíndrica'
    case 'ADD': return 'Agregar adición'
    default: return 'Agregar columna'
  }
})

const ensureQuarterStepOrToast = (value, kind) => {
  const num = Number(value)
  const lbl = kind === 'row' ? rowLabel.value : colLabel.value

  if (!Number.isFinite(num)) {
    $buefy?.toast.open({ message: `Ingresa un valor numérico válido${lbl === 'valor' ? '' : ` para ${lbl}`}.`, type: 'is-danger' })
    return false
  }

  const dim = getContextDimension(kind)
  if (dim && PHYSICAL_LIMITS[dim]) {
    const { min, max } = PHYSICAL_LIMITS[dim]
    if (num < min || num > max) {
      $buefy?.toast.open({ message: `${dim} debe estar entre ${min.toFixed(2)} y ${max.toFixed(2)} D.`, type: 'is-danger' })
      return false
    }
  }

  if (!isQuarterStep(num)) {
    const what = lbl === 'valor' ? '' : ` de ${lbl}`
    $buefy?.toast.open({
      message:
        `El valor${what} debe ser múltiplo de 0.25 D (…00, …25, …50, …75). ` +
        `Ejemplos: -6.00, -5.75, -5.50, +0.00, +0.25, +0.50.`,
      type: 'is-danger'
    })
    return false
  }

  return true
}

const openAddRowModal = () => {
  const dim = getContextDimension('row')
  const limits = dim ? PHYSICAL_LIMITS[dim] : null
  const placeholder = dim === 'SPH' ? 'Ej: -1.00' : dim === 'BASE' ? 'Ej: -0.25' : 'Ej: 0.00'
  const inputAttrs = { placeholder, type: 'number', step: '0.25' }
  if (limits) { inputAttrs.min = limits.min; inputAttrs.max = limits.max }

  $buefy?.dialog.prompt({
    message: `Agregar nueva fila (${rowActionLabel.value})`,
    inputAttrs,
    trapFocus: true,
    onConfirm: async (value) => {
      if (value === null || value === undefined || value === '') return
      const num = Number(value)
      if (!ensureQuarterStepOrToast(num, 'row')) return

      opPending.value = true
      $buefy?.toast.open({ message: `Solicitando agregar fila ${rowLabel.value} ${fmtSigned(num)}…`, type: 'is-info' })

      const ack = await emitWithAck('add-row', num)

      opPending.value = false

      // ✅ si hay ACK, respeta ok/error
      if (ack?.ok === true) {
        markServerOk(ack.message || `Fila agregada (${rowLabel.value} ${fmtSigned(num)})`, ack.status ?? null)
        toastFromAck(ack, { successFallback: `Se agregó la fila ${rowLabel.value} ${fmtSigned(num)}.` })
        return
      }
      if (ack?.ok === false) {
        markServerErr(ack.message || 'No se pudo agregar la fila.', ack.status ?? null)
        toastFromAck(ack, { errorFallback: 'No se pudo agregar la fila.' })
        return
      }

      // 🟡 sin ACK: NO asume éxito
      markServerOk('Solicitud enviada', null)
      $buefy?.toast.open({ message: 'Solicitud enviada. Si no ves cambios, revisa el log del backend.', type: 'is-warning' })
    }
  })
}

const openAddColumnModal = () => {
  if (!allowColumns.value) return
  const dim = getContextDimension('col')
  const limits = dim ? PHYSICAL_LIMITS[dim] : null
  const placeholder = dim === 'CYL' ? 'Ej: -0.25' : dim === 'ADD' ? 'Ej: +1.00' : 'Ej: 0.00'
  const inputAttrs = { placeholder, type: 'number', step: '0.25' }
  if (limits) { inputAttrs.min = limits.min; inputAttrs.max = limits.max }

  $buefy?.dialog.prompt({
    message: `Agregar nueva columna (${colActionLabel.value})`,
    inputAttrs,
    trapFocus: true,
    onConfirm: async (value) => {
      if (value === null || value === undefined || value === '') return
      const num = Number(value)
      if (!ensureQuarterStepOrToast(num, 'col')) return

      opPending.value = true
      $buefy?.toast.open({ message: `Solicitando agregar columna ${colLabel.value} ${fmtSigned(num)}…`, type: 'is-info' })

      const ack = await emitWithAck('add-column', num)

      opPending.value = false

      if (ack?.ok === true) {
        markServerOk(ack.message || `Columna agregada (${colLabel.value} ${fmtSigned(num)})`, ack.status ?? null)
        toastFromAck(ack, { successFallback: `Se agregó la columna ${colLabel.value} ${fmtSigned(num)}.` })
        return
      }
      if (ack?.ok === false) {
        markServerErr(ack.message || 'No se pudo agregar la columna.', ack.status ?? null)
        toastFromAck(ack, { errorFallback: 'No se pudo agregar la columna.' })
        return
      }

      markServerOk('Solicitud enviada', null)
      $buefy?.toast.open({ message: 'Solicitud enviada. Si no ves cambios, revisa el log del backend.', type: 'is-warning' })
    }
  })
}

/* ========= atajos ========= */
const isMobile =
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

const handleSaveInternal = () => {
  if (!props.dirty) {
    $buefy?.toast.open({ message: 'No hay cambios pendientes por guardar.', type: 'is-info' })
    return
  }
  if (props.saving || opPending.value) return

  $buefy?.dialog.confirm({
    title: 'Guardar cambios',
    message: 'Se guardarán los cambios realizados en esta planilla.',
    confirmText: 'Guardar',
    cancelText: 'Cancelar',
    type: 'is-primary',
    trapFocus: true,
    onConfirm: async () => {
      opPending.value = true
      $buefy?.toast.open({ message: 'Enviando guardado al servidor…', type: 'is-info' })

      const ack = await emitWithAck('save-request')

      opPending.value = false

      if (ack?.ok === true) {
        markServerOk(ack.message || 'Guardado exitoso', ack.status ?? null)
        toastFromAck(ack, { successFallback: 'Cambios guardados correctamente.' })
        return
      }
      if (ack?.ok === false) {
        markServerErr(ack.message || 'Error al guardar', ack.status ?? null)
        toastFromAck(ack, { errorFallback: 'No se pudieron guardar los cambios.' })
        return
      }

      // sin ACK: NO canta éxito
      markServerOk('Guardado solicitado', null)
      $buefy?.toast.open({ message: 'Guardado solicitado. Si falla, revisa el backend (HTTP/validaciones).', type: 'is-warning' })
    }
  })
}
const handleSaveClick = () => handleSaveInternal()

const handleKey = async (e) => {
  if (isMobile) return
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase()
    if (key === 'z') { e.preventDefault(); undo() }
    else if (key === 'y') { e.preventDefault(); redo() }
    else if (key === 'c') { e.preventDefault(); await copyCell() }
    else if (key === 'x') { e.preventDefault(); await cutCell() }
    else if (key === 'v') { e.preventDefault(); await pasteCell() }
    else if (key === 's') { e.preventDefault(); handleSaveInternal() }
  }
}

onMounted(() => { if (!isMobile) window.addEventListener('keydown', handleKey) })
onBeforeUnmount(() => {
  if (!isMobile) window.removeEventListener('keydown', handleKey)
  window.removeEventListener('beforeunload', onBeforeUnload)
})

/* ========= texto/estado ========= */
const tipoHuman = computed(() => {
  if (!props.tipoMatriz) return ''
  return (
    {
      BASE: 'Monofocal (Base)',
      SPH_CYL: 'Monofocal (Esf/Cil)',
      SPH_ADD: 'Bifocal (SPH + ADD)',
      BASE_ADD: 'Progresivo (BASE + ADD)'
    }[props.tipoMatriz] || props.tipoMatriz
  )
})

const tratamientosLabel = computed(() => (props.tratamientos || []).join(' + '))

const lastSavedLabel = computed(() => {
  if (!props.lastSavedAt) return null
  if (typeof props.lastSavedAt === 'string') return props.lastSavedAt
  try { return new Date(props.lastSavedAt).toLocaleString() }
  catch { return String(props.lastSavedAt) }
})

const handleDiscard = () => {
  if (!props.dirty) {
    $buefy?.toast.open({ message: 'No hay cambios locales para descartar.', type: 'is-info' })
    return
  }
  $buefy?.dialog.confirm({
    title: 'Descartar cambios',
    message: 'Se perderán los cambios locales no guardados. ¿Deseas continuar?',
    confirmText: 'Descartar',
    cancelText: 'Cancelar',
    type: 'is-danger',
    trapFocus: true,
    onConfirm: () => emit('discard-changes')
  })
}
</script>

<style scoped>
.navtools { width: 100%; max-width: 100%; }

.navtools-header {
  width: 100%;
  height: 40px;
  max-width: 100%;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.level-left, .level-right, .level-item { min-width: 0; }

.meta-tags-scroll {
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
.meta-taglist { flex-wrap: nowrap; white-space: nowrap; }

/* ribbon */
.ribbon-actions-row {
  height: 40px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
.ribbon-actions-row::v-deep(.field.is-grouped) { flex-wrap: nowrap; }
.ribbon-actions-row::v-deep(.control) { flex: 0 0 auto; }

/* fx */
.formula-bar-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  background: #f7f3ff;
  border-radius: 999px;
  border: 1px solid #e0d7ff;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.formula-fx-tag {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-inline: 0.9rem;
  min-width: 3rem;
  font-weight: 600;
  border-radius: 999px;
  background: #ffffff;
  color: #7957d5;
  border: 1px solid #e0d7ff;
}
.formula-input { flex: 1 1 260px; min-width: 120px; }
.formula-input::v-deep(.input) {
  border-radius: 999px;
  border-color: transparent;
  box-shadow: none;
  background: #ffffff;
  height: 2.1rem;
  padding-inline: 0.9rem;
}
.formula-input::v-deep(.input:focus) {
  border-color: #b39df2;
  box-shadow: 0 0 0 0.08rem rgba(121, 87, 213, 0.25);
}
.formula-apply-button {
  flex: 0 0 auto;
  border-radius: 999px;
  padding-inline: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
}

/* overlay */
.dirty-float-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.dirty-float {
  position: absolute;
  right: 14px;
  bottom: 14px;
  max-width: min(720px, calc(100vw - 28px));
  pointer-events: auto;
}

.dirty-float__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.65rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(124, 58, 237, 0.10));
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.18);
}

.dirty-float__left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.dirty-float__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.25);
  flex: 0 0 auto;
  line-height: 1;
}
.dirty-float__icon::v-deep(.icon) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1 !important;
  height: 1em;
}
.dirty-float__icon::v-deep(.icon i) {
  line-height: 1 !important;
  display: block;
}

.dirty-float__texts { min-width: 0; }
.dirty-float__title {
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.1;
  color: #3b2a1a;
}
.dirty-float__subtitle {
  font-size: 0.78rem;
  line-height: 1.15;
  color: rgba(55, 65, 81, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 52ch;
}
.dirty-float__hint { margin-left: 0.35rem; opacity: 0.9; }

.dirty-float__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
}

/* transición */
.dirty-float-slide-enter-active,
.dirty-float-slide-leave-active {
  transition: transform 160ms ease, opacity 160ms ease;
}
.dirty-float-slide-enter-from,
.dirty-float-slide-leave-to {
  opacity: 0;
  transform: translate3d(0, 8px, 0);
}

@media (prefers-reduced-motion: reduce) {
  .dirty-float-slide-enter-active,
  .dirty-float-slide-leave-active { transition: none !important; }
}

@media screen and (max-width: 768px) {
  .dirty-float {
    left: 10px;
    right: 10px;
    bottom: 10px;
    max-width: none;
  }
  .dirty-float__content { flex-wrap: wrap; gap: 0.6rem; }
  .dirty-float__subtitle { display: none; }
  .dirty-float__actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}
</style>
