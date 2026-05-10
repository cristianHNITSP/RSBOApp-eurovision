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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
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

app.listen(PORT, HOST, () => {
  console.log(`🚀 Notification Service corriendo en http://${HOST}:${PORT}`);
});
