/**
 * @fileoverview Punto de entrada principal del servicio de autenticación
 * Inicializa Express, MongoDB, CORS, cookies, rutas y AdminJS panel.
 *
 * @author cristianHNITSP
 * @version 1.0.0
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

// -------------------------
// SEGURIDAD Y ARQUITECTURA
// -------------------------
app.disable("x-powered-by"); // Ocultar que usamos Express

// Cabeceras de seguridad manuales
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // Límite de 500 peticiones por ventana
  message: { error: "Demasiadas peticiones desde esta IP, intente más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const PORT = process.env.PORT || 3001;
const HOST = process.env.SERVICE_HOST || "0.0.0.0";

// 👇 Importante si algún día pones reverse proxy TLS (Nginx/Caddy)
app.set("trust proxy", 1);

// -------------------------
// CORS
// -------------------------
const rawOrigins = process.env.CORS_ORIGINS || "";
const envOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const devOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.0.87:5173",
];

const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));
console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      console.warn(`❌ CORS bloqueado: ${origin}`);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  })
);

// -------------------------
// Middlewares core
// -------------------------
app.use(express.json({ limit: "1mb" }));

// FIX: si llega JSON inválido -> responde JSON entendible
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.warn("⚠️ JSON parse error:", req.method, req.originalUrl, err.message);
    return res.status(400).json({ error: "JSON inválido o cuerpo vacío con Content-Type application/json" });
  }
  return next(err);
});

app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log("➡️", req.method, req.originalUrl, "| ct:", req.headers["content-type"] || "-");
    next();
  });
}

// -------------------------
// Mongo
// -------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// -------------------------
// Health
// -------------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "auth", ts: Date.now() });
});

// -------------------------
// Routes
// -------------------------
app.use("/api/access", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/workspace/preferences", require("./routes/preferences.routes"));

// -------------------------
// AdminJS + global error handler + listen
// AdminJS es ESM-only (v7+), se importa con dynamic import
// -------------------------
async function start() {
  const { default: AdminJS } = await import("adminjs");
  const { default: AdminJSExpress } = await import("@adminjs/express");
  const { Database, Resource } = await import("@adminjs/mongoose");
  const bcrypt = require("bcrypt");
  const User = require("./models/User");
  const Role = require("./models/Role");

  // Modelos de otras BDs (conexiones separadas)
  const inv  = require("./admin/inventoryModels");
  const notif = require("./admin/notificationModels");

  AdminJS.registerAdapter({ Database, Resource });

  // Opciones comunes para recursos de solo lectura (audit/matrices)
  const readOnly = {
    actions: {
      new:    { isAccessible: false },
      edit:   { isAccessible: false },
      delete: { isAccessible: false },
    },
  };

  const admin = new AdminJS({
    resources: [
      // ── AUTH ────────────────────────────────────────────────────────────────
      {
        resource: User,
        options: {
          navigation: { name: "Auth", icon: "User" },
          properties: {
            password:  { isVisible: false },
            tokens:    { isVisible: false },
            name:      { isTitle: true },
            isActive:  { isVisible: { list: true, filter: true, show: true, edit: true } },
            deletedAt: { isVisible: { list: true, filter: true, show: true, edit: false } },
            lastLogin: { isVisible: { list: true, filter: false, show: true, edit: false } },
            createdAt: { isVisible: { list: true, filter: false, show: true, edit: false } },
          },
          actions: {
            delete: {
              before: async (request) => {
                if (request.record?.params?.["role.name"] === "root") {
                  throw new Error("El usuario root no se puede eliminar");
                }
                return request;
              },
            },
          },
        },
      },
      {
        resource: Role,
        options: {
          navigation: { name: "Auth", icon: "Award" },
          actions: { delete: { isAccessible: false } },
        },
      },

      // ── INVENTARIO ──────────────────────────────────────────────────────────
      ...(inv.InventorySheet ? [{
        resource: inv.InventorySheet,
        options: {
          navigation: { name: "Inventario", icon: "Package" },
          properties: {
            nombre:    { isTitle: true },
            isDeleted: { isVisible: { list: true, filter: true, show: true, edit: true } },
            deletedAt: { isVisible: { list: false, filter: false, show: true, edit: false } },
          },
        },
      }] : []),
      ...(inv.ContactLensesSheet ? [{
        resource: inv.ContactLensesSheet,
        options: {
          navigation: { name: "Inventario", icon: "Eye" },
          properties: {
            nombre:    { isTitle: true },
            isDeleted: { isVisible: { list: true, filter: true, show: true, edit: true } },
          },
        },
      }] : []),

      // ── CATÁLOGO ────────────────────────────────────────────────────────────
      ...(inv.CatalogBase ? [{
        resource: inv.CatalogBase,
        options: { navigation: { name: "Catálogo", icon: "Book" }, properties: { key: { isTitle: true } } },
      }] : []),
      ...(inv.CatalogTreatment ? [{
        resource: inv.CatalogTreatment,
        options: { navigation: { name: "Catálogo", icon: "Tag" }, properties: { key: { isTitle: true } } },
      }] : []),

      // ── LABORATORIO ─────────────────────────────────────────────────────────
      ...(inv.LaboratoryOrder ? [{
        resource: inv.LaboratoryOrder,
        options: {
          navigation: { name: "Laboratorio", icon: "Activity" },
          properties: {
            folio:   { isTitle: true },
            status:  { isVisible: { list: true, filter: true, show: true, edit: true } },
            lines:   { isVisible: { list: false, filter: false, show: true, edit: false } },
          },
        },
      }] : []),
      ...(inv.LaboratoryEvent ? [{
        resource: inv.LaboratoryEvent,
        options: { navigation: { name: "Laboratorio", icon: "List" }, ...readOnly },
      }] : []),

      // ── MATRICES (solo lectura) ─────────────────────────────────────────────
      ...(inv.MatrixBase ? [{
        resource: inv.MatrixBase,
        options: { navigation: { name: "Matrices", icon: "Grid" }, ...readOnly,
          properties: { cells: { isVisible: { list: false, filter: false, show: true, edit: false } } } },
      }] : []),
      ...(inv.MatrixSphCyl ? [{
        resource: inv.MatrixSphCyl,
        options: { navigation: { name: "Matrices", icon: "Grid" }, ...readOnly,
          properties: { cells: { isVisible: { list: false, filter: false, show: true, edit: false } } } },
      }] : []),
      ...(inv.MatrixBifocal ? [{
        resource: inv.MatrixBifocal,
        options: { navigation: { name: "Matrices", icon: "Grid" }, ...readOnly,
          properties: { cells: { isVisible: { list: false, filter: false, show: true, edit: false } } } },
      }] : []),
      ...(inv.MatrixProgresivo ? [{
        resource: inv.MatrixProgresivo,
        options: { navigation: { name: "Matrices", icon: "Grid" }, ...readOnly,
          properties: { cells: { isVisible: { list: false, filter: false, show: true, edit: false } } } },
      }] : []),

      // ── MATRICES LENTES CONTACTO (solo lectura) ─────────────────────────────
      ...(inv.CLMatrixEsferico ? [{
        resource: inv.CLMatrixEsferico,
        options: { navigation: { name: "CL Matrices", icon: "Circle" }, ...readOnly,
          properties: { cells: { isVisible: { list: false, filter: false, show: true, edit: false } } } },
      }] : []),
      ...(inv.CLMatrixTorico ? [{
        resource: inv.CLMatrixTorico,
        options: { navigation: { name: "CL Matrices", icon: "Circle" }, ...readOnly,
          properties: { cells: { isVisible: { list: false, filter: false, show: true, edit: false } } } },
      }] : []),
      ...(inv.CLMatrixMultifocal ? [{
        resource: inv.CLMatrixMultifocal,
        options: { navigation: { name: "CL Matrices", icon: "Circle" }, ...readOnly,
          properties: { cells: { isVisible: { list: false, filter: false, show: true, edit: false } } } },
      }] : []),
      ...(inv.CLMatrixColorido ? [{
        resource: inv.CLMatrixColorido,
        options: { navigation: { name: "CL Matrices", icon: "Circle" }, ...readOnly,
          properties: { cells: { isVisible: { list: false, filter: false, show: true, edit: false } } } },
      }] : []),

      // ── NOTIFICACIONES ──────────────────────────────────────────────────────
      ...(notif.Notification ? [{
        resource: notif.Notification,
        options: {
          navigation: { name: "Notificaciones", icon: "Bell" },
          properties: {
            title:       { isTitle: true },
            readBy:      { isVisible: { list: false, filter: false, show: true, edit: false } },
            pinnedBy:    { isVisible: { list: false, filter: false, show: true, edit: false } },
            dismissedBy: { isVisible: { list: false, filter: false, show: true, edit: false } },
          },
        },
      }] : []),

      // ── LOGS (solo lectura) ─────────────────────────────────────────────────
      ...(inv.InventoryChangeLog ? [{
        resource: inv.InventoryChangeLog,
        options: { navigation: { name: "Logs", icon: "FileText" }, ...readOnly },
      }] : []),
    ],
    rootPath: "/admin",
    branding: {
      companyName: "RSBO Admin",
      softwareBrothers: false,
      logo: false,
    },
  });

  const jwt     = require("jsonwebtoken");
  const session = require("express-session");

  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  const SESSION_KEY   = "adminjs";

  const sessionOpts = {
    name:              SESSION_KEY,
    secret:            sessionSecret,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge:   8 * 60 * 60 * 1000,
    },
  };

  // ── SSO endpoint ──────────────────────────────────────────────────────────
  // El frontend redirige aquí tras el login como root.
  // Verifica el JWT y auto-envía un formulario POST a /admin/login
  // con el token como "contraseña", para que AdminJS establezca su propia sesión
  // sin que nosotros interfiramos con un segundo middleware de sesión.
  app.get("/admin/sso", (req, res) => {
    const token = req.cookies?.auth_token;
    if (!token) return res.redirect("/");
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.roleName !== "root") return res.redirect("/");
      // El token se escapa para evitar XSS en el value del input
      const safeToken = token
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return res.send(
        `<!doctype html><html><body>` +
        `<form id="f" method="POST" action="/admin/login">` +
        `<input name="email" value="sso" type="hidden">` +
        `<input name="password" value="${safeToken}" type="hidden">` +
        `</form><script>document.getElementById('f').submit();</script>` +
        `</body></html>`
      );
    } catch {
      return res.redirect("/");
    }
  });

  // ── Bloqueo de GET /admin/login ───────────────────────────────────────────
  // El formulario de login de AdminJS no debe ser visible.
  // POST sí se permite porque lo usa el endpoint /admin/sso.
  app.get("/admin/login", (_req, res) => res.redirect("/"));

  // ── Logout personalizado ──────────────────────────────────────────────────
  // Registrado ANTES del adminRouter para tener prioridad.
  // Revoca el JWT de la BD, limpia ambas cookies y redirige al landing.
  app.get("/admin/logout", async (req, res) => {
    const token = req.cookies?.auth_token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await User.findByIdAndUpdate(decoded.id, { $pull: { tokens: { token } } });
      } catch { /* token ya inválido */ }
    }
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });
    res.clearCookie(SESSION_KEY);
    return res.redirect("/");
  });

  // ── Router AdminJS con autenticación (activa botón de logout en la UI) ────
  // authenticate recibe el JWT como "password" (enviado desde /admin/sso).
  // AdminJS gestiona su sesión internamente — sin interferencia externa.
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: async (email, password) => {
        if (email !== "sso" || !password) return null;
        try {
          const decoded = jwt.verify(password, process.env.JWT_SECRET);
          if (decoded.roleName !== "root") return null;
          return { email: decoded.email, title: "Root" };
        } catch {
          return null;
        }
      },
      cookieName:     SESSION_KEY,
      cookiePassword: sessionSecret,
    },
    null,
    sessionOpts
  );
  app.use("/admin", adminRouter);

  console.log("🔐 AdminJS panel montado en /admin");

  // -------------------------
  // Global error handler (debe ir después de todas las rutas, incluido AdminJS)
  // -------------------------
  app.use((err, req, res, _next) => {
    const status = err.statusCode || err.status || 500;
    const message =
      typeof err?.message === "string" && err.message.trim()
        ? err.message
        : "Error interno del servidor";

    if (process.env.NODE_ENV !== "production") {
      console.error("❌ Error global:", {
        status,
        path: req.originalUrl,
        method: req.method,
        message,
        stack: err.stack,
      });
    } else {
      console.error("❌ Error global:", status, message);
    }

    res.status(status).json({ error: message });
  });

  // -------------------------
  // Listen
  // -------------------------
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Auth Service corriendo en http://${HOST}:${PORT}`);
    console.log(`🔐 AdminJS panel: http://${HOST}:${PORT}/admin`);
  });
}

start().catch((err) => {
  console.error("❌ Error al iniciar el servidor:", err);
  process.exit(1);
});
