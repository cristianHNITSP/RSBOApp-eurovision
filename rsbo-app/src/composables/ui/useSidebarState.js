// rsbo-app/src/composables/ui/useSidebarState.js
import { ref, watch, readonly } from 'vue'

// Estado persistente singleton
const isSidebarCollapsed = ref(false)

// Inicialización inmediata (evitar flashes de layout)
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('sidebar-collapsed')
  if (saved !== null) isSidebarCollapsed.value = saved === 'true'
}

// Persistencia automática
watch(isSidebarCollapsed, (newVal) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sidebar-collapsed', String(newVal))
  }
})

export function useSidebarState() {
  const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  const setSidebarState = (value) => {
    isSidebarCollapsed.value = !!value
  }

  return {
    isSidebarCollapsed: readonly(isSidebarCollapsed),
    toggleSidebar,
    setSidebarState,
  }
}
