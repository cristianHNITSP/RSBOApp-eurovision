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
// Anti NoSQL-injection: elimina claves con `$`/`.` de body, query y params
app.use(mongoSanitize());

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
