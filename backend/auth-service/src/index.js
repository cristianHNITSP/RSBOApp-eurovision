/**
 * @fileoverview Punto de entrada principal del servicio de autenticación
 * Inicializa Express, MongoDB, CORS, cookies, rutas y AdminJS panel.
 */

const config = require("./config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { APP_CONSTANTS } = require("./data/constants");
const { seed } = require("./seeds/seedUsers");

const app = express();

// -------------------------
// SEGURIDAD Y ARQUITECTURA
// -------------------------
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Demasiadas peticiones desde esta IP, intente más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// --- Healthcheck para Docker ---
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// 👇 Configuración desde objeto validado
const PORT = config.port;
const HOST = config.host;

app.set("trust proxy", 1);

// -------------------------
// CORS
// -------------------------
const envOrigins = config.cors.origins;
const devOrigins = APP_CONSTANTS.DEV_ORIGINS;

const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));
console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, cb) => {
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

app.use(express.json({ limit: "1mb" }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.warn("⚠️ JSON parse error:", req.method, req.originalUrl, err.message);
    return res.status(400).json({ error: "JSON inválido o cuerpo vacío con Content-Type application/json" });
  }
  return next(err);
});

app.use(cookieParser());

if (config.env !== "production") {
  app.use((req, _res, next) => {
    console.log("➡️", req.method, req.originalUrl, "| ct:", req.headers["content-type"] || "-");
    next();
  });
}

// -------------------------
// Mongo
// -------------------------
mongoose
  .connect(config.mongo.uri)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    seed();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// -------------------------
// Routes
// -------------------------
app.use("/api/access", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/workspace/preferences", require("./routes/preferences.routes"));

// -------------------------
// AdminJS (Modular)
// -------------------------
const { mountAdmin } = require("./admin");

async function start() {
  await mountAdmin(app);

  app.use((err, req, res, _next) => {
    const status = err.statusCode || err.status || 500;
    const message = typeof err?.message === "string" && err.message.trim() ? err.message : "Error interno del servidor";
    console.error("❌ Error global:", status, message);
    res.status(status).json({ error: message });
  });

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Auth Service corriendo en http://${HOST}:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Error al iniciar el servidor:", err);
  process.exit(1);
});
