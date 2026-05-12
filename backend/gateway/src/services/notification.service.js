const axios = require('axios')
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL

async function getNotifications(req, res) {
  try {
    const response = await axios.get(`${NOTIFICATION_SERVICE_URL}`)
    res.json(response.data)
  } catch (err) {
    const status = err.response?.status || 500
    res.status(status).json(err.response?.data || { error: 'Error interno del gateway' })
  }
}

module.exports = { getNotifications }
