// service/authService.js
import { login } from '../services/auth'
import router from '../router/index'

export const useAuthService = ($buefy) => {
  let activeToast = null
  let toastInterval = null

  const handleLogin = async (credentials, showLoginPanel) => {
    // Cierra toast previo si existe
    if (activeToast) {
      activeToast.close()
      activeToast = null
    }
    if (toastInterval) {
      clearInterval(toastInterval)
      toastInterval = null
    }

    // Validación de campos vacíos
    if (!credentials.username || !credentials.password) {
      activeToast = $buefy.toast.open({
        message: 'Por favor ingresa tus credenciales',
        type: 'is-danger',
        duration: 3000,
      })
      return
    }

    try {
      const data = await login({
        username: credentials.username,
        password: credentials.password
      })

      // Muestra toast de éxito
      activeToast = $buefy.toast.open({
        message: `Bienvenido ${data.name}!`,
        type: 'is-success',
        duration: 3000,
      })

      // Cierra panel y purga credenciales
      showLoginPanel.value = false
      purgeCredentials(credentials)

      // Redirige a la página home
      router.push({ name: 'home' })

    } catch (err) {
      // Bloqueo por rate limiter
      if (err?.retryIn) {
        let [minutes, seconds] = err.retryIn.split('m ').map(s => parseInt(s))
        let remainingSeconds = minutes * 60 + seconds

        activeToast = $buefy.toast.open({
          message: `Demasiados intentos. Intenta de nuevo en ${minutes}m ${seconds}s.`,
          type: 'is-warning',
          duration: 0, // persistente
        })

        toastInterval = setInterval(() => {
          remainingSeconds--
          if (remainingSeconds <= 0) {
            clearInterval(toastInterval)
            toastInterval = null
            if (activeToast) activeToast.close()
            return
          }
          const m = Math.floor(remainingSeconds / 60)
          const s = remainingSeconds % 60
          if (activeToast) {
            activeToast.update({
              message: `Demasiados intentos. Intenta de nuevo en ${m}m ${s}s.`
            })
          }
        }, 1000)
      } else {
        activeToast = $buefy.toast.open({
          message: err.error || 'Error al iniciar sesión',
          type: 'is-danger',
          duration: 3000,
        })
      }
    }
  }

  // Función para purgar datos sensibles
  const purgeCredentials = (credentials) => {
    credentials.username = ''
    credentials.password = ''
  }

  return {
    handleLogin
  }
}
