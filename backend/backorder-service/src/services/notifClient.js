/**
 * Cliente HTTP para comunicarse con el servicio de notificaciones
 * Usado por backorder-service para crear notificaciones persistentes
 */
const axios = require("axios");

const NOTIF_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3001";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

/**
 * Inserta o actualiza una notificación diaria (agrupa por groupKey)
 * @param {Object} payload - Datos de la notificación
 * @returns {Promise<Object>}
 */
async function upsertDaily(payload) {
  try {
    const response = await axios.post(
      `${NOTIF_SERVICE_URL}/api/notification/internal/upsert-daily`,
      payload,
      {
        headers: {
          "x-service-token": INTERNAL_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (err) {
    console.warn("[NotifClient] Error enviando notificación:", err.message);
    throw err;
  }
}

module.exports = { upsertDaily };
