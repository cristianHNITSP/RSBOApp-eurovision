/**
 * src/composables/ag-grid/navtools/useNavtoolsMessaging.js
 * Centraliza los avisos (toasts) y el estado del servidor.
 */

import { ref, computed } from 'vue'
import { labToast } from "@/composables/shared/useLabToast.js"
import { sanitizeUserText, normalizeAck } from "@/utils/errorSanitizer.js"

export function useNavtoolsMessaging() {
  const opPending = ref(false)
  const lastServer = ref({ kind: 'idle', text: '', status: null, at: null })

  const safeToast = (message, type = 'is-info') => {
    try {
      labToast.show(sanitizeUserText(message, { maxLen: 180 }) || 'Listo.', type)
    } catch {
      console.warn('[navtools] toast failed')
    }
  }

  const toastFromAck = (ack, { successFallback, errorFallback } = {}) => {
    const n = normalizeAck(ack, { successFallback, errorFallback })
    if (!n) return
    safeToast(n.message, n.ok ? 'is-success' : 'is-danger')
  }

  const serverBadge = computed(() => {
    if (opPending.value) return { type: 'is-info', icon: 'spinner', text: 'Procesando…' }
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

  return {
    opPending,
    serverBadge,
    safeToast,
    toastFromAck,
    markServerOk,
    markServerErr
  }
}
