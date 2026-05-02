// notification-service/src/index.js
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const mongoose     = require('mongoose');
const ws           = require('./ws');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const rawOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://192.168.0.87:5173'];
const allowedOrigins = Array.from(new Set([...rawOrigins, ...devOrigins]));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// ─── Rutas ───────────────────────────────────────────────────────────────────
// El gateway proxia /api/notification → este servicio, reenviando la URL completa.
// Por eso montamos en /api/notification para que el path coincida.
app.use('/api/notification', require('./routes/notification.routes'));
app.use('/api/notification/internal', require('./routes/internal.routes'));

// ─── Healthcheck ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'notification', time: new Date().toISOString() })
);

// ─── MongoDB + arranque ──────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI no definida en .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ Conectado a MongoDB (notification_db)');
    ws.connect(); // conectar al Gateway WS para broadcasting
    require('./services/redisPubSub').startSubscriber();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🟢 Notification service en puerto ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  });
