const express = require('express')
require('dotenv').config()

const app = express()
app.use(express.json())

app.use('/api/inventory', require('./routes/inventory.routes'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Inventory service running on port ${PORT}`))
