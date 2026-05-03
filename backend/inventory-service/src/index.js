/**
 * @fileoverview Punto de entrada principal del servicio de inventario
 * Inicializa Express, configura CORS, parseo de JSON/cookies y conecta a MongoDB.
 * Expone rutas bajo /api/inventory.
 *
 * @author
 * @version 1.0.0
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Initialize Redis cache (no-op if REDIS_URL not set)
require("./services/redis");

/**
 * Instancia de la aplicación Express
 * @type {import('express').Application}
 */
const app = express();

/**
 * Puerto y host
 * @type {number}
 * @default 3000
 */
const PORT = Number(process.env.PORT) || 3000;
/**
 * @type {string}
 * @default '0.0.0.0'
 */
const HOST = process.env.SERVICE_HOST || "0.0.0.0";

/**
 * Lista de orígenes permitidos para CORS
 * Incluye tus URLs de frontend en dev/prod y redes locales comunes.
 */
// 👇 Importante si algún día pones reverse proxy TLS (Nginx/Caddy)
app.set("trust proxy", 1);

// Orígenes base desde .env (separados por coma)
const rawOrigins = process.env.CORS_ORIGINS || "";
const envOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Orígenes comunes de desarrollo
const devOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.0.87:5173",
];

// Merge sin duplicados
const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));

console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origin (curl, healthchecks, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`❌ CORS bloqueado para origen no permitido: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Middlewares
app.use(express.json());
app.use(cookieParser());

/**
 * Conexión a MongoDB
 * Usa MONGO_URI desde variables de entorno.
 */
const { seedCatalog } = require("./services/catalog.seed");

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB (inventory)");
    seedCatalog();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

/**
 * Ruta de healthcheck
 */
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "inventory", ts: Date.now() });
});

/**
 * Rutas principales de inventario
 * - /api/inventory: recursos de inventario y plantillas
 */

const transactionsRoutes = require("./routes/transactions.routes");
app.use("/api/inventory/transactions", transactionsRoutes);

const inventoryRoutes = require("./routes/inventory.routes");
app.use("/api/inventory", inventoryRoutes);


const laboratoryRoutes = require("./routes/laboratory.routes");
app.use("/api/laboratory", laboratoryRoutes);

const searchRoutes = require("./routes/Search.routes");
app.use("/api/search", searchRoutes);

const contactlensesRoutes = require("./routes/contactlenses.routes");
app.use("/api/contactlenses", contactlensesRoutes);

const catalogRoutes = require("./routes/catalog.routes");
app.use("/api/catalog", catalogRoutes);

const statsRoutes = require("./routes/stats.routes");
app.use("/api/stats", statsRoutes);

const devolutionsRoutes = require("./routes/devolutions.routes");
app.use("/api/devolutions", devolutionsRoutes);

const mermaRoutes = require("./routes/merma.routes");
app.use("/api/mermas", mermaRoutes);

// Se movió a /api/inventory/transactions para consistencia global

// si tu API usa prefijo /api:
// app.use("/api/laboratory", laboratoryRoutes);

/**
 * Manejo centralizado de errores
 */
app.use((err, _req, res, _next) => {
  console.error("[Inventory ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

// Conectar al Gateway WebSocket para broadcasting
const labWs = require("./ws");
labWs.connect();

// Hooks Mongoose: detecta cambios de stock en cualquier escritura a Matrix
// (creacion de planilla, seed, scripts CLI, rutas)
const { registerStockAlertHooks } = require("./hooks/stockAlertHooks");
registerStockAlertHooks();

// Job de alertas: sweep inicial al arrancar + cron diario 3AM (safety net)
const { startStockAlertJob } = require("./jobs/stockAlert.job");
startStockAlertJob();

/**
 * Inicio del servidor
 */
app.listen(PORT, HOST, () => {
  console.log(`🚀 Inventory Service corriendo en http://${HOST}:${PORT}`);
});
