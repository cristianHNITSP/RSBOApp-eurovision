const express = require('express')
const router = express.Router()
const { login } = require('../services/auth.service')

router.post('/login', login)

module.exports = router
