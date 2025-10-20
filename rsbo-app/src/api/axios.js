import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, 
  withCredentials: true // ✅ enviar cookies con cada request

})

// Estado global para solicitudes
const pendingRequests = new Map()

/**
 * Envía la solicitud solo si no hay una idéntica en curso
 * @param {string} key - Identificador único de la solicitud (ej: URL + params)
 * @param {object} config - Configuración de Axios
 */
export const sendRequest = async (key, config) => {
  if (pendingRequests.has(key)) {
    // Devuelve la promesa existente para no duplicar
    return pendingRequests.get(key)
  }

  const request = api(config)
    .finally(() => {
      pendingRequests.delete(key) // Elimina cuando termine
    })

  pendingRequests.set(key, request)
  return request
}

export default api
