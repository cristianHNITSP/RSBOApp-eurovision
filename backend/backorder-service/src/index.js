/**
 * @fileoverview Punto de entrada principal del servicio de back orders
 * Inicializa Express, configura CORS, parseo de JSON/cookies y conecta a MongoDB.
 * Expone rutas bajo /api/backorders.
 *
 * @version 1.0.0
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

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
 * Configurar trust proxy (importante para reverse proxy como Nginx)
 */
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
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB (backorder)");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

/**
 * Ruta de healthcheck
 */
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backorder", ts: Date.now() });
});

/**
 * Rutas principales de back orders
 * - /api/backorders/bases-micas
 * - /api/backorders/lentes
 * - /api/backorders/optica
 * - /api/backorders (cross-catálogo)
 */

const basesmicasRoutes = require("./routes/basesmicas.routes");
app.use("/api/backorders/bases-micas", basesmicasRoutes);

const lentesRoutes = require("./routes/lentes.routes");
app.use("/api/backorders/lentes", lentesRoutes);

const opticaRoutes = require("./routes/optica.routes");
app.use("/api/backorders/optica", opticaRoutes);

const listRoutes = require("./routes/list.routes");
app.use("/api/backorders", listRoutes);

/**
 * Manejo centralizado de errores
 */
app.use((err, _req, res, _next) => {
  console.error("[BackOrder ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

// Conectar al Gateway WebSocket para broadcasting
const backorderWs = require("./ws");
backorderWs.connect();

/**
 * Inicio del servidor
 */
app.listen(PORT, HOST, () => {
  console.log(`🚀 BackOrder Service corriendo en http://${HOST}:${PORT}`);
});
