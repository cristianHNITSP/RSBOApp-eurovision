const express = require('express')
require('dotenv').config()

const app = express()
app.use(express.json())

app.use('/api/orders', require('./routes/orders.routes'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Orders service running on port ${PORT}`))
