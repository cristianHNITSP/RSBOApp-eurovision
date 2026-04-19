/**
 * useAgGridBase.js
 * Lógica compartida por los 5 templates de AG-Grid.
 *
 * Centraliza: tema reactivo al dark mode (glassmorphism, no-line rule),
 * localeText, helpers numéricos y ACK helpers.
 *
 * Las reglas de stock (LOW_STOCK_THRESHOLD, isZeroStock, isLowStock,
 * stockRowClassRules, stockCellClassRules) se delegan a useStockRules.js.
 * Este módulo re-exporta useStockRules para conveniencia de los templates
 * que ya importaban todo desde aquí.
 */
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import {
  themeQuartz,
  iconSetQuartzBold,
  colorSchemeLight,
  colorSchemeDark,
} from "ag-grid-community";

// Re-export para compatibilidad con templates existentes
export { useStockRules } from "@/composables/ag-grid/useStockRules";

// ── ACK helpers ──────────────────────────────────────────────────────────────
export const ackOk = (ack, message = "Ok", status = 200) => {
  if (typeof ack === "function") ack({ ok: true, status, message });
};
export const ackErr = (ack, message = "Error", status = 400) => {
  if (typeof ack === "function") ack({ ok: false, status, message });
  else alert(message);
};
export const msgFromErr = (e, fallback = "Error de servidor") =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
export const statusFromErr = (e) => e?.response?.status ?? 0;
export const normalizeAxiosOk = (res) => {
  const status = res?.status ?? 200;
  const body = res?.data ?? null;
  if (body?.ok === false)
    return { ok: false, status, message: body?.message || "Operación rechazada" };
  return { ok: true, status, message: body?.message || "Operación exitosa" };
};

// ── Helpers numéricos ────────────────────────────────────────────────────────
export const numOr = (v, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
};
export const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());
export const to2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};
export const fmtSigned = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n ?? "");
  const s = num.toFixed(2);
  return num >= 0 ? `+${s}` : s;
};
export const isMultipleOfStep = (value, step) => {
  const v = Number(value);
  const st = Number(step);
  if (!Number.isFinite(v) || !Number.isFinite(st) || st <= 0) return false;
  const abs = Math.abs(v);
  const mult = Math.round(abs / st);
  return Math.abs(mult * st - abs) < 1e-6;
};

// ── localeText (AG-Grid i18n) ────────────────────────────────────────────────
export const localeText = {
  noRowsToShow: "No hay filas para mostrar",
  loadingOoo: "Cargando...",
};

// ── Composable principal ─────────────────────────────────────────────────────
/**
 * Retorna `themeCustom` (computed reactivo al dark mode).
 *
 * Diseño glassmorphism / no-line rule:
 *  - columnBorder: false  → sin líneas verticales entre celdas
 *  - rowBorder: false     → sin líneas horizontales entre filas
 *  - El contraste y el blur separan elementos en lugar de líneas duras
 *  - Fondo semi-transparente para que el backdrop-filter del wrapper actúe
 *
 * @deprecated opts.isZeroStock / opts.isLowStock — usar useStockRules() directamente.
 *   Se mantienen por compatibilidad retroactiva y generan un rowClassRules básico.
 */
export function useAgGridBase({ isZeroStock, isLowStock } = {}) {
  // Detectar dark mode y observar cambios en data-theme
  const _darkMode = ref(
    document.documentElement.getAttribute("data-theme") === "dark"
  );
  const _observer = new MutationObserver(() => {
    _darkMode.value =
      document.documentElement.getAttribute("data-theme") === "dark";
  });

  onMounted(() =>
    _observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
  );
  onBeforeUnmount(() => _observer.disconnect());

  // ── Tema glassmorphism (no-line rule) ────────────────────────────────────
  const themeCustom = computed(() => {
    const d = _darkMode.value;
    return themeQuartz
      .withPart(iconSetQuartzBold, d ? colorSchemeDark : colorSchemeLight)
      .withParams(
        d
          ? {
              // ── Dark glassmorphism ──
              accentColor: "#a78bfa",
              backgroundColor: "rgba(15, 18, 30, 0.0)",
              foregroundColor: "#e2e8f0",
              // No-line rule: sin bordes nativos, contraste por fondo alternado
              borderColor: "transparent",
              columnBorder: false,
              rowBorder: false,
              wrapperBorder: false,
              borderRadius: 0,
              wrapperBorderRadius: 0,
              // Editor input — No-line rule: radio 0, foco por underline
              inputBorderRadius: 0,
              // Header
              headerBackgroundColor: "rgba(20, 16, 40, 0.55)",
              headerTextColor: "#c4b5fd",
              headerFontSize: 11,
              headerFontWeight: 700,
              // Tipografía editorial
              fontFamily:
                "'Manrope', 'Satoshi', system-ui, -apple-system, sans-serif",
              fontSize: 12,
              spacing: 3,
              // Fila alternada muy sutil
              oddRowBackgroundColor: "rgba(167, 139, 250, 0.04)",
            }
          : {
              // ── Light glassmorphism ──
              accentColor: "#7957d5",
              backgroundColor: "rgba(255, 255, 255, 0.0)",
              foregroundColor: "#2d2242",
              // No-line rule
              borderColor: "transparent",
              columnBorder: false,
              rowBorder: false,
              wrapperBorder: false,
              borderRadius: 0,
              wrapperBorderRadius: 0,
              // Editor input — No-line rule: radio 0, foco por underline
              inputBorderRadius: 0,
              // Header
              headerBackgroundColor: "rgba(245, 243, 255, 0.70)",
              headerTextColor: "#4527a0",
              headerFontSize: 11,
              headerFontWeight: 700,
              // Tipografía editorial
              fontFamily:
                "'Manrope', 'Satoshi', system-ui, -apple-system, sans-serif",
              fontSize: 12,
              spacing: 3,
              // Fila alternada muy sutil
              oddRowBackgroundColor: "rgba(121, 87, 213, 0.025)",
            }
      );
  });

  // ── rowClassRules (compatibilidad retroactiva) ───────────────────────────
  const rowClassRules = computed(() => {
    if (!isZeroStock || !isLowStock) return {};
    return {
      "ag-row--stock-zero": (p) =>
        !p?.data?.__loading && isZeroStock(p?.data?.existencias),
      "ag-row--stock-low": (p) =>
        !p?.data?.__loading && isLowStock(p?.data?.existencias),
    };
  });

  // ── Fullscreen logic ─────────────────────────────────────────────────────
  const isFullscreen = ref(false);

  function toggleFullscreen(element = null) {
    if (!document.fullscreenElement) {
      const el = element || document.documentElement;
      el.requestFullscreen?.().catch((err) => {
        console.warn(`Error al activar pantalla completa: ${err.message}`);
      });
      isFullscreen.value = true;
    } else {
      document.exitFullscreen?.();
      isFullscreen.value = false;
    }
  }

  const _fsHandler = () => {
    isFullscreen.value = !!document.fullscreenElement;
  };

  onMounted(() => {
    _observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    document.addEventListener("fullscreenchange", _fsHandler);
  });

  onBeforeUnmount(() => {
    _observer.disconnect();
    document.removeEventListener("fullscreenchange", _fsHandler);
  });

  return { themeCustom, rowClassRules, _darkMode, isFullscreen, toggleFullscreen };
}
