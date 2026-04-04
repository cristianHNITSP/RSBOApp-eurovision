<!-- src/components/ag-grid/navtools.vue -->
<template>
  <section class="navtools">
    <!-- HEADER / META (glass + gradient) -->
    <div class="navtools-card navtools-card--meta">
      <nav class="level is-mobile navtools-header">
        <div class="level-left">
          <div class="level-item">
            <div class="meta-tags-scroll" aria-label="Metadatos de hoja">
              <b-taglist class="meta-taglist">
                <b-tag v-if="tipoHuman" type="is-light" size="is-small" class="meta-pill">
                  <b-icon icon="layer-group" size="is-small" class="mr-1" />
                  {{ tipoHuman }}
                </b-tag>

                <b-tag v-if="material" type="is-light" size="is-small" class="meta-pill">
                  <b-icon icon="gem" size="is-small" class="mr-1" />
                  {{ material }}
                </b-tag>

                <b-tag v-if="tratamientosLabel" type="is-light" size="is-small" class="meta-pill">
                  <b-icon icon="magic" size="is-small" class="mr-1" />
                  {{ tratamientosLabel }}
                </b-tag>

                <b-tag v-if="totalRows != null" type="is-light" size="is-small" class="meta-pill">
                  <b-icon icon="database" size="is-small" class="mr-1" />
                  {{ totalRows }} filas
                </b-tag>
              </b-taglist>
            </div>
          </div>
        </div>

        <div class="level-right">
          <div class="level-item" v-if="serverBadge">
            <b-tag :type="serverBadge.type" size="is-small" class="server-pill">
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
    </div>

    <!-- RIBBON -->
    <div class="navtools-card navtools-card--ribbon">
      <DynamicTabs v-model="activeTab" :tabs="RIBBON_TABS">
        <template #edicion>
          <div class="ribbon-actions-row">
            <b-field grouped group-multiline>
              <p class="control">
                <b-tooltip label="Ctrl+Z" position="is-top">
                  <b-button class="rbtn" size="is-small" icon-left="undo-alt" :disabled="!canUndo" @click="handleUndoClick">
                    Deshacer
                  </b-button>
                </b-tooltip>
              </p>

              <p class="control">
                <b-tooltip label="Ctrl+Y" position="is-top">
                  <b-button class="rbtn" size="is-small" icon-left="redo-alt" :disabled="!canRedo" @click="handleRedoClick">
                    Rehacer
                  </b-button>
                </b-tooltip>
              </p>

              <p class="control">
                <b-tooltip label="Ctrl+C" position="is-top">
                  <b-button class="rbtn" size="is-small" icon-left="copy" @click="handleCopyClick">
                    Copiar
                  </b-button>
                </b-tooltip>
              </p>

              <p class="control">
                <b-tooltip label="Ctrl+X" position="is-top">
                  <b-button class="rbtn" size="is-small" icon-left="cut" @click="handleCutClick">
                    Cortar
                  </b-button>
                </b-tooltip>
              </p>

              <p class="control" v-if="!isMobile">
                <b-tooltip label="Ctrl+V" position="is-top">
                  <b-button class="rbtn" size="is-small" icon-left="paste" @click="handlePasteClick">
                    Pegar
                  </b-button>
                </b-tooltip>
              </p>
            </b-field>
          </div>
        </template>

        <template #estructura>
          <div class="ribbon-actions-row">
            <b-field grouped group-multiline>
              <p class="control">
                <b-button
                  class="rbtn"
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
                  class="rbtn"
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
        </template>

        <template #datos>
          <div class="ribbon-actions-row">
            <b-field grouped group-multiline>
              <p class="control">
                <b-button class="rbtn" size="is-small" type="is-light" icon-left="filter" @click="emit('clear-filters')">
                  Limpiar filtros
                </b-button>
              </p>

              <p class="control">
                <b-button class="rbtn" size="is-small" type="is-light" icon-left="sort-amount-down-alt" @click="emit('reset-sort')">
                  Restablecer orden
                </b-button>
              </p>

              <p class="control">
                <b-button
                  class="rbtn rbtn--primary"
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
                  class="rbtn"
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
                <b-button class="rbtn" size="is-small" type="is-light" icon-left="file-export" @click="emit('export')">
                  Generar Excel
                </b-button>
              </p>
            </b-field>
          </div>
        </template>
      </DynamicTabs>
    </div>

    <!-- FX BAR -->
    <div class="navtools-card navtools-card--fx">
      <div class="formula-bar-card">
        <b-tag type="is-light" class="formula-fx-tag"> fx </b-tag>

        <b-input
          v-model="localValue"
          type="text"
          inputmode="numeric"
          placeholder="Selecciona una celda"
          size="is-small"
          class="formula-input"
          @input="handleFxInput"
          @keyup.enter="applyChange"
          @blur="applyChange"
        />

        <b-button
          size="is-small"
          :rounded="true"
          type="is-primary"
          icon-left="check"
          class="formula-apply-button"
          @click="applyChange"
        >
          Aplicar
        </b-button>
      </div>
    </div>

    <!-- ✅ OVERLAY DIRTY -->
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

                <b-button size="is-small" type="is-light" icon-left="times" :disabled="saving || opPending" @click="dismissDirtyFloat">
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
import { labToast } from "@/composables/useLabToast.js";
import DynamicTabs from "@/components/DynamicTabs.vue";

