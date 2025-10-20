const axios = require('axios')
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL

async function getInventory(req, res) {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}`)
    res.json(response.data)
  } catch (err) {
    const status = err.response?.status || 500
    res.status(status).json(err.response?.data || { error: 'Error interno del gateway' })
  }
}

module.exports = { getInventory }
