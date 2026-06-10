/**
 * @fileoverview Punto de entrada principal del servicio de autenticación
 * Inicializa Express, MongoDB, CORS, cookies, rutas y AdminJS panel.
 */

const config = require("./config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const { APP_CONSTANTS } = require("./data/constants");

const app = express();

// -------------------------
// SEGURIDAD Y ARQUITECTURA
// -------------------------
app.disable("x-powered-by");

// CSP desactivado: AdminJS sirve su propio bundle y rompería con una CSP estricta.
app.use(helmet({ contentSecurityPolicy: false }));

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

// En desarrollo se permite cualquier origen de red privada (LAN) para testear
// desde móvil/tablet. En producción NO aplica (allowlist estricta).
const IS_DEV = process.env.NODE_ENV !== "production";
const LAN_ORIGIN_RX = /^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$/;
const isAllowedOrigin = (origin) =>
  !origin || allowedOrigins.includes(origin) || (IS_DEV && LAN_ORIGIN_RX.test(origin));

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      console.warn(`❌ CORS bloqueado: ${origin}`);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  })
);

app.use(express.json({ limit: "256kb" }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.warn("⚠️ JSON parse error:", req.method, req.originalUrl, err.message);
    return res.status(400).json({ error: "JSON inválido o cuerpo vacío con Content-Type application/json" });
  }
  return next(err);
});

app.use(cookieParser());

// Bloquea claves con operadores Mongo ($, .) en body/query/params
app.use(mongoSanitize());
app.use(require("./validators/_helpers").blockProtoPollution);

if (config.env !== "production") {
  app.use((req, _res, next) => {
    console.log("➡️", req.method, req.originalUrl, "| ct:", req.headers["content-type"] || "-");
    next();
  });
}

// -------------------------
// Mongo & Seeding
// -------------------------
const { runSeed } = require("./seeds/seedUsers");

mongoose
  .connect(config.mongo.uri)
  .then(async () => {
    console.log("✅ Connected to MongoDB");
    // Bootstrapping automático de roles y usuarios iniciales
    await runSeed();
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
    // 5xx → mensaje genérico (no filtrar detalle interno); 4xx → mensaje del error.
    const clientMsg = status >= 500
      ? "Error interno del servidor"
      : (typeof err?.message === "string" && err.message.trim() ? err.message : "Solicitud inválida");
    console.error("❌ Error global:", status, err?.message);
    res.status(status).json({ error: clientMsg });
  });

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Auth Service corriendo en http://${HOST}:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Error al iniciar el servidor:", err);
  process.exit(1);
});
