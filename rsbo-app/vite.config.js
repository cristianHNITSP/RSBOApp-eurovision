// vite.config.js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";

export default defineConfig(({ command, mode }) => {
  // --- VALIDACIÓN FAIL-FAST (solo en dev: el proxy no existe en producción) ---
  if (mode !== "production") {
    const missing = ["VITE_PROXY_TARGET"].filter(key => !process.env[key]);
    if (missing.length > 0) {
      console.error(`\n\x1b[31m[FRONTEND CONFIG ERROR] Faltan variables críticas: ${missing.join(", ")}\x1b[0m\n`);
      process.exit(1);
    }
  }

  const apiTarget = process.env.VITE_PROXY_TARGET;

  const onProxyError = (prefix) => (err, req, res) => {
    console.error(`${prefix} PROXY ERROR:`, err?.code, err?.message);

    if (res && !res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Proxy error",
          code: err?.code || "UNKNOWN",
          message: err?.message || "Unknown proxy error",
        })
      );
    }
  };

  const logReq = (prefix) => (proxyReq, req) => {
    const host = proxyReq.getHeader("host");
    console.log(`${prefix} ->`, req.method, req.url, "| host:", host);
  };

  const logRes = (prefix) => (proxyRes, req) => {
    console.log(`${prefix} <-`, req.method, req.url, "| status:", proxyRes.statusCode);
  };

  // HTTPS solo en el dev server (serve): habilita contexto seguro en la LAN
  // para que la cámara (getUserMedia) funcione en iOS/Android/desktop.
  const devHttpsPlugins = command === "serve" ? [basicSsl()] : [];

  return {
    plugins: [vue(), ...devHttpsPlugins],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },

    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      logLevel: "info",
      proxy: {
        "^/api/.*": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          xfwd: true,
          configure: (proxy) => {
            proxy.on("proxyReq", logReq("[API]"));
            proxy.on("proxyRes", logRes("[API]"));
            proxy.on("error", onProxyError("[API]"));
          },
        },

        "/admin": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on("proxyReq", logReq("[ADMIN]"));
            proxy.on("proxyRes", logRes("[ADMIN]"));
            proxy.on("error", onProxyError("[ADMIN]"));
          },
        },

        "/ws": {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
          xfwd: true,
          configure: (proxy) => {
            proxy.on("proxyReq", logReq("[WS]"));
            proxy.on("proxyRes", logRes("[WS]"));
            proxy.on("error", onProxyError("[WS]"));
          },
        },
      },
    },

    // Bulma emite media queries no estándar con var()/calc() dentro de la
    // condición (ej. `@media (max-width: calc(var(--..) - 1px))`). lightningcss
    // (minificador por defecto de rolldown-vite) las considera inválidas y
    // aborta el build. `errorRecovery` las ignora (recupera) y continúa,
    // permitiendo minificar el CSS igualmente.
    css: {
      lightningcss: { errorRecovery: true },
    },

    build: {
      sourcemap: false,
      minify: "terser",
      emptyOutDir: true,
      outDir: "dist",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ["console.info", "console.debug", "console.warn"],
          passes: 3,
          toplevel: true,
        },
        mangle: { toplevel: true },
        format: { comments: false, beautify: false, ascii_only: true },
        keep_fnames: false,
      },
      chunkSizeWarningLimit: 500,
    },

    logLevel: "info",
  };
});