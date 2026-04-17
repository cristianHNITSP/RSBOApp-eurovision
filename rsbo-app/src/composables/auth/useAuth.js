// services/useAuth.js
import { ref } from 'vue'
import { sendRequest, api } from '../../api/axios'
import { labToast } from "@/composables/shared/useLabToast.js";

const user = ref(null)

export function useAuth() {
  /**
   * Obtiene la información del usuario completo desde la sesión
   */
  const fetchUser = async () => {
    try {
      const res = await sendRequest({ method: 'get', url: '/users/me' })
      user.value = res?.data ?? null
    } catch (err) {
      user.value = null
      const status = err?.response?.status
      if (status === 401 || status === 403 || status === 404) {
        try { await api.post('/access/logout', {}) } catch {}
        window.location.href = '/'
      }
    }
  }

  /**
   * Actualiza el usuario en el estado local sin re-fetch al servidor.
   * Útil después de guardar cambios de perfil para propagar inmediatamente.
   */
  const patchUser = (patch) => {
    if (user.value) user.value = { ...user.value, ...patch }
  }

  /**
   * Navegar a perfil
   */
  const profile = (router) => {
    router.push('/l/mi.perfil.panel')
  }

  /**
   * Navegar a configuración
   */
  const settings = (router) => {
    router.push('/l/config.panel')
  }

  /**
   * Cierra la sesión del usuario
   */
  const logout = async (router, $buefy) => {
    $buefy.dialog.confirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      hasIcon: true,
      type: 'is-danger',
      onConfirm: async () => {
        try {
          await api.post('/access/logout', {})
        } catch (err) {
          console.error('Error en logout:', err)
        }
        user.value = null
        router.push('/')
        labToast.success('Sesión cerrada correctamente');
      }
    })
  }

  return {
    user,
    fetchUser,
    patchUser,
    profile,
    settings,
    logout,
  }
}
