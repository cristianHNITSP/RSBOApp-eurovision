/**
 * useAgGridBase.js
 * Lógica compartida por los 5 templates de AG-Grid.
 * Centraliza: tema reactivo al dark mode, localeText, rowClassRules,
 * helpers numéricos y ACK helpers.
 */
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import {
  themeQuartz,
  iconSetQuartzBold,
  colorSchemeLight,
  colorSchemeDark,
} from "ag-grid-community";

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
 * Retorna `themeCustom` (computed reactivo al dark mode) y `rowClassRules`
 * (stock cero/bajo) que necesita una función `isZeroStock` e `isLowStock`.
 *
 * @param {{ isZeroStock: (v) => boolean, isLowStock: (v) => boolean }} opts
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

  const themeCustom = computed(() => {
    const d = _darkMode.value;
    return themeQuartz
      .withPart(iconSetQuartzBold, d ? colorSchemeDark : colorSchemeLight)
      .withParams(
        d
          ? {
              accentColor: "#a788f0",
              backgroundColor: "#161b22",
              foregroundColor: "#e2e8f0",
              borderColor: "#2d3748",
              borderRadius: 10,
              wrapperBorder: true,
              wrapperBorderRadius: 10,
              columnBorder: true,
              rowBorder: true,
              headerBackgroundColor: "#1a1f2e",
              headerTextColor: "#c4b5fd",
              headerFontSize: 11,
              headerFontWeight: 600,
              fontFamily:
                "Satoshi, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: 12,
              spacing: 3,
              oddRowBackgroundColor: "#18202e",
            }
          : {
              accentColor: "#7957d5",
              backgroundColor: "#ffffff",
              foregroundColor: "#2d2242",
              borderColor: "#e5e5f0",
              borderRadius: 10,
              wrapperBorder: true,
              wrapperBorderRadius: 10,
              columnBorder: true,
              rowBorder: true,
              headerBackgroundColor: "#f5f3ff",
              headerTextColor: "#4527a0",
              headerFontSize: 11,
              headerFontWeight: 600,
              fontFamily:
                "Satoshi, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: 12,
              spacing: 3,
              oddRowBackgroundColor: "#fbfbff",
            }
      );
  });

  const rowClassRules = computed(() => {
    if (!isZeroStock || !isLowStock) return {};
    return {
      "ag-row--stock-zero": (p) => isZeroStock(p?.data?.existencias),
      "ag-row--stock-low": (p) => isLowStock(p?.data?.existencias),
    };
  });

  return { themeCustom, rowClassRules, _darkMode };
}
