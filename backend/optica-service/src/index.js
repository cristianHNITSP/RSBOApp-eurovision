const express      = require("express");
const mongoose     = require("mongoose");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const morgan       = require("morgan");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.SERVICE_HOST || "0.0.0.0";

app.set("trust proxy", 1);

const rawOrigins  = process.env.CORS_ORIGINS || "";
const envOrigins  = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);
const devOrigins  = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.0.87:5173",
];
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
app.use(morgan("dev"));

// ── Conexión MongoDB ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB (optica)");
    /* 
    try {
      const Armazon = require("./models/Armazon");
      const count   = await Armazon.countDocuments({});
      if (count === 0) {
        console.log("🌱 BD vacía — ejecutando seed inicial...");
        const { execFileSync } = require("child_process");
        execFileSync("node", [require("path").join(__dirname, "seeds/seed-optica.js")], {
          stdio: "inherit",
          env: process.env,
        });
      }
    } catch (seedErr) {
      console.warn("⚠️  Seed automático falló (no crítico):", seedErr.message);
    }
    */
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "optica", ts: Date.now() });
});

app.use("/api/optica/armazones",  require("./routes/armazones.routes"));
app.use("/api/optica/lentes",     require("./routes/lentes.routes"));
app.use("/api/optica/soluciones", require("./routes/soluciones.routes"));
app.use("/api/optica/accesorios", require("./routes/accesorios.routes"));
app.use("/api/optica/estuches",   require("./routes/estuches.routes"));
app.use("/api/optica/equipos",    require("./routes/equipos.routes"));
app.use("/api/optica/logs",       require("./routes/logs.routes"));

// ── Manejo de errores ─────────────────────────────────────────────────────────
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
