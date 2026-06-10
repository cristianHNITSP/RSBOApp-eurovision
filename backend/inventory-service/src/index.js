/**
 * @fileoverview Punto de entrada principal del servicio de inventario
 */

const config = require("./config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const { APP_CONSTANTS } = require("./data/constants");

// Initialize Redis cache (now uses validated config)
const redis = require("./services/redis");

const app = express();

const PORT = config.port;
const HOST = config.host;

app.set("trust proxy", 1);

// ── Endurecimiento OWASP/XSS ────────────────────────────────────────────────
// Cabeceras seguras (CSP desactivada: este servicio sólo sirve JSON tras el gateway)
app.use(helmet({ contentSecurityPolicy: false }));

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

// Inventario envía matrices de dioptrías completas en un solo chunk; ~0.8 MB
// peor caso real. 2mb da holgura sin abrir la puerta a payloads abusivos.
app.use(express.json({ limit: "2mb" }));

// Body JSON malformado → 400 (en vez de 500 sin contexto)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ ok: false, error: "JSON inválido o cuerpo vacío con Content-Type application/json" });
  }
  return next(err);
});

app.use(cookieParser());
// Anti NoSQL-injection: elimina claves con `$`/`.` de body, query y params
app.use(mongoSanitize());

// Rate-limit global (defensa en profundidad además del gateway)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiadas peticiones, intenta más tarde" },
});
app.use(globalLimiter);

const { seedCatalog } = require("./services/catalog.seed");
const { seedOpticaCategories } = require("./services/optica.seed");

mongoose
  .connect(config.mongo.uri)
  .then(() => {
    console.log("✅ Connected to MongoDB (inventory)");
    seedCatalog();
    seedOpticaCategories();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.get(APP_CONSTANTS.PATHS.HEALTH, (_req, res) => {
  res.json({ ok: true, service: "inventory", ts: Date.now() });
});

// Limitador de tasa para el módulo óptica (mitiga abuso/fuerza bruta)
const opticaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiadas peticiones, intenta más tarde" },
});

// Rutas
app.use("/api/inventory", require("./routes/inventory.routes"));
app.use("/api/search", require("./routes/Search.routes"));
app.use("/api/contactlenses", require("./routes/contactlenses.routes"));
app.use("/api/catalog", require("./routes/catalog.routes"));
app.use("/api/stats", require("./routes/stats.routes"));
app.use("/api/optica", opticaLimiter, require("./routes/optica"));

app.use((err, _req, res, _next) => {
  console.error("[Inventory ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

const labWs = require("./ws");
labWs.connect();

const { registerStockAlertHooks } = require("./hooks/stockAlertHooks");
registerStockAlertHooks();

const { startStockAlertJob } = require("./jobs/stockAlert.job");
startStockAlertJob();

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Inventory Service corriendo en http://${HOST}:${PORT}`);
});

// Cierre limpio: drenar conexiones, cerrar Redis y Mongo.
async function shutdown(signal) {
  console.log(`\n[Inventory] ${signal} recibido, cerrando…`);
  server.close();
  try { await redis.close(); } catch { }
  try { await mongoose.connection.close(); } catch { }
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
