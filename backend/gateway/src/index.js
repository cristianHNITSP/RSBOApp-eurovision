const config = require("./config");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { WebSocketServer } = require("ws");
const { createProxyMiddleware } = require("http-proxy-middleware");
const mongoSanitize = require("express-mongo-sanitize");
const crypto = require("crypto");

// Token compartido S2S para autenticar el WS interno (relay → clientes).
const INTERNAL_WS_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";
function tokenEq(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const app = express();

// 👇 Importante si algún día pones reverse proxy TLS (Nginx/Caddy)
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ── Rate Limiter simple (in-memory, sin dependencia externa) ──────────────
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;      // 1 minuto
const RATE_LIMIT_MAX     = 500;            // máx requests por ventana
const RATE_LIMIT_LOGIN   = 8;             // máx intentos de login por ventana

function rateLimit(max = RATE_LIMIT_MAX) {
  return (req, res, next) => {
    // Con `trust proxy` fijado, req.ip ya resuelve el primer hop confiable.
    // Usar el header X-Forwarded-For crudo sería spoofeable por el cliente.
    const ip = req.ip || 'unknown';
    const key = `${ip}::${max}`;
    const now = Date.now();
    let entry = rateLimitStore.get(key);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
      entry = { windowStart: now, count: 0 };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfter}s`,
        retryIn: retryAfter,
      });
    }
    next();
  };
}

// Limpieza periódica del store (cada 5 min)
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW;
  for (const [key, entry] of rateLimitStore) {
    if (entry.windowStart < cutoff) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

const allowedOrigins = Array.from(new Set(config.cors.origins));
console.log("✅ CORS allowed origins:", allowedOrigins);

// En desarrollo se permite cualquier origen de red privada (LAN) para poder
// probar desde móvil/tablet. En producción NO aplica (allowlist estricta).
const IS_DEV = process.env.NODE_ENV !== "production";
const LAN_ORIGIN_RX = /^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$/;
const isAllowedOrigin = (origin) =>
  !origin || allowedOrigins.includes(origin) || (IS_DEV && LAN_ORIGIN_RX.test(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      console.warn(`❌ CORS bloqueado para origen no permitido: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);


// ── Cabeceras de seguridad ────────────────────────────────────────────────
app.use((req, res, next) => {
  res.set('X-Content-Type-Options',  'nosniff');
  res.set('X-Frame-Options',          'SAMEORIGIN');
  res.set('X-XSS-Protection',         '1; mode=block');
  res.set('Referrer-Policy',          'strict-origin-when-cross-origin');
  res.set('Permissions-Policy',       'camera=(), microphone=(), geolocation=()');
  // HSTS solo tiene sentido sobre HTTPS (real o tras reverse proxy TLS)
  if (isHttpsRequest(req)) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── Body parser con límite por prefijo ────────────────────────────────────
// Inventario envía matrices completas de dioptrías en un solo chunk (~0.8 MB
// peor caso real), así que esos prefijos usan 2mb; el resto se acota a 256kb.
const jsonSmall = express.json({ limit: "256kb" });
const jsonLarge = express.json({ limit: "2mb" });
const LARGE_BODY_PREFIXES = [
  "/api/inventory", "/api/contactlenses", "/api/laboratory", "/api/catalog",
  "/api/search", "/api/stats", "/api/devolutions", "/api/mermas", "/api/optica",
];
app.use((req, res, next) => {
  const useLarge = LARGE_BODY_PREFIXES.some((p) => req.path.startsWith(p));
  return (useLarge ? jsonLarge : jsonSmall)(req, res, next);
});

// Bloquea claves con operadores Mongo ($, .) en body/query/params
app.use(mongoSanitize());

// Anti prototype-pollution (mongo-sanitize no filtra __proto__/constructor/prototype)
app.use((req, res, next) => {
  const FORBIDDEN = ["__proto__", "constructor", "prototype"];
  const bad = (o, d = 0) => {
    if (!o || typeof o !== "object" || d > 8) return false;
    for (const k of Object.keys(o)) {
      if (FORBIDDEN.includes(k)) return true;
      if (bad(o[k], d + 1)) return true;
    }
    return false;
  };
  if (bad(req.body)) return res.status(400).json({ error: "Payload con claves no permitidas" });
  next();
});

const SERVICES = config.services;

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
    console.log(`🔁 Proxying ${req.method} ${req.originalUrl}`);

    // Headers a omitir (hop-by-hop, los que axios/el microservicio manejan,
    // y cabeceras internas/sensibles que el cliente NUNCA debe poder inyectar)
    const headersToOmit = new Set([
      "host",
      "connection",
      "content-length",
      "expect",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade",
      // anti-spoofing hacia servicios internos
      "x-service-token",
    ]);
    // Prefijos de cabeceras de confianza interna que el cliente no debe falsificar
    const blockedHeaderPrefixes = ["x-user-", "x-internal-"];

    const forwardedHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lk = key.toLowerCase();
      if (headersToOmit.has(lk)) continue;
      if (blockedHeaderPrefixes.some((p) => lk.startsWith(p))) continue;
      forwardedHeaders[key] = value;
    }

    // Asegurar cookie solo si existe
    if (req.headers.cookie) {
      forwardedHeaders.cookie = req.headers.cookie;
    }

    // GET / DELETE / HEAD no llevan body — si se reenvían con Content-Type: application/json
    // y sin body, el JSON parser del microservicio lanza SyntaxError → 400.
    const noBody = new Set(["GET", "DELETE", "HEAD", "OPTIONS"]);
    const isNoBody = noBody.has(req.method.toUpperCase());

    const response = await axios({
      method: req.method,
      url: targetUrl,
      ...(isNoBody ? {} : { data: req.body }),
      headers: forwardedHeaders,
      // ✅ NO hacer throw por 401/403/etc; queremos devolver tal cual al cliente
      validateStatus: () => true,
      // timeout de 10s para evitar hangs
      timeout: 10000,
      withCredentials: true,
    });

    const setCookie = response.headers["set-cookie"];

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
    // Si el microservicio respondió (4xx/5xx), reenviamos su body tal cual:
    // ya es una respuesta de aplicación controlada.
    if (err.response) {
      return res.status(err.response.status).send(err.response.data);
    }
    // Error de transporte (timeout, ECONNREFUSED, etc.): NO filtrar err.message
    // al cliente. Log server-side + respuesta genérica.
    console.error(`❌ Proxy transport error [${req.method} ${req.originalUrl}]:`, err.code || err.message);
    return res.status(502).json({ error: "BAD_GATEWAY", message: "Servicio no disponible" });
  }
};

