// rsbo-app/src/composables/ui/useNotificationsState.js
import { ref, readonly } from 'vue'

// Singleton state
const showPanel = ref(false)

/**
 * Gestor del estado de visibilidad del panel de notificaciones.
 * Implementado como Singleton para consistencia entre Header, Sidebar y Layout.
 */
export function useNotifications() {
  function openPanel() {
    showPanel.value = true
  }

  function closePanel() {
    showPanel.value = false
  }

  function toggle() {
    showPanel.value = !showPanel.value
  }

  return {
    showPanel: readonly(showPanel),
    openPanel,
    closePanel,
    toggle
  }
}
