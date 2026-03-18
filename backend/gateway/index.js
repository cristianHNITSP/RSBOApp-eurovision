// gateway/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();

// 👇 Importante si algún día pones reverse proxy TLS (Nginx/Caddy)
// y para que req.secure / x-forwarded-proto tenga sentido.
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


// ── Cabeceras de seguridad ────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options',  'nosniff');
  res.set('X-Frame-Options',          'SAMEORIGIN');
  res.set('X-XSS-Protection',         '1; mode=block');
  res.set('Referrer-Policy',          'strict-origin-when-cross-origin');
  res.set('Permissions-Policy',       'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json());

// 🔹 URLs de microservicios
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL,
  users: process.env.USERS_SERVICE_URL,
  inventory: process.env.INVENTORY_SERVICE_URL,
  optica: process.env.OPTICA_SERVICE_URL,
  notification: process.env.NOTIFICATION_SERVICE_URL,
};

// ✅ Helpers
const isHttpsRequest = (req) => {
  const xfProto = (req.headers["x-forwarded-proto"] || "").toString();
  return xfProto === "https" || req.secure === true;
};

const rewriteSetCookieForHttp = (setCookieArr) => {
  // En HTTP NO se puede usar Secure, y SameSite=None requiere Secure,
  // así que lo bajamos a Lax.
  return setCookieArr.map((c) => {
    c = c.replace(/;\s*Secure/gi, "");
    c = c.replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
    if (!/;\s*SameSite=/i.test(c)) c += "; SameSite=Lax";
    return c;
  });
};

// 🔸 Proxy genérico con cookies
const proxyRequest = (serviceUrl) => async (req, res) => {
  try {
    if (!serviceUrl) {
      return res.status(500).json({
        error: "Service URL no configurada en variables de entorno",
        path: req.originalUrl,
      });
    }

    const targetUrl = `${serviceUrl}${req.originalUrl}`;
    console.log(`🔁 Proxying ${req.method} ${req.originalUrl} -> ${targetUrl}`);

    // 📥 Log de cookies recibidas del cliente
    console.log("📥 Cookies recibidas del navegador:", req.headers.cookie || "(none)");

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      // Importante: forward de headers + cookies
      headers: {
        ...req.headers,
        host: undefined, // evita conflictos
        cookie: req.headers.cookie || "",
      },
      // ✅ NO hacer throw por 401/403/etc; queremos devolver tal cual al cliente
      validateStatus: () => true,
      // Nota: withCredentials en axios aplica más en browser; aquí sirve para consistencia
      withCredentials: true,
    });

    // 📤 Log de cookies enviadas por el microservicio
    const setCookie = response.headers["set-cookie"];
    console.log("📤 Cookies enviadas por el microservicio:", setCookie || "(none)");

    // ✅ Reescritura de cookies según si el cliente llegó por HTTPS real o HTTP
    if (setCookie?.length) {
      const https = isHttpsRequest(req);
      const fixedCookies = https ? setCookie : rewriteSetCookieForHttp(setCookie);
      res.setHeader("Set-Cookie", fixedCookies);
    }

    // ✅ Forward de status + body
    // (Puedes también forward de headers específicos si te interesa)
    return res.status(response.status).send(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: err.message };
    console.error("❌ Proxy error:", data);
    return res.status(status).send(data);
  }
};

// 🔹 Rutas proxy
app.use("/api/access", proxyRequest(SERVICES.auth));
app.use("/api/users", proxyRequest(SERVICES.users));
app.use("/api/catalog", proxyRequest(SERVICES.inventory));
app.use("/api/inventory", proxyRequest(SERVICES.inventory));
app.use("/api/laboratory", proxyRequest(SERVICES.inventory));
app.use("/api/search", proxyRequest(SERVICES.inventory));
app.use("/api/contactlenses", proxyRequest(SERVICES.inventory));
app.use("/api/optica", proxyRequest(SERVICES.optica));
app.use("/api/notification", proxyRequest(SERVICES.notification));

// 🔹 Ruta principal
app.get("/", (_req, res) => res.send("🚀 RSBO Gateway funcionando"));

// 🔹 Healthcheck (público bajo /api porque el front expone /api)
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "gateway",
    time: new Date().toISOString(),
  });
});

// 🔹 WebSocket
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Dos WS servers comparten el mismo HTTP server — hay que enrutar el upgrade manualmente
const frontendClients = new Set();
const wss         = new WebSocketServer({ noServer: true });
const wssInternal = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/ws") {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else if (url.pathname === "/ws-internal") {
    wssInternal.handleUpgrade(req, socket, head, (ws) => wssInternal.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  frontendClients.add(ws);
  console.log("🔌 Frontend WS conectado");
  ws.send(JSON.stringify({ type: "welcome" }));
  ws.on("close", () => {
    frontendClients.delete(ws);
    console.log("❌ Frontend WS desconectado");
  });
  ws.on("error", () => {});
});

wssInternal.on("connection", (ws) => {
  console.log("🔌 Servicio interno WS conectado");
  ws.on("message", (data) => {
    frontendClients.forEach((client) => {
      if (client.readyState === 1) {
        try { client.send(String(data)); } catch {}
      }
    });
  });
  ws.on("close", () => console.log("❌ Servicio interno WS desconectado"));
  ws.on("error", () => {});
});

server.listen(PORT, () => console.log(`🟢 Gateway corriendo en puerto ${PORT}`));