const RIBBON_TABS = [
  { key: 'edicion',    label: 'Edición',    icon: 'edit' },
  { key: 'estructura', label: 'Estructura', icon: 'border-all' },
  { key: 'datos',      label: 'Datos',      icon: 'database' },
];

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  dirty: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  totalRows: { type: Number, default: 0 },
  sheetName: { type: String, default: '' },
  tipoMatriz: { type: String, default: '' },
  material: { type: String, default: '' },
  tratamientos: { type: Array, default: () => [] },
  lastSavedAt: { type: [String, Date], default: null },
  /* grid-level undo/redo — provided by useGridHistory in templates */
  gridCanUndo: { type: Boolean, default: false },
  gridCanRedo: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:modelValue',
  'add-row',
  'add-column',
  'clear-filters',
  'reset-sort',
  'save-request',
  'discard-changes',
  'export',
  'fx-input',
  'fx-commit',
  'grid-undo',
  'grid-redo',
  'grid-copy',
  'grid-cut',
  'grid-paste',
])

const activeTab = ref('edicion')
const localValue = ref(props.modelValue ?? '')
const fxDirty = ref(false)

const internalInstance = getCurrentInstance()
const $buefy = internalInstance?.appContext?.config?.globalProperties?.$buefy

/* ===================== SAFE UI ERROR HANDLING ===================== */
const stripHtml = (s) => String(s ?? '').replace(/<[^>]*>/g, '')
const collapseWs = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

const looksLikeStackTrace = (s) => {
  const t = String(s ?? '')
  return (
    /(\bat\s+.+\([^)]+\)\b)/.test(t) ||
    /([A-Za-z]:\\|\/).+\.(js|ts|jsx|tsx|json|yml|yaml):\d+:\d+/.test(t) ||
    /\b(node:internal|webpack|vite|chunk)\b/i.test(t)
  )
}

