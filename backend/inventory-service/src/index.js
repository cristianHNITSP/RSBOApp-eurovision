/**
 * @fileoverview Punto de entrada principal del servicio de inventario
 */

const config = require("./config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { APP_CONSTANTS } = require("./data/constants");

// Initialize Redis cache (now uses validated config)
require("./services/redis");

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

const { seedCatalog } = require("./services/catalog.seed");

mongoose
  .connect(config.mongo.uri)
  .then(() => {
    console.log("✅ Connected to MongoDB (inventory)");
    seedCatalog();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.get(APP_CONSTANTS.PATHS.HEALTH, (_req, res) => {
  res.json({ ok: true, service: "inventory", ts: Date.now() });
});

// Rutas
app.use("/api/inventory", require("./routes/inventory.routes"));
app.use("/api/search", require("./routes/Search.routes"));
app.use("/api/contactlenses", require("./routes/contactlenses.routes"));
app.use("/api/catalog", require("./routes/catalog.routes"));
app.use("/api/stats", require("./routes/stats.routes"));

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

app.listen(PORT, HOST, () => {
  console.log(`🚀 Inventory Service corriendo en http://${HOST}:${PORT}`);
});
