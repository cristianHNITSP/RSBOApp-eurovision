// composables/useUserActions.js
import { ref, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'

export function useUserActions() {
  const router = useRouter()
  const internalInstance = getCurrentInstance()
  const $buefy = internalInstance.appContext.config.globalProperties.$buefy

function profile() {
  router.push('/profile')
}

function settings() {
  router.push('/settings')
}

function logout() {
  $buefy.dialog.confirm({
    title: 'Cerrar sesión',
    message: '¿Estás seguro de que quieres cerrar sesión?',
    confirmText: 'Cerrar sesión',
    cancelText: 'Cancelar',
    hasIcon: true,
    type: 'is-danger',
    onConfirm: () => {
      router.push('/login')
      $buefy.toast.open('Sesión cerrada correctamente')
    },
  })
}

return {
  profile,
  settings,
  logout,
}
}