const containsSensitive = (s) => {
  const t = String(s ?? '')
  if (!t) return false
  const patterns = [
    /\bAuthorization:\s*Bearer\s+[A-Za-z0-9\-_\.]+\b/i,
    /\bBearer\s+[A-Za-z0-9\-_\.]+\b/i,
    /\beyJ[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+\b/,
    /\bmongodb(\+srv)?:\/\/[^\s]+/i,
    /\/\/[^/\s:]+:[^@\s]+@/i,
    /\b(api[_-]?key|token|secret|password|passwd|pwd)\b\s*[:=]\s*["']?[^"'\s]+/i,
    /\bPRIVATE KEY\b|\bBEGIN (RSA|EC|OPENSSH) PRIVATE KEY\b/i,
    /\bAKIA[0-9A-Z]{16}\b/,
  ]
  return patterns.some((re) => re.test(t))
}

const sanitizeUserText = (raw, { maxLen = 140 } = {}) => {
  if (raw == null) return ''
  let s = collapseWs(stripHtml(raw))
  if (!s) return ''
  if (containsSensitive(s) || looksLikeStackTrace(s)) return ''
  if (s.length > maxLen) s = s.slice(0, maxLen - 1).trimEnd() + '…'
  return s
}

const guessCategory = (status, rawMsg) => {
  const msg = String(rawMsg ?? '').toLowerCase()
  if (msg.includes('network error') || msg.includes('failed to fetch') || msg.includes('econnrefused') || msg.includes('timeout') || msg.includes('etimedout')) return 'network'
  if (status === 401) return 'auth'
  if (status === 403) return 'forbidden'
  if (status === 400 || status === 422) return 'validation'
  if (status === 404) return 'notfound'
  if (status === 409) return 'conflict'
  if (status === 429) return 'ratelimit'
  if (msg.includes('e11000') || msg.includes('duplicate key')) return 'conflict'
  if (msg.includes('casterror') || msg.includes('validationerror')) return 'validation'
  if (typeof status === 'number' && status >= 500) return 'server'
  return 'generic'
}

const categoryToPublicMessage = (category) => {
  switch (category) {
    case 'network': return 'No se pudo conectar con el servidor. Revisa tu red o intenta de nuevo.'
    case 'auth': return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    case 'forbidden': return 'No tienes permisos para realizar esta acción.'
    case 'validation': return 'Hay datos inválidos o fuera de rango. Revisa los valores e intenta de nuevo.'
    case 'notfound': return 'No se encontró el recurso solicitado.'
    case 'conflict': return 'Conflicto: ese registro/valor ya existe o está en uso.'
    case 'ratelimit': return 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.'
    case 'server': return 'Error interno del servidor. Intenta más tarde.'
    default: return 'Ocurrió un error al procesar la operación. Intenta de nuevo.'
  }
}

const normalizeAck = (ack, { successFallback = 'Listo.', errorFallback = 'Ocurrió un error.' } = {}) => {
  if (!ack) return null
  if (typeof ack === 'string') {
    const safe = sanitizeUserText(ack)
    return { ok: false, status: null, message: safe || errorFallback, _raw: ack }
  }
  if (ack instanceof Error) {
    const status = ack?.response?.status ?? ack?.status ?? null
    const rawMsg = ack?.response?.data?.message ?? ack?.message ?? String(ack)
    const category = guessCategory(status, rawMsg)
    const safeMsg = sanitizeUserText(rawMsg)
    return { ok: false, status, message: safeMsg || categoryToPublicMessage(category), _raw: rawMsg }
  }

  const status = ack?.status ?? ack?.statusCode ?? ack?.response?.status ?? ack?.response?.statusCode ?? null
  const ok =
    ack?.ok === true ? true :
    ack?.ok === false ? false :
    typeof status === 'number' ? status < 400 :
    null

  const rawMsg = ack?.message ?? ack?.response?.data?.message ?? ack?.response?.data?.error ?? ack?.error ?? ''

  if (ok === true) {
    const safe = sanitizeUserText(rawMsg)
    return { ok: true, status, message: safe || successFallback, _raw: rawMsg }
  }

  const category = guessCategory(status, rawMsg)
  const safe = sanitizeUserText(rawMsg)
  const publicMsg = safe || categoryToPublicMessage(category) || errorFallback
  return { ok: ok === null ? false : ok, status, message: publicMsg, _raw: rawMsg }
}

const safeToast = (message, type = 'is-info') => {
  try {
    labToast.show(sanitizeUserText(message, { maxLen: 180 }) || 'Listo.', type);
  } catch {
    console.warn('[navtools] toast failed');
  }
};

const toastFromAck = (ack, { successFallback, errorFallback } = {}) => {
  const n = normalizeAck(ack, { successFallback, errorFallback })
  if (!n) return
  safeToast(n.message, n.ok ? 'is-success' : 'is-danger')
}

/* ===================== Backend ACK (estado real) ===================== */
const opPending = ref(false)
const lastServer = ref({ kind: 'idle', text: '', status: null, at: null })

const serverBadge = computed(() => {
  if (props.saving || opPending.value) return { type: 'is-info', icon: 'spinner', text: 'Procesando…' }
  if (lastServer.value.kind === 'error') return { type: 'is-danger', icon: 'times-circle', text: lastServer.value.text || 'Error' }
  if (lastServer.value.kind === 'ok') return { type: 'is-success', icon: 'check-circle', text: lastServer.value.text || 'Ok' }
  return null
})

const markServerOk = (text = 'Operación exitosa', status = null) => {
  lastServer.value = { kind: 'ok', text: sanitizeUserText(text) || 'Operación exitosa', status, at: new Date() }
}
const markServerErr = (text = 'Error', status = null) => {
  lastServer.value = { kind: 'error', text: sanitizeUserText(text) || 'Ocurrió un error', status, at: new Date() }
}

const emitWithAck = (eventName, ...args) => {
  const ACK_TIMEOUT_MS = 2000
  return new Promise((resolve) => {
    let done = false
    const ack = (payload) => { if (done) return; done = true; resolve(payload) }
    emit(eventName, ...args, ack)
    setTimeout(() => { if (done) return; done = true; resolve(undefined) }, ACK_TIMEOUT_MS)
  })
}

/* ========= Dirty float ========= */
const dirtyFloatDismissed = ref(false)
const dirtyChangeTick = ref(0)
const showDirtyFloat = computed(() => props.dirty && !props.saving && !dirtyFloatDismissed.value)
const dismissDirtyFloat = () => { dirtyFloatDismissed.value = true }

watch(
  () => props.modelValue,
  (val, oldVal) => {
    fxDirty.value = false
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

/* ========= Warn unload ========= */
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

/* ========= Undo/redo ========= */
const MAX_HISTORY = 200
const undoStack = ref([])
const redoStack = ref([])
const isApplyingHistory = ref(false)

const canUndo = computed(() => props.gridCanUndo || undoStack.value.length > 0)
const canRedo = computed(() => props.gridCanRedo || redoStack.value.length > 0)

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

/* ===================== FX ===================== */
const handleFxInput = (val) => {
  fxDirty.value = true
  emit('fx-input', val ?? localValue.value)
}

const applyChange = () => {
  if (!fxDirty.value) return
  fxDirty.value = false

  const rawText = String(localValue.value ?? '')
  const raw = rawText.trim()

  let next
  if (raw === '') next = 0
  else if (/^-?\d+(\.\d+)?$/.test(raw)) next = Number(raw)
  else next = stripHtml(raw)

  if (next !== props.modelValue) emit('update:modelValue', next)
  emit('fx-commit', rawText)
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

/* ========= Clipboard ========= */
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
  } catch {
    safeToast('El navegador bloqueó el acceso al portapapeles.', 'is-danger')
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
  } catch {
    safeToast('El navegador bloqueó el acceso al portapapeles.', 'is-danger')
    return ''
  }
}

const copyCell = async () => { if (localValue.value !== '' && localValue.value != null) await copyToClipboard(String(localValue.value)) }
const cutCell = async () => {
  if (localValue.value !== '' && localValue.value != null) {
    await copyToClipboard(String(localValue.value))
    emit('update:modelValue', 0)
  }
}
const pasteCell = async () => {
  const pasted = await pasteFromClipboard()
  if (!pasted) return
  const str = collapseWs(stripHtml(pasted))
  if (/^-?\d+(\.\d+)?$/.test(str)) emit('update:modelValue', Number(str))
  else emit('update:modelValue', str)
}

const handleUndoClick = () => { if (props.gridCanUndo) emit('grid-undo'); else undo() }
const handleRedoClick = () => { if (props.gridCanRedo) emit('grid-redo'); else redo() }
const handleCopyClick = () => { emit('grid-copy'); copyCell() }
const handleCutClick = () => { emit('grid-cut'); cutCell() }
const handlePasteClick = () => { emit('grid-paste'); pasteCell() }

/* ========= Modales fila/columna ========= */
const PHYSICAL_LIMITS = Object.freeze({
  SPH: { min: -40, max: 40 },
  CYL: { min: -15, max: 0 },   // ✅ en SPH_CYL nosotros operamos CYL negativo/0
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
    case 'SPH_ADD': return 'SPH'
    case 'BASE_ADD':
    case 'BASE': return 'BASE'
    default: return 'valor'
  }
})

const colLabel = computed(() => {
  switch (props.tipoMatriz) {
    case 'SPH_CYL': return 'CYL'
    case 'SPH_ADD':
    case 'BASE_ADD': return 'ADD'
    case 'BASE': return 'valor'
    default: return 'valor'
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

/** ✅ regla: si es CYL en SPH_CYL, debe ser negativo (o 0 no permitido por tu lógica de columnas) */
const validateCylSignRule = (num) => {
  if (props.tipoMatriz !== 'SPH_CYL') return true
  if (!Number.isFinite(num)) return false
  if (num >= 0) {
    safeToast('Para CYL escribe el valor NEGATIVO. Ej: -0.25, -1.00, -7.00.', 'is-danger')
    return false
  }
  return true
}

const ensureQuarterStepOrToast = (value, kind) => {
  const num = Number(value)
  const lbl = kind === 'row' ? rowLabel.value : colLabel.value

  if (!Number.isFinite(num)) {
    safeToast(`Ingresa un valor numérico válido${lbl === 'valor' ? '' : ` para ${lbl}`}.`, 'is-danger')
    return false
  }

  const dim = getContextDimension(kind)
  if (dim && PHYSICAL_LIMITS[dim]) {
    const { min, max } = PHYSICAL_LIMITS[dim]
    if (num < min || num > max) {
      safeToast(`${dim} debe estar entre ${min.toFixed(2)} y ${max.toFixed(2)} D.`, 'is-danger')
      return false
    }
  }

  if (!isQuarterStep(num)) {
    const what = lbl === 'valor' ? '' : ` de ${lbl}`
    safeToast(
      `El valor${what} debe ser múltiplo de 0.25 D (…00, …25, …50, …75). Ejemplos: -6.00, -5.75, -5.50, +0.00, +0.25.`,
      'is-danger'
    )
    return false
  }

  // ✅ extra: si es col CYL, obligamos signo negativo
  if (kind === 'col' && getContextDimension('col') === 'CYL') {
    if (!validateCylSignRule(num)) return false
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
      safeToast(`Solicitando agregar fila ${rowLabel.value} ${fmtSigned(num)}…`, 'is-info')

      const ack = await emitWithAck('add-row', num)
      opPending.value = false

      const n = normalizeAck(ack, {
        successFallback: `Se agregó la fila ${rowLabel.value} ${fmtSigned(num)}.`,
        errorFallback: 'No se pudo agregar la fila.'
      })

      if (n?.ok === true) { markServerOk(n.message, n.status ?? null); toastFromAck(n); return }
      if (n?.ok === false) { markServerErr(n.message, n.status ?? null); toastFromAck(n); return }

      markServerOk('Solicitud enviada', null)
      safeToast('Solicitud enviada. Si no ves cambios, revisa el log del backend.', 'is-warning')
    }
  })
}

const openAddColumnModal = () => {
  if (!allowColumns.value) return
  const dim = getContextDimension('col')
  const limits = dim ? PHYSICAL_LIMITS[dim] : null

  // ✅ placeholder claro para CYL
  const placeholder =
    dim === 'CYL'
      ? 'Ej: -0.25 (CYL siempre negativo)'
      : dim === 'ADD'
        ? 'Ej: +1.00'
        : 'Ej: 0.00'

  const inputAttrs = { placeholder, type: 'number', step: '0.25' }
  if (limits) { inputAttrs.min = limits.min; inputAttrs.max = limits.max }

  $buefy?.dialog.prompt({
    message: `Agregar nueva columna (${colActionLabel.value})`,
    inputAttrs,
    trapFocus: true,
    onConfirm: async (value) => {
      if (value === null || value === undefined || value === '') return
      const num = Number(value)

      // ✅ validación (incluye CYL negativo obligatorio cuando aplica)
      if (!ensureQuarterStepOrToast(num, 'col')) return

      opPending.value = true
      safeToast(`Solicitando agregar columna ${colLabel.value} ${fmtSigned(num)}…`, 'is-info')

      // ✅ para CYL mandamos el negativo tal cual (sin abs)
      const ack = await emitWithAck('add-column', num)
      opPending.value = false

      const n = normalizeAck(ack, {
        successFallback: `Se agregó la columna ${colLabel.value} ${fmtSigned(num)}.`,
        errorFallback: 'No se pudo agregar la columna.'
      })

      if (n?.ok === true) { markServerOk(n.message, n.status ?? null); toastFromAck(n); return }
      if (n?.ok === false) { markServerErr(n.message, n.status ?? null); toastFromAck(n); return }

      markServerOk('Solicitud enviada', null)
      safeToast('Solicitud enviada. Si no ves cambios, revisa el log del backend.', 'is-warning')
    }
  })
}

/* ========= atajos ========= */
const isMobile =
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

const handleSaveInternal = () => {
  if (!props.dirty) { safeToast('No hay cambios pendientes por guardar.', 'is-info'); return }
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
      safeToast('Enviando guardado al servidor…', 'is-info')

      const ack = await emitWithAck('save-request')
      opPending.value = false

      const n = normalizeAck(ack, {
        successFallback: 'Cambios guardados correctamente.',
        errorFallback: 'No se pudieron guardar los cambios.'
      })

      if (n?.ok === true) { markServerOk(n.message, n.status ?? null); toastFromAck(n); return }
      if (n?.ok === false) { markServerErr(n.message, n.status ?? null); toastFromAck(n); return }

      markServerOk('Guardado solicitado', null)
      safeToast('Guardado solicitado. Si falla, revisa el backend (HTTP/validaciones).', 'is-warning')
    }
  })
}
const handleSaveClick = () => handleSaveInternal()

