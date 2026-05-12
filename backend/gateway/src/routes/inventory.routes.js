const express = require('express')
const router = express.Router()
const { getInventory } = require('../services/inventory.service')

router.get('/', getInventory)

module.exports = router
