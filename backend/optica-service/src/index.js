const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.SERVICE_HOST || "0.0.0.0";

app.set("trust proxy", 1);

const rawOrigins = process.env.CORS_ORIGINS || "";
const envOrigins = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);
const devOrigins = [
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

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB (optica)"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "optica", ts: Date.now() });
});


app.use((err, _req, res, _next) => {
  console.error("[Optica ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Optica Service corriendo en http://${HOST}:${PORT}`);
});