const handleKey = async (e) => {
  if (isMobile) return
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase()
    if (key === 'z') { e.preventDefault(); if (props.gridCanUndo) emit('grid-undo'); else undo() }
    else if (key === 'y') { e.preventDefault(); if (props.gridCanRedo) emit('grid-redo'); else redo() }
    else if (key === 'c') { e.preventDefault(); emit('grid-copy'); await copyCell() }
    else if (key === 'x') { e.preventDefault(); emit('grid-cut'); await cutCell() }
    else if (key === 'v') { e.preventDefault(); emit('grid-paste'); await pasteCell() }
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
  if (!props.dirty) { safeToast('No hay cambios locales para descartar.', 'is-info'); return }
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
/* ===== tokens (metodología) ===== */
.navtools {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

/* glass cards */
.navtools-card {
  border-radius: 0.95rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  background: var(--surface-raised);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
}

.navtools-card--meta {
  background:
    radial-gradient(circle at 0% 0%, rgba(121,87,213,0.10), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(236,72,153,0.08), transparent 60%),
    var(--surface-raised);
}

.navtools-card--ribbon {
  background:
    linear-gradient(120deg, rgba(121,87,213,0.10), rgba(154,109,255,0.08), rgba(236,72,153,0.06)),
    var(--surface-raised);
}

.navtools-card--fx {
  background:
    radial-gradient(circle at 0% 0%, rgba(121,87,213,0.08), transparent 55%),
    var(--surface-raised);
}

/* header row */
.navtools-header {
  width: 100%;
  padding: 0.55rem 0.7rem;
  margin: 0;
  min-height: 44px;
}

.level-left, .level-right, .level-item { min-width: 0; }

/* tags */
.meta-tags-scroll {
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
.meta-taglist { flex-wrap: nowrap; white-space: nowrap; }
.meta-pill {
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(148,163,184,0.22);
}

.server-pill {
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(148,163,184,0.22);
}

/* tabs */
.ribbon-tabs::v-deep(.tabs) { margin-bottom: 0 !important; padding: .5rem; }
.ribbon-tabs::v-deep(.tab-content) { padding: 0.35rem 0.4rem 0.55rem;  }

.ribbon-tabs::v-deep(.tabs.is-toggle-rounded li a) {
  border-radius: 999px !important;
  font-weight: 800;
  margin-left: 1.5rem; 
}

.ribbon-tabs::v-deep(.tabs.is-toggle-rounded li:first-child a) {
  margin-left: 0;
}

/* ribbon actions */
.ribbon-actions-row {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;

  -webkit-overflow-scrolling: touch;
  padding: 0.25rem 0.15rem;
}
.ribbon-actions-row::v-deep(.field.is-grouped) { flex-wrap: nowrap; }
.ribbon-actions-row::v-deep(.control) { flex: 0 0 auto; }

/* buttons */
.rbtn {
  border-radius: 999px !important;
  box-shadow: 0 0 0 1px rgba(148,163,184,0.18);
  transition: transform 120ms ease, box-shadow 140ms ease;
}
.rbtn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.18);
}
.rbtn--primary {
  box-shadow: 0 0 0 1px rgba(121,87,213,0.18);
}

/* fx */
.formula-bar-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(121,87,213,0.18);
  background:
    radial-gradient(circle at 20% 0%, rgba(121,87,213,0.12), transparent 55%),
    linear-gradient(90deg, rgba(144,111,225,0.10), rgba(236,72,153,0.06)),
    var(--surface-solid);
  margin: 0.55rem 0.55rem 0.6rem;
}

