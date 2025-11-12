/**
 * @fileoverview Punto de entrada principal del servicio de autenticación
 * Este archivo inicializa y configura el servicio de autenticación para la
 * aplicación RSBO. Incluye la configuración de Express, la conexión a MongoDB,
 * la política CORS y la definición de rutas principales.
 * 
 * @author cristianHNITSP
 * @version 1.0.0
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

/**
 * Instancia de la aplicación Express
 * @type {import('express').Application}
 */
const app = express();

/**
 * Puerto en el que el servidor escuchará
 * @type {number}
 * @default 3001
 */
const PORT = process.env.PORT || 3001;

/**
 * Dirección/host donde se enlazará el servidor
 * @type {string}
 * @default '0.0.0.0'
 */
const HOST = process.env.SERVICE_HOST || '0.0.0.0';

/**
 * Lista de orígenes permitidos para CORS
 * @type {string[]}
 * @constant
 * @description Orígenes permitidos para peticiones cross-origin:
 * - URL de frontend en desarrollo (process.env.FRONTEND_URL_DEV)
 * - Direcciones IP locales usadas para pruebas
 * - URL de frontend en producción (process.env.FRONTEND_URL_PROD)
 */
const allowedOrigins = [
  process.env.FRONTEND_URL_DEV,
  'http://192.168.0.87:5173',
  'http://172.18.0.1:5173',
  process.env.FRONTEND_URL_PROD
];

/**
 * Configuración de CORS
 * Configura el middleware CORS validando el origen contra la lista
 * `allowedOrigins` y habilita el envío de credenciales (cookies).
 */
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked for unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Required for cookies
}));

// Configuración de middlewares
app.use(express.json()); // Parsear cuerpos JSON
app.use(cookieParser()); // Habilitar parseo de cookies

/**
 * Conexión a MongoDB
 * Establece la conexión a la base de datos usando mongoose. Si la conexión
 * falla, el proceso termina con código de salida 1.
 * @async
 */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Ruta de healthcheck
 */
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'users', ts: Date.now() });
});


/**
 * Rutas principales de la API
 * Registra los controladores de rutas principales:
 * - /api/access: rutas de autenticación (login, logout, ver sesión)
 * - /api/users: rutas de gestión de usuarios (CRUD)
 */
app.use('/api/access', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));

/**
 * Inicialización del servidor
 * Arranca la aplicación Express en el host y puerto especificados.
 * @listens {number} PORT - Puerto en el que se escucha
 * @param {string} HOST - Host/dirección de enlace
 */
app.listen(PORT, HOST, () => {
  console.log(`🚀 Auth Service corriendo en http://${HOST}:${PORT}`);
});
