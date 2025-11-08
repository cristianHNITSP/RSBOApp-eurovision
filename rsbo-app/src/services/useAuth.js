// services/useAuth.js
import { ref } from 'vue'
import api from '../api/axios'

const user = ref(null)

export function useAuth() {
  /**
   * Obtiene la información del usuario completo desde la sesión
   */
  const fetchUser = async () => {
    try {
      const res = await api.get('/users/me') // La cookie HttpOnly se envía automáticamente
      if (res.data) {
        user.value = res.data
        console.log('Usuario completo obtenido:', user.value)
      } else {
        user.value = null
        console.warn('No se recibió información de usuario')
      }
    } catch (err) {
      console.error('Error al obtener usuario completo:', err)
      user.value = null
    }
  }

  /**
   * Navegar a perfil
   */
  const profile = (router) => {
    router.push('/layouts/mi.perfil.panel')
  }

  /**
   * Navegar a configuración
   */
  const settings = (router) => {
    router.push('/settings')
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
        $buefy.toast.open('Sesión cerrada correctamente')
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
