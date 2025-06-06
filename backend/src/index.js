const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const os = require('os');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:xqr5Dc93KMa24b@mongo:27017/rsboapp?authSource=admin';

// 🌐 Función para obtener IP local
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 🔐 CORS
const corsOptions = {
  origin: isProd
    ? process.env.FRONTEND_URL || 'https://tu-dominio-produccion.com'
    : `http://${getLocalIP()}:5173`,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// 🔌 MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((err) => {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1);
  });

// 🔧 API
app.use('/api/users', require('./routes/user.routes'));

app.get('/', (req, res) => {
  res.send(`🚀 Backend corriendo en modo ${process.env.NODE_ENV} version 6`);
});

app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const state = mongoose.connection.readyState;
    dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][state];
    res.status(state === 1 ? 200 : 500).json({
      status: state === 1 ? 'ok' : 'error',
      services: { database: dbStatus },
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
    });
  } catch {
    res.status(500).json({ status: 'error', services: { database: 'error' } });
  }
});

// 🌐 HTTP + WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket conectado');
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'WebSocket conectado correctamente ✅',
  }));

  const interval = setInterval(() => {
    const state = mongoose.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][state];
    ws.send(JSON.stringify({
      type: 'health',
      status: state === 1 ? 'ok' : 'error',
      services: { database: dbStatus },
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
    }));
  }, 5000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('❌ Cliente WebSocket desconectado');
  });
});

// 🚀 Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`🟢 Servidor disponible en:`);
  console.log(`   ➤ http://localhost:${PORT}`);
  console.log(`   ➤ http://${ip}:${PORT}`);
});
