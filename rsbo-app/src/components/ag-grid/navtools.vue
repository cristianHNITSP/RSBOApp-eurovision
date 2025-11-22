<template>
  <section class="navtools">
    <!-- HEADER: META + ESTADO -->
    <nav class="level is-mobile mb-2 navtools-header">
      <div class="level-left">
        <div class="level-item">
          <!-- contenedor con scroll horizontal solo para las tags -->
          <div class="meta-tags-scroll">
            <b-taglist>
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
        <div class="level-item" v-if="lastSavedLabel">
          <span class="is-size-7 has-text-grey">
            <b-icon icon="clock" size="is-small" class="mr-1" />
            {{ lastSavedLabel }}
          </span>
        </div>
        <div class="level-item">
          <b-tag :type="statusTagType" size="is-small">
            <b-icon v-if="saving" icon="spinner" size="is-small" class="fa-spin mr-1" />
            <b-icon v-else-if="dirty" icon="exclamation-circle" size="is-small" class="mr-1" />
            <b-icon v-else icon="check-circle" size="is-small" class="mr-1" />
            {{ statusText }}
          </b-tag>
        </div>
      </div>
    </nav>

    <!-- TABS DE ACCIONES -->
    <b-tabs v-model="activeTab" size="is-small" type="is-toggle-rounded" class="p-0 m-0">
      <!-- EDICIÓN -->
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

      <!-- ESTRUCTURA -->
      <b-tab-item label="Estructura" icon="border-all">
        <div class="ribbon-actions-row">
          <b-field grouped group-multiline>
            <p class="control">
              <b-button size="is-small" icon-left="plus-square" type="is-light" @click="openAddRowModal">
                {{ rowActionLabel }}
              </b-button>
            </p>

            <p class="control" v-if="allowColumns">
              <b-button size="is-small" icon-left="plus" type="is-light" @click="openAddColumnModal">
                {{ colActionLabel }}
              </b-button>
            </p>
          </b-field>
        </div>
      </b-tab-item>

      <!-- DATOS -->
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
              <b-button size="is-small" :type="dirty ? 'is-primary' : 'is-light'" icon-left="save"
                :disabled="!dirty || saving" @click="handleSaveClick">
                <span v-if="saving">Guardando…</span>
                <span v-else>Guardar cambios</span>
              </b-button>
            </p>

            <p class="control">
              <b-button size="is-small" type="is-light" icon-left="undo" :disabled="!dirty || saving"
                @click="handleDiscard">
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
      <b-tag type="is-light" class="formula-fx-tag">
        fx
      </b-tag>

      <b-input v-model="localValue" type="text" inputmode="numeric" placeholder="Selecciona una celda" size="is-small"
        class="formula-input" @keyup.enter="applyChange" @blur="applyChange" />

      <b-button size="is-small" type="is-primary" icon-left="check" class="formula-apply-button" @click="applyChange">
        Aplicar
      </b-button>
    </div>
  </section>
</template>

<script setup>
import {
  ref,
  watch,
  computed,
  defineProps,
  defineEmits,
  onMounted,
  onBeforeUnmount,
  getCurrentInstance
} from 'vue'

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

/* ========= Buefy instancia ========= */
const internalInstance = getCurrentInstance()
const $buefy =
  internalInstance?.appContext?.config?.globalProperties?.$buefy

/* ========= Límites físicos de dioptrías ========= */
const PHYSICAL_LIMITS = Object.freeze({
  SPH: { min: -40, max: 40 },
  CYL: { min: -15, max: 15 },
  BASE: { min: -40, max: 40 },
  ADD: { min: 0, max: 8 }
})

/* ========= Historial deshacer / rehacer ========= */
const MAX_HISTORY = 200
const undoStack = ref([])
const redoStack = ref([])
const isApplyingHistory = ref(false)

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

console.log('[Navtools] mounted for sheet:', props.sheetName || '(sin nombre)')

watch(
  () => props.modelValue,
  (val, oldVal) => {
    if (!isApplyingHistory.value && oldVal !== undefined && oldVal !== val) {
      if (undoStack.value.length >= MAX_HISTORY) {
        undoStack.value.shift()
      }
      undoStack.value.push(oldVal ?? '')
      redoStack.value = []
    }
    localValue.value = val ?? ''
  }
)

