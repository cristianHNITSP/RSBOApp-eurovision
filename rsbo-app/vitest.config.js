import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Config de pruebas unitarias (vitest) — AISLADA del build de Vite/Buefy.
// Solo corre *.spec.js; usa jsdom para composables que tocan window/eventos.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.js"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
