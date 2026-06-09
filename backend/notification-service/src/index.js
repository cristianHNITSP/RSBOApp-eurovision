/**
 * @fileoverview Punto de entrada principal del servicio de notificaciones
 */

const config = require("./config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { APP_CONSTANTS } = require("./data/constants");

const app = express();

const PORT = config.port;
const HOST = config.host;

app.set("trust proxy", 1);

const envOrigins = config.cors.origins;
const devOrigins = APP_CONSTANTS.DEV_ORIGINS;
const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));
console.log("✅ CORS allowed origins:", allowedOrigins);

// En desarrollo se permite cualquier origen de red privada (LAN) para testear
// desde móvil/tablet. En producción NO aplica (allowlist estricta).
const IS_DEV = process.env.NODE_ENV !== "production";
const LAN_ORIGIN_RX = /^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$/;
const isAllowedOrigin = (origin) =>
  !origin || allowedOrigins.includes(origin) || (IS_DEV && LAN_ORIGIN_RX.test(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      console.warn(`❌ CORS bloqueado para origen no permitido: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Logger de depuración
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

mongoose
  .connect(config.mongo.uri)
  .then(() => {
    console.log("✅ Connected to MongoDB (notification)");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.get(APP_CONSTANTS.PATHS.HEALTH, (_req, res) => {
  res.json({ ok: true, service: "notification", ts: Date.now() });
});

// Rutas
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/notification/internal", require("./routes/internal.routes"));

app.use((err, _req, res, _next) => {
  console.error("[Notification ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

const notificationWs = require("./ws");
notificationWs.connect();

// Consumidor de eventos de stock (Redis Streams). Reemplaza el viejo Pub/Sub.
const stockConsumer = require("./services/stockConsumer");
stockConsumer.start();

app.listen(PORT, HOST, () => {
  console.log(`🚀 Notification Service corriendo en http://${HOST}:${PORT}`);
});
