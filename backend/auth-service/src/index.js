/**
 * @fileoverview Punto de entrada principal del servicio de autenticación
 * Inicializa Express, MongoDB, CORS, cookies, rutas y manejo global de errores.
 *
 * @author cristianHNITSP
 * @version 1.0.0
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3001;
const HOST = process.env.SERVICE_HOST || "0.0.0.0";

// 👇 Importante si algún día pones reverse proxy TLS (Nginx/Caddy)
app.set("trust proxy", 1);

// -------------------------
// CORS
// -------------------------
const rawOrigins = process.env.CORS_ORIGINS || "";
const envOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const devOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.0.87:5173",
];

const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));
console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite peticiones sin origin (curl, healthchecks, Postman)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      console.warn(`❌ CORS bloqueado: ${origin}`);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  })
);

// -------------------------
// Middlewares core
// -------------------------

// ✅ JSON parser
app.use(express.json({ limit: "1mb" }));

// ✅ FIX: si llega JSON inválido (o body vacío con content-type json) -> responde JSON entendible
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.warn("⚠️ JSON parse error:", req.method, req.originalUrl, err.message);
    return res.status(400).json({ error: "JSON inválido o cuerpo vacío con Content-Type application/json" });
  }
  return next(err);
});

app.use(cookieParser());

// (Opcional) Log simple en dev
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log("➡️", req.method, req.originalUrl, "| ct:", req.headers["content-type"] || "-");
    next();
  });
}

// -------------------------
// Mongo
// -------------------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// -------------------------
// Health
// -------------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "auth", ts: Date.now() });
});

// -------------------------
// Routes
// -------------------------
app.use("/api/access", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));

// -------------------------
// Global error handler (consistente)
// -------------------------
app.use((err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;

  // evita HTML por defecto
  const message =
    typeof err?.message === "string" && err.message.trim()
      ? err.message
      : "Error interno del servidor";

  // para debug en dev
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ Error global:", {
      status,
      path: req.originalUrl,
      method: req.method,
      message,
      stack: err.stack,
    });
  } else {
    console.error("❌ Error global:", status, message);
  }

  res.status(status).json({ error: message });
});

// -------------------------
// Listen
// -------------------------
app.listen(PORT, HOST, () => {
  console.log(`🚀 Auth Service corriendo en http://${HOST}:${PORT}`);
});
