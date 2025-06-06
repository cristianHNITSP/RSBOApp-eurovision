// composables/useNotifications.js
import { ref } from 'vue'

export function useNotifications() {
  const showPanel = ref(false)

  function openPanel() {
    showPanel.value = true
  }

  function closePanel() {
    showPanel.value = false
  }

  return {
    showPanel,
    openPanel,
    closePanel
  }
}