watch(
  () => props.dirty,
  (val) => {
    console.log('[Navtools] props.dirty cambió →', val)
  },
  { immediate: true }
)

watch(
  () => props.saving,
  (val) => {
    console.log('[Navtools] props.saving cambió →', val)
  },
  { immediate: true }
)

/* ========= Helpers dioptrías ========= */
const isQuarterStep = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return false
  const scaled = num * 4
  return Math.abs(scaled - Math.round(scaled)) < 1e-6
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

/** Etiquetas amigables para estructura */
const rowActionLabel = computed(() => {
  const dim = getContextDimension('row')
  switch (dim) {
    case 'SPH':
      return 'Agregar esférica'
    case 'BASE':
      return 'Agregar base'
    default:
      return 'Agregar fila'
  }
})

const colActionLabel = computed(() => {
  const dim = getContextDimension('col')
  switch (dim) {
    case 'CYL':
      return 'Agregar cilíndrica'
    case 'ADD':
      return 'Agregar adición'
    default:
      return 'Agregar columna'
  }
})

const ensureQuarterStepOrToast = (value, kind) => {
  const num = Number(value)
  const lbl = kind === 'row' ? rowLabel.value : colLabel.value

  if (!Number.isFinite(num)) {
    $buefy?.toast.open({
      message: `Ingresa un valor numérico válido${lbl === 'valor' ? '' : ` para ${lbl}`}.`,
      type: 'is-danger'
    })
    return false
  }

  const dim = getContextDimension(kind)
  if (dim && PHYSICAL_LIMITS[dim]) {
    const { min, max } = PHYSICAL_LIMITS[dim]
    if (num < min || num > max) {
      $buefy?.toast.open({
        message: `${dim} debe estar entre ${min.toFixed(2)} y ${max.toFixed(
          2
        )} D.`,
        type: 'is-danger'
      })
      return false
    }
  }

  if (!isQuarterStep(num)) {
    const what = lbl === 'valor' ? '' : ` de ${lbl}`
    $buefy?.toast.open({
      message:
        `El valor${what} debe ser múltiplo de 0.25 D (…00, …25, …50, …75). ` +
        `Ejemplos válidos: -6.00, -5.75, -5.50, 0.00, 0.25, 0.50.`,
      type: 'is-danger'
    })
    return false
  }

  return true
}

/* ========= Aplicar cambio fx ========= */
const applyChange = () => {
  const raw = String(localValue.value ?? '').trim()
  console.log('[Navtools] applyChange, raw:', raw)
  if (raw === '') {
    emit('update:modelValue', 0)
  } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
    emit('update:modelValue', Number(raw))
  } else {
    emit('update:modelValue', raw)
  }
}

/* ========= Undo / Redo ========= */
const undo = () => {
  if (!undoStack.value.length) return
  const current = props.modelValue ?? ''
  const previous = undoStack.value.pop()
  console.log('[Navtools] undo', { current, previous })
  redoStack.value.push(current)
  isApplyingHistory.value = true
  emit('update:modelValue', previous)
  setTimeout(() => {
    isApplyingHistory.value = false
  }, 0)
}

const redo = () => {
  if (!redoStack.value.length) return
  const current = props.modelValue ?? ''
  const next = redoStack.value.pop()
  console.log('[Navtools] redo', { current, next })
  undoStack.value.push(current)
  isApplyingHistory.value = true
  emit('update:modelValue', next)
  setTimeout(() => {
    isApplyingHistory.value = false
  }, 0)
}

/* ========= Copiar / Cortar / Pegar ========= */
const copyToClipboard = async (text) => {
  try {
    console.log('[Navtools] copyToClipboard:', text)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
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
    $buefy?.toast.open({
      message: 'El navegador bloqueó el acceso al portapapeles.',
      type: 'is-danger'
    })
  }
}

const pasteFromClipboard = async () => {
  try {
    console.log('[Navtools] pasteFromClipboard')
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText()
    } else {
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
    }
  } catch (err) {
    console.error('Error pegando:', err)
    $buefy?.toast.open({
      message: 'El navegador bloqueó el acceso al portapapeles.',
      type: 'is-danger'
    })
    return ''
  }
}

