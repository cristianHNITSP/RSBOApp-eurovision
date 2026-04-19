/**
 * src/composables/ag-grid/navtools/useNavtoolsModals.js
 * Lógica para diálogos de prompt (Agregar Fila / Columna).
 */

import { computed } from 'vue'

const PHYSICAL_LIMITS = Object.freeze({
  SPH:  { min: -40, max: 40 },
  CYL:  { min: -15, max: 0 },
  BASE: { min: -40, max: 40 },
  ADD:  { min: 0,   max: 8 }
})

export function useNavtoolsModals({
  tipoMatriz,
  $buefy,
  safeToast,
  opPending,
  emitWithAck,
  markServerOk,
  markServerErr,
  toastFromAck,
  normalizeAck,
  fmtSigned
}) {
  const isQuarterStep = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return false
    const scaled = num * 4
    return Math.abs(scaled - Math.round(scaled)) < 1e-6
  }

  const rowLabel = computed(() => {
    switch (tipoMatriz.value) {
      case 'SPH_CYL':
      case 'SPH_ADD':  return 'SPH'
      case 'BASE_ADD':
      case 'BASE':     return 'BASE'
      default:         return 'valor'
    }
  })

  const colLabel = computed(() => {
    switch (tipoMatriz.value) {
      case 'SPH_CYL':  return 'CYL'
      case 'SPH_ADD':
      case 'BASE_ADD': return 'ADD'
      case 'BASE':     return 'valor'
      default:         return 'valor'
    }
  })

  const allowColumns = computed(() => tipoMatriz.value !== 'BASE')

  const getContextDimension = (kind) => {
    if (kind === 'row') {
      if (rowLabel.value === 'SPH')  return 'SPH'
      if (rowLabel.value === 'BASE') return 'BASE'
    } else if (kind === 'col') {
      if (colLabel.value === 'CYL')  return 'CYL'
      if (colLabel.value === 'ADD')  return 'ADD'
    }
    return null
  }

  const rowActionLabel = computed(() => {
    const dim = getContextDimension('row')
    switch (dim) {
      case 'SPH':  return 'Agregar esférica'
      case 'BASE': return 'Agregar base'
      default:     return 'Agregar fila'
    }
  })

  const colActionLabel = computed(() => {
    const dim = getContextDimension('col')
    switch (dim) {
      case 'CYL': return 'Agregar cilíndrica'
      case 'ADD': return 'Agregar adición'
      default:    return 'Agregar columna'
    }
  })

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
        `El valor${what} debe ser múltiplo de 0.25 D (…00, …25, …50, …75).`,
        'is-danger'
      )
      return false
    }

    if (kind === 'col' && getContextDimension('col') === 'CYL') {
      if (num >= 0) {
        safeToast('Para CYL escribe el valor NEGATIVO (ej: -0.25).', 'is-danger')
        return false
      }
    }

    return true
  }

  const openAddRowModal = () => {
    const dim = getContextDimension('row')
    const limits = dim ? PHYSICAL_LIMITS[dim] : null
    const placeholder = dim === 'SPH' ? 'Ej: -1.00' : dim === 'BASE' ? 'Ej: -0.25' : 'Ej: 0.00'
    const inputAttrs = { placeholder, type: 'number', step: '0.25' }
    if (limits) { inputAttrs.min = limits.min; inputAttrs.max = limits.max }

    const containerSelector = document.fullscreenElement ? '.ag-grid-fullscreen-container' : null;
    $buefy?.dialog.prompt({
      message: `Agregar nueva fila (${rowActionLabel.value})`,
      inputAttrs,
      trapFocus: true,
      container: containerSelector,
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

    const containerSelector = document.fullscreenElement ? '.ag-grid-fullscreen-container' : null;
    $buefy?.dialog.prompt({
      message: `Agregar nueva columna (${colActionLabel.value})`,
      inputAttrs,
      trapFocus: true,
      container: containerSelector,
      onConfirm: async (value) => {
        if (value === null || value === undefined || value === '') return
        const num = Number(value)
        if (!ensureQuarterStepOrToast(num, 'col')) return

        opPending.value = true
        safeToast(`Solicitando agregar columna ${colLabel.value} ${fmtSigned(num)}…`, 'is-info')

        const ack = await emitWithAck('add-column', num)
        opPending.value = false

        const n = normalizeAck(ack, {
          successFallback: `Se agregó la columna ${colLabel.value} ${fmtSigned(num)}.`,
          errorFallback: 'No se pudo agregar la columna.'
        })

        if (n?.ok === true) { markServerOk(n.message, n.status ?? null); toastFromAck(n); return }
        if (n?.ok === false) { markServerErr(n.message, n.status ?? null); toastFromAck(n); return }

        markServerOk('Solicitud enviada', null)
      }
    })
  }

  return {
    rowActionLabel,
    colActionLabel,
    allowColumns,
    openAddRowModal,
    openAddColumnModal
  }
}