.formula-fx-tag {
  border-radius: 999px;
  padding-inline: 0.9rem;
  font-weight: 900;
  background: var(--bg-muted);
  color: var(--c-primary);
  border: 1px solid rgba(121,87,213,0.25);
}

.formula-input { flex: 1 1 260px; min-width: 120px; }
.formula-input::v-deep(.input) {
  border-radius: 999px;
  border-color: transparent;
  box-shadow: none;
  background: var(--surface-solid);
  height: 2.1rem;
  padding-inline: 0.9rem;
}
.formula-input::v-deep(.input:focus) {
  border-color: rgba(121,87,213,0.35);
  box-shadow: 0 0 0 0.09rem rgba(121, 87, 213, 0.22);
}
.formula-apply-button {
  border-radius: 999px;
  padding-inline: 1.1rem;
  font-weight: 900;
  white-space: nowrap;
}

/* overlay dirty (tu base) */
.dirty-float-root { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
.dirty-float { position: absolute; right: 14px; bottom: 14px; max-width: min(720px, calc(100vw - 28px)); pointer-events: auto; }

.dirty-float__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.65rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(124, 58, 237, 0.10));
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  box-shadow: var(--shadow-md);
}

.dirty-float__left { display: flex; align-items: center; gap: 0.55rem; min-width: 0; }
.dirty-float__icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.25);
  flex: 0 0 auto;
}
.dirty-float__texts { min-width: 0; }
.dirty-float__title { font-weight: 900; letter-spacing: 0.01em; line-height: 1.1; color: var(--text-primary); }
.dirty-float__subtitle { font-size: 0.78rem; line-height: 1.15; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 52ch; }
.dirty-float__hint { margin-left: 0.35rem; opacity: 0.9; }
.dirty-float__actions { display: flex; align-items: center; gap: 0.45rem; flex: 0 0 auto; }

.dirty-float-slide-enter-active,
.dirty-float-slide-leave-active { transition: transform 160ms ease, opacity 160ms ease; }
.dirty-float-slide-enter-from,
.dirty-float-slide-leave-to { opacity: 0; transform: translate3d(0, 8px, 0); }

@media (prefers-reduced-motion: reduce) {
  .dirty-float-slide-enter-active,
  .dirty-float-slide-leave-active { transition: none !important; }
}

@media screen and (max-width: 768px) {
  .dirty-float { left: 10px; right: 10px; bottom: 10px; max-width: none; }
  .dirty-float__content { flex-wrap: wrap; gap: 0.6rem; }
  .dirty-float__subtitle { display: none; }
  .dirty-float__actions { width: 100%; justify-content: flex-end; flex-wrap: wrap; }
}
</style>