const copyCell = async () => {
  console.log('[Navtools] copyCell, localValue:', localValue.value)
  if (localValue.value !== '' && localValue.value != null) {
    await copyToClipboard(localValue.value.toString())
  }
}

const cutCell = async () => {
  console.log('[Navtools] cutCell, localValue:', localValue.value)
  if (localValue.value !== '' && localValue.value != null) {
    await copyToClipboard(localValue.value.toString())
    emit('update:modelValue', 0)
  }
}

const pasteCell = async () => {
  const pasted = await pasteFromClipboard()
  console.log('[Navtools] pasteCell, pasted:', pasted)
  if (!pasted) return
  const str = pasted.trim()
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    emit('update:modelValue', Number(str))
  } else {
    emit('update:modelValue', str)
  }
}

/* ========= Modales fila / columna ========= */
const openAddRowModal = () => {
  console.log('[Navtools] openAddRowModal')

  const dim = getContextDimension('row')
  const limits = dim ? PHYSICAL_LIMITS[dim] : null

  const placeholder =
    dim === 'SPH'
      ? 'Ej: -1.00'
      : dim === 'BASE'
        ? 'Ej: 0.00'
        : 'Ej: 0.00'

  const inputAttrs = {
    placeholder,
    type: 'number',
    step: '0.25'
  }

  if (limits) {
    inputAttrs.min = limits.min
    inputAttrs.max = limits.max
  }

  $buefy?.dialog.prompt({
    message: `Agregar nueva fila (${rowActionLabel.value})`,
    inputAttrs,
    trapFocus: true,
    onConfirm: (value) => {
      console.log('[Navtools] add-row confirm:', value)
      if (value === null || value === undefined || value === '') return

      const num = Number(value)
      if (!ensureQuarterStepOrToast(num, 'row')) return

      emit('add-row', num)

      $buefy?.toast.open({
        message: `Se agregó la fila ${rowLabel.value} ${num.toFixed(2)}.`,
        type: 'is-success'
      })
    }
  })
}

const openAddColumnModal = () => {
  console.log('[Navtools] openAddColumnModal')
  if (!allowColumns.value) return

  const dim = getContextDimension('col')
  const limits = dim ? PHYSICAL_LIMITS[dim] : null

  const placeholder =
    dim === 'CYL'
      ? 'Ej: -0.25'
      : dim === 'ADD'
        ? 'Ej: 1.00'
        : 'Ej: 0.00'

  const inputAttrs = {
    placeholder,
    type: 'number',
    step: '0.25'
  }

  if (limits) {
    inputAttrs.min = limits.min
    inputAttrs.max = limits.max
  }

  $buefy?.dialog.prompt({
    message: `Agregar nueva columna (${colActionLabel.value})`,
    inputAttrs,
    trapFocus: true,
    onConfirm: (value) => {
      console.log('[Navtools] add-column confirm:', value)
      if (value === null || value === undefined || value === '') return

      const num = Number(value)
      if (!ensureQuarterStepOrToast(num, 'col')) return

      emit('add-column', num)

      $buefy?.toast.open({
        message: `Se agregó la columna ${colLabel.value} ${num.toFixed(2)}.`,
        type: 'is-success'
      })
    }
  })
}

/* ========= Wrappers de click ========= */
const handleUndoClick = () => {
  console.log('[Navtools] botón Deshacer')
  undo()
}
const handleRedoClick = () => {
  console.log('[Navtools] botón Rehacer')
  redo()
}
const handleCopyClick = () => {
  console.log('[Navtools] botón Copiar')
  copyCell()
}
const handleCutClick = () => {
  console.log('[Navtools] botón Cortar')
  cutCell()
}
const handlePasteClick = () => {
  console.log('[Navtools] botón Pegar')
  pasteCell()
}

/* ========= Atajos de teclado ========= */
const isMobile =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

