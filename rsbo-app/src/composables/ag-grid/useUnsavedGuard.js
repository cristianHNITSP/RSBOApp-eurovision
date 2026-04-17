/**
 * useUnsavedGuard — persists unsaved grid changes across view switches and navigation.
 *
 * Features:
 * - Stores pendingChanges in sessionStorage keyed by sheetId + viewId
 * - Restores on mount if changes exist from a previous visit
 * - Warns (via callback) when the user tries to switch views or navigate away
 * - Clears storage on successful save or explicit discard
 *
 * Usage:
 *   const guard = useUnsavedGuard({
 *     storageKey: () => `inv:${props.sheetId}:${viewId.value}`,
 *     isDirty: () => dirty.value,
 *     getPending: () => Object.fromEntries(pendingChanges.value),
 *     onRestore: (saved) => { ... restore into pendingChanges ... },
 *   })
 *   // on save success: guard.clearStorage()
 *   // on discard:      guard.clearStorage()
 *   // before view switch: const ok = await guard.confirmLeave()
 */
import { onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { labToast } from '@/composables/shared/useLabToast'

const STORAGE_PREFIX = 'rsbo:unsaved:'

export function useUnsavedGuard({
  storageKey,
  isDirty,
  getPending,
  onRestore,
}) {
  const resolveKey = () => {
    const k = typeof storageKey === 'function' ? storageKey() : storageKey
    return k ? `${STORAGE_PREFIX}${k}` : null
  }

  /** Persist current pending changes to sessionStorage. */
  function persist() {
    const key = resolveKey()
    if (!key) return
    try {
      const data = getPending()
      if (!data || Object.keys(data).length === 0) {
        sessionStorage.removeItem(key)
        return
      }
      sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
    } catch { /* quota exceeded — ignore */ }
  }

  /** Restore pending changes from sessionStorage if they exist. Returns true if restored. */
  function restore() {
    const key = resolveKey()
    if (!key) return false
    try {
      const raw = sessionStorage.getItem(key)
      if (!raw) return false
      const { data, ts } = JSON.parse(raw)
      // Expire after 2 hours
      if (Date.now() - ts > 2 * 60 * 60 * 1000) {
        sessionStorage.removeItem(key)
        return false
      }
      if (data && Object.keys(data).length > 0) {
        onRestore(data)
        return true
      }
    } catch {
      // corrupt data
      const key2 = resolveKey()
      if (key2) sessionStorage.removeItem(key2)
    }
    return false
  }

  /** Clear stored changes (call after save success or explicit discard). */
  function clearStorage() {
    const key = resolveKey()
    if (key) sessionStorage.removeItem(key)
  }

  /** Clear ALL unsaved stores for this prefix (e.g. on logout). */
  function clearAll() {
    const toRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(STORAGE_PREFIX)) toRemove.push(k)
    }
    toRemove.forEach(k => sessionStorage.removeItem(k))
  }

  /**
   * Ask user to confirm leaving when dirty.
   * Returns true if they confirm or there are no changes.
   * Uses $buefy dialog if available, otherwise window.confirm.
   */
  function confirmLeave(message) {
    if (!isDirty()) return Promise.resolve(true)

    const msg = message || 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?'
    const instance = getCurrentInstance()
    const $buefy = instance?.appContext?.config?.globalProperties?.$buefy

    if ($buefy?.dialog) {
      return new Promise((resolve) => {
        $buefy.dialog.confirm({
          title: 'Cambios sin guardar',
          message: msg,
          confirmText: 'Salir sin guardar',
          cancelText: 'Quedarme',
          type: 'is-warning',
          trapFocus: true,
          onConfirm: () => {
            persist() // save changes before leaving
            resolve(true)
          },
          onCancel: () => resolve(false),
        })
      })
    }

    // fallback
    const ok = window.confirm(msg)
    if (ok) persist()
    return Promise.resolve(ok)
  }

  /**
   * Silently persist and allow navigation (for side switches like pos↔neg).
   * Call this when switching views within the same sheet.
   */
  function persistAndAllow() {
    if (isDirty()) persist()
  }

  // Vue Router guard
  try {
    onBeforeRouteLeave(async (_to, _from, next) => {
      if (!isDirty()) return next()
      const ok = await confirmLeave()
      next(ok ? undefined : false)
    })
  } catch {
    // Not inside a router-view — skip
  }

  // Browser unload is already handled by navtools, but as safety net:
  const onBeforeUnload = (e) => {
    if (!isDirty()) return
    persist() // save to sessionStorage before unload
    e.preventDefault()
    e.returnValue = ''
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    // Persist any remaining unsaved changes
    if (isDirty()) persist()
  })

  return {
    persist,
    restore,
    clearStorage,
    clearAll,
    confirmLeave,
    persistAndAllow,
  }
}
