// composables/useSidebarState.js
import { ref, watch } from 'vue'

export function useSidebarState() {
  // Intentamos cargar el estado guardado
  const savedState = localStorage.getItem('sidebar-collapsed')
  const isSidebarCollapsed = ref(savedState === 'true') // true o false

  const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  const setSidebarState = (value) => {
    isSidebarCollapsed.value = value
  }

  // Guardar en localStorage cada vez que cambie
  watch(isSidebarCollapsed, (newVal) => {
    localStorage.setItem('sidebar-collapsed', newVal)
  })

  return {
    isSidebarCollapsed,
    toggleSidebar,
    setSidebarState,
  }
}
