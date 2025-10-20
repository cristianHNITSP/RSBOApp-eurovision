// gateway/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();

// ✅ Lista de orígenes permitidos
const allowedOrigins = [
  process.env.FRONTEND_URL_DEV,
  'http://192.168.0.87:5173',
  'http://172.18.0.1:5173',
  process.env.FRONTEND_URL_PROD
];

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS bloqueado para origen no permitido: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // 👈 habilita cookies cross-origin
}));

app.use(express.json());

// 🔹 URLs de microservicios
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL,
  users: process.env.USERS_SERVICE_URL,
  inventory: process.env.INVENTORY_SERVICE_URL,
  orders: process.env.ORDERS_SERVICE_URL,
  notification: process.env.NOTIFICATION_SERVICE_URL,
};

// 🔸 Proxy genérico con cookies
const proxyRequest = (serviceUrl) => async (req, res) => {
  try {
    const targetUrl = `${serviceUrl}${req.originalUrl}`;
    console.log(`🔁 Proxying ${req.method} ${req.originalUrl} -> ${targetUrl}`);

    // 📥 Log de cookies recibidas del cliente
    console.log('📥 Cookies recibidas del navegador:', req.headers.cookie);

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined,
        cookie: req.headers.cookie || ''
      },
      validateStatus: (status) => status >= 200 && status < 400, // <— acepta 304
      withCredentials: true
    });

    // 📤 Log de cookies enviadas por el microservicio
    console.log('📤 Cookies enviadas por el microservicio:', response.headers['set-cookie']);

    // Después de recibir respuesta del microservicio
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const fixedCookies = setCookie.map(c => {
        if (process.env.NODE_ENV !== 'production') {
          c = c.replace(/; Secure/gi, '');
          c = c.replace(/; SameSite=[^;]+/gi, '; SameSite=Lax');
        }
        return c;
      });
      res.setHeader('Set-Cookie', fixedCookies);
    }


    res.status(response.status).send(response.data);
  } catch (err) {
    console.error('❌ Proxy error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).send(err.response?.data || { error: err.message });
  }
};

// 🔹 Rutas proxy
app.use('/api/access', proxyRequest(SERVICES.auth));
app.use('/api/users', proxyRequest(SERVICES.users));
app.use('/api/inventory', proxyRequest(SERVICES.inventory));
app.use('/api/orders', proxyRequest(SERVICES.orders));
app.use('/api/notification', proxyRequest(SERVICES.notification));

// 🔹 Ruta principal
app.get('/', (req, res) => res.send('🚀 RSBO Gateway funcionando'));

// 🔹 WebSocket
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket conectado al Gateway');
  ws.send(JSON.stringify({ type: 'welcome', message: 'WebSocket Gateway conectado ✅' }));
  ws.on('close', () => console.log('❌ Cliente WebSocket desconectado del Gateway'));
});

server.listen(PORT, () => console.log(`🟢 Gateway corriendo en puerto ${PORT}`));