// 🔹 Proxy AdminJS — montado en root con pathFilter para que Express NO strip /admin
//    http-proxy-middleware v3: pathFilter preserva el path completo al proxiar
app.use(
  createProxyMiddleware({
    pathFilter: ["/admin"],
    target: SERVICES.auth,
    changeOrigin: true,
    on: {
      error: (err, _req, res) => {
        console.error("❌ Admin proxy error:", err.message);
        if (res && !res.headersSent) {
          res.status(502).json({ error: "Admin panel no disponible" });
        }
      },
    },
  })
);

// ── Rate limiting global + estricto en login ──────────────────────────────
app.use("/api", rateLimit(RATE_LIMIT_MAX));
app.post("/api/access/login", rateLimit(RATE_LIMIT_LOGIN));

// 🔹 Rutas proxy
app.use("/api/access", proxyRequest(SERVICES.auth));
app.use("/api/users", proxyRequest(SERVICES.users));
app.use("/api/workspace", proxyRequest(SERVICES.auth));
app.use("/api/catalog", proxyRequest(SERVICES.inventory));
app.use("/api/inventory", proxyRequest(SERVICES.inventory));
app.use("/api/laboratory", proxyRequest(SERVICES.inventory));
app.use("/api/search", proxyRequest(SERVICES.inventory));
app.use("/api/contactlenses", proxyRequest(SERVICES.inventory));
app.use("/api/stats", proxyRequest(SERVICES.inventory));
app.use("/api/devolutions", proxyRequest(SERVICES.inventory));
app.use("/api/mermas", proxyRequest(SERVICES.inventory));
// Óptica consolidada dentro de inventory-service (antes optica-service)
app.use("/api/optica", proxyRequest(SERVICES.inventory));
app.use("/api/notifications", proxyRequest(SERVICES.notification));

// 🔹 Ruta principal
app.get("/", (_req, res) => res.send("🚀 RSBO Gateway funcionando"));

// 🔹 Healthcheck interno (usado por Docker healthcheck — debe responder en /health)
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "gateway", time: new Date().toISOString() });
});

// 🔹 Healthcheck público (expuesto al frontend a través de /api)
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "gateway",
    time: new Date().toISOString(),
  });
});

// 🔹 WebSocket
const PORT = config.port;
const server = http.createServer(app);

// Dos WS servers comparten el mismo HTTP server — hay que enrutar el upgrade manualmente
const frontendClients = new Set();
const wss         = new WebSocketServer({ noServer: true });
const wssInternal = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/ws") {
    // Anti-CSWSH: solo orígenes permitidos pueden abrir el WS de frontend.
    if (!isAllowedOrigin(req.headers.origin)) {
      console.warn("❌ WS /ws rechazado por origen:", req.headers.origin);
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else if (url.pathname === "/ws-internal") {
    // S2S: exige el token interno (igual que las rutas HTTP /internal).
    if (!tokenEq(req.headers["x-service-token"], INTERNAL_WS_TOKEN)) {
      console.warn("❌ WS /ws-internal rechazado: token inválido/ausente");
      socket.destroy();
      return;
    }
    wssInternal.handleUpgrade(req, socket, head, (ws) => wssInternal.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  frontendClients.add(ws);
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  console.log("🔌 Frontend WS conectado");
  ws.send(JSON.stringify({ type: "welcome" }));
  ws.on("close", () => {
    frontendClients.delete(ws);
    console.log("❌ Frontend WS desconectado");
  });
  ws.on("error", () => {});
});

// Heartbeat: mantiene vivas las conexiones (evita drops por inactividad del proxy)
// y limpia las "medio muertas" que no responden al ping.
const _wsHeartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      frontendClients.delete(ws);
      try { return ws.terminate(); } catch { return; }
    }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 30000);
wss.on("close", () => clearInterval(_wsHeartbeat));

wssInternal.on("connection", (ws) => {
  console.log("🔌 Servicio interno WS conectado");
  ws.on("message", (data) => {
    let _t = "?"; try { _t = JSON.parse(String(data)).type; } catch {}
    let _n = 0;
    frontendClients.forEach((client) => {
      if (client.readyState === 1) {
        try { client.send(String(data)); _n++; } catch {}
      }
    });
    console.log("[WS][RELAY]", _t, "→", _n, "/", frontendClients.size, "(vivos/en-set)");
  });
  ws.on("close", () => console.log("❌ Servicio interno WS desconectado"));
  ws.on("error", () => {});
});

server.listen(PORT, () => console.log(`🟢 Gateway corriendo en puerto ${PORT}`));
