const express = require('express')
const router = express.Router()
const { getUsers } = require('../services/users.service')

router.get('/', getUsers)

module.exports = router
