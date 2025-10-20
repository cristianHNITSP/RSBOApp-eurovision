import api from './axios'

export const login = async ({ username, password }) => {
  try {
    const res = await api.post(
      '/access/login',
      {
        email: username,
        password
      },
      {
        withCredentials: true // 👈 importantísimo para enviar/recibir cookies
      }
    )

    // ⚠️ Ya NO guardamos token en localStorage
    // La cookie se guarda automáticamente en el navegador
    return res.data
  } catch (err) {
    if (err.response && err.response.data) {
      return Promise.reject(err.response.data)
    } else if (err.request) {
      return Promise.reject({ error: 'No se pudo conectar al servidor' })
    } else {
      return Promise.reject({ error: err.message || 'Error desconocido' })
    }
  }
}
