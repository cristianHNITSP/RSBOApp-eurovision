const express = require('express')
const router = express.Router()
const { getOrders } = require('../services/orders.service')

router.get('/', getOrders)

module.exports = router
