const axios = require('axios')
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL

async function getOrders(req, res) {
  try {
    const response = await axios.get(`${ORDERS_SERVICE_URL}`)
    res.json(response.data)
  } catch (err) {
    const status = err.response?.status || 500
    res.status(status).json(err.response?.data || { error: 'Error interno del gateway' })
  }
}

module.exports = { getOrders }
