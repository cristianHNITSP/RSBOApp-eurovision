// backend/auth-service/src/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.SERVICE_HOST || '0.0.0.0';

// Lista de orígenes permitidos
// ✅ Lista de orígenes permitidos
const allowedOrigins = [
  process.env.FRONTEND_URL_DEV,
  'http://192.168.0.87:5173',
  'http://172.18.0.1:5173',
  process.env.FRONTEND_URL_PROD
];

// Configuración de CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS bloqueado para origen no permitido: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // necesario para cookies
}));

app.use(express.json());
app.use(cookieParser()); // habilitar cookies

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

// Rutas
app.use('/api/access', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));

// Servidor
app.listen(PORT, HOST, () => {
  console.log(`🚀 Auth Service corriendo en http://${HOST}:${PORT}`);
});
