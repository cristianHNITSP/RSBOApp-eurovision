// services/useAuth.js
import { ref } from 'vue'
import api from '../api/axios'
import { labToast } from "../composables/useLabToast.js";

const user = ref(null)

export function useAuth() {
  /**
   * Obtiene la información del usuario completo desde la sesión
   */
  const fetchUser = async () => {
    try {
      const res = await api.get('/users/me')
      if (res.data) {
        user.value = res.data
      } else {
        user.value = null
      }
    } catch (err) {
      user.value = null
      const status = err?.response?.status
      // Si el servidor dice que no existe o no está autenticado → redirigir al landing
      if (status === 401 || status === 403 || status === 404) {
        // Borrar cookie desde el servidor (best-effort) y redirigir
        try { await api.post('/access/logout', {}) } catch {}
        window.location.href = '/'
      }
    }
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
   * @param {Object} router - instancia de Vue Router
   * @param {Object} $buefy - instancia de Buefy
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
          // Llamada al endpoint de logout (opcional si existe)
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
    profile,
    settings,
    logout
  }
}