const handleSaveInternal = () => {
  console.log(
    '[Navtools] handleSaveInternal llamado. dirty:',
    props.dirty,
    'saving:',
    props.saving
  )

  if (!props.dirty) {
    $buefy?.toast.open({
      message: 'No hay cambios pendientes por guardar.',
      type: 'is-info'
    })
    return
  }
  if (props.saving) {
    return
  }

  $buefy?.dialog.confirm({
    title: 'Guardar cambios',
    message: 'Se guardarán los cambios realizados en esta planilla.',
    confirmText: 'Guardar',
    cancelText: 'Cancelar',
    type: 'is-primary',
    trapFocus: true,
    onConfirm: () => {
      console.log("[Navtools] Confirm guardado → emit('save-request')")
      emit('save-request')
    }
  })
}

const handleSaveClick = () => {
  console.log('[Navtools] Botón Guardar clicado')
  handleSaveInternal()
}

const handleKey = async (e) => {
  if (isMobile) return
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase()
    if (key === 'z') {
      e.preventDefault()
      undo()
    } else if (key === 'y') {
      e.preventDefault()
      redo()
    } else if (key === 'c') {
      e.preventDefault()
      await copyCell()
    } else if (key === 'x') {
      e.preventDefault()
      await cutCell()
    } else if (key === 'v') {
      e.preventDefault()
      await pasteCell()
    } else if (key === 's') {
      e.preventDefault()
      handleSaveInternal()
    }
  }
}

onMounted(() => {
  if (!isMobile) {
    window.addEventListener('keydown', handleKey)
  }
})

onBeforeUnmount(() => {
  if (!isMobile) {
    window.removeEventListener('keydown', handleKey)
  }
})

/* ========= Texto y estado visual ========= */
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

const tratamientosLabel = computed(() =>
  (props.tratamientos || []).join(' + ')
)

const lastSavedLabel = computed(() => {
  if (!props.lastSavedAt) return null
  if (typeof props.lastSavedAt === 'string') return props.lastSavedAt
  try {
    const d = new Date(props.lastSavedAt)
    return d.toLocaleString()
  } catch {
    return String(props.lastSavedAt)
  }
})

const statusText = computed(() => {
  if (props.saving) return 'Guardando cambios…'
  if (props.dirty) return 'Cambios sin guardar'
  return 'Sin cambios pendientes'
})

const statusTagType = computed(() => {
  if (props.saving) return 'is-info'
  if (props.dirty) return 'is-warning'
  return 'is-success'
})

const handleDiscard = () => {
  console.log('[Navtools] handleDiscard, dirty:', props.dirty)
  if (!props.dirty) {
    $buefy?.toast.open({
      message: 'No hay cambios locales para descartar.',
      type: 'is-info'
    })
    return
  }
  $buefy?.dialog.confirm({
    title: 'Descartar cambios',
    message:
      'Se perderán los cambios locales no guardados. ¿Deseas continuar?',
    confirmText: 'Descartar',
    cancelText: 'Cancelar',
    type: 'is-danger',
    trapFocus: true,
    onConfirm: () => {
      console.log("[Navtools] confirm discard → emit('discard-changes')")
      emit('discard-changes')
    }
  })
}
</script>

<style scoped>
.navtools {
  width: 100%;
  max-width: 100%;

}

.navtools-header {
  width: 100%;
  height: 40px;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* FILAS DE BOTONES: scroll horizontal en vez de columna */
.ribbon-actions-row {
  height: 40px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

/* que los controles no se rompan a otra línea */
.ribbon-actions-row::v-deep(.field.is-grouped) {
  flex-wrap: nowrap;
}

.ribbon-actions-row::v-deep(.control) {
  flex: 0 0 auto;
}

/* ===== BARRA FX NUEVA ===== */

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

/* pastilla fx */
.formula-fx-tag {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-inline: 0.9rem;
  min-width: 3rem;
  font-weight: 600;
  text-transform: lowercase;
  border-radius: 999px;
  background: #ffffff;
  color: #7957d5;
  border: 1px solid #e0d7ff;
}

/* el input se estira, pero sin romperse */
.formula-input {
  flex: 1 1 260px;
  min-width: 120px;
}

/* estilizar el input de Buefy */
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

/* botón aplicar */
.formula-apply-button {
  flex: 0 0 auto;
  border-radius: 999px;
  padding-inline: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
}

/* En móvil: mismo layout (fila), pero con un poco menos de padding */
@media screen and (max-width: 768px) {
  .formula-bar-card {
    padding: 0.3rem 0.45rem;
  }
}
</style>
