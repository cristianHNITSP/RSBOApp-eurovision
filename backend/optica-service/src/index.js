const config = require("./config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
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
if (config.env !== "production") {
  app.use(morgan("dev"));
}

mongoose
  .connect(config.mongo.uri)
  .then(async () => {
    console.log("✅ Connected to MongoDB (optica)");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.get(APP_CONSTANTS.PATHS.HEALTH, (_req, res) => {
  res.json({ ok: true, service: "optica", ts: Date.now() });
});

app.use("/api/optica/armazones",  require("./routes/armazones.routes"));
app.use("/api/optica/soluciones", require("./routes/soluciones.routes"));
app.use("/api/optica/accesorios", require("./routes/accesorios.routes"));
app.use("/api/optica/estuches",   require("./routes/estuches.routes"));
app.use("/api/optica/equipos",    require("./routes/equipos.routes"));
app.use("/api/optica/logs",          require("./routes/logs.routes"));
app.use("/api/optica/sales-catalog", require("./routes/sales-catalog.routes"));
app.use("/api/optica/mermas", require("./routes/mermas.routes"));
app.use("/api/optica/devolutions", require("./routes/devolutions.routes"));
app.use("/api/optica/cash-closures", require("./routes/cash-closure.routes"));
app.use("/api/optica/sales",         require("./routes/sales.routes"));
app.use("/api/optica/stats",      require("./routes/stats.routes"));

app.use((err, _req, res, _next) => {
  console.error("[Optica ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Optica Service corriendo en http://${HOST}:${PORT}`);
  try {
    const ws = require("./ws");
    ws.connect();
  } catch (e) {
    console.warn("[WS] No se pudo iniciar broadcast WS:", e?.message);
  }
});
