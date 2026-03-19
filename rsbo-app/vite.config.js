// vite.config.js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(() => {
  // En contenedor: VITE_PROXY_TARGET=http://gateway:3000
  // En host:      VITE_PROXY_TARGET=http://localhost:3000
  const apiTarget = process.env.VITE_PROXY_TARGET || "http://localhost:3000";

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

  return {
    plugins: [vue()],
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
