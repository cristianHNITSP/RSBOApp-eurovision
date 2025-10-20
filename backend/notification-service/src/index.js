const express = require('express')
require('dotenv').config()

const app = express()
app.use(express.json())

app.use('/api/notifications', require('./routes/notification.routes'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`))
