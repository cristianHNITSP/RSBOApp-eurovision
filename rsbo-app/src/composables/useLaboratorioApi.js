import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/useLabToast.js";
import { exportToXlsx } from "@/composables/useExcelExport.js";
import { listSheets as invListSheets, fetchItems as invFetchItems } from "@/services/inventory";
import { updatePendingCount } from "./useOrdersBadge.js";
import { createGroupedNotification } from "@/services/notifications";
import {
  listOrders,
  createOrder,
  scanOrder,
  closeOrder,
  resetOrder,
  listEvents,
  requestCorrection,
  cancelOrder as cancelOrderService,
  updateOrder as updateOrderService,
  getOrderHistory
} from "@/services/laboratorio";

// ============================================================================
// HELPERS GENERALES
// ============================================================================

const normTxt = (s) =>
  String(s || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const fmtShort = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const eyeLabel = (e) => {
  if (!e) return "—";
  const s = String(e).toUpperCase();
  if (s === "OD" || s === "R" || s === "RIGHT") return "Derecho";
  if (s === "OS" || s === "OI" || s === "L" || s === "LEFT") return "Izquierdo";
  return e;
};

const todaySlug = () => new Date().toISOString().slice(0, 10);

function openPrintWindow({ title, bodyHtml }) {
  const w = window.open("", "_blank");
  if (!w) return;
  const now = new Date();
  const fechaGenerado = now.toLocaleString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  w.document.open();
  w.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${String(title || "Documento")}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 13px;
      color: #0f172a;
      background:
        radial-gradient(circle at 0% 0%, rgba(121, 87, 213, 0.10), transparent 55%),
        radial-gradient(circle at 100% 70%, rgba(236, 72, 153, 0.07), transparent 55%),
        radial-gradient(circle at 40% 110%, rgba(249, 115, 22, 0.06), transparent 55%),
        #f9fafb;
      padding: 28px;
      min-height: 100vh;
    }

    /* ── Toolbar (oculto al imprimir) ── */
    .print-toolbar {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255, 255, 255, 0.70);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(144, 111, 225, 0.18);
      border-radius: 12px; padding: 12px 18px; margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(88, 28, 135, 0.08);
    }
    .print-toolbar button {
      background: linear-gradient(135deg, #906fe1, #7957d5);
      color: #fff; border: none; border-radius: 8px;
      padding: 9px 24px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: transform 120ms ease;
      box-shadow: 0 4px 14px rgba(121, 87, 213, 0.30);
    }
    .print-toolbar button:hover { transform: translateY(-1px); }
    .print-toolbar span { font-size: 12px; color: rgba(15, 23, 42, 0.55); }

    /* ── Header ── */
    .print-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(144, 111, 225, 0.14);
      border-radius: 14px; padding: 20px 24px; margin-bottom: 22px;
      box-shadow: 0 8px 30px rgba(88, 28, 135, 0.06);
    }
    .print-header-left .doc-title {
      font-size: 22px; font-weight: 700;
      background: linear-gradient(135deg, #7957d5, #906fe1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; line-height: 1.2;
    }
    .print-header-left .doc-subtitle { font-size: 12px; color: rgba(15, 23, 42, 0.50); margin-top: 4px; }
    .print-header-right { text-align: right; }
    .print-header-right .brand {
      font-size: 16px; font-weight: 800; color: #906fe1; letter-spacing: -0.5px;
    }
    .print-header-right .gen-date { font-size: 11px; color: #94a3b8; margin-top: 3px; }

    /* ── Typography ── */
    h2 { font-size: 15px; font-weight: 700; color: #7957d5; margin: 18px 0 8px; }
    h3 { font-size: 13px; font-weight: 600; color: #334155; margin: 12px 0 6px; }
    .muted { color: rgba(15, 23, 42, 0.50); }

    /* ── Glass box ── */
    .box {
      background: rgba(255, 255, 255, 0.60);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(144, 111, 225, 0.12);
      border-radius: 12px; padding: 14px 16px; margin: 12px 0;
      box-shadow: 0 4px 20px rgba(88, 28, 135, 0.05);
    }

    /* ── Info cards grid ── */
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin: 14px 0; }
    .info-card {
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(144, 111, 225, 0.12);
      border-radius: 10px; padding: 12px 16px;
      box-shadow: 0 2px 10px rgba(88, 28, 135, 0.04);
    }
    .info-card .lbl {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px;
      color: #906fe1; font-weight: 700;
    }
    .info-card .val { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 3px; }
    .info-card .val.mono { font-family: ui-monospace, 'Courier New', monospace; font-size: 13px; }

    /* ── Table ── */
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; font-size: 12px; }
    thead tr { background: linear-gradient(135deg, #7957d5, #906fe1); }
    thead th {
      color: #fff; padding: 10px 12px; text-align: left;
      font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px;
    }
    thead th:first-child { border-radius: 10px 0 0 0; }
    thead th:last-child { border-radius: 0 10px 0 0; }
    tbody tr { background: rgba(255, 255, 255, 0.55); }
    tbody tr:nth-child(even) { background: rgba(245, 243, 255, 0.60); }
    tbody tr:hover { background: rgba(144, 111, 225, 0.06); }
    td { padding: 9px 12px; border-bottom: 1px solid rgba(144, 111, 225, 0.08); vertical-align: middle; }
    tfoot tr { background: linear-gradient(135deg, #7957d5, #906fe1); }
    tfoot td {
      color: #fff; font-weight: 700; padding: 10px 12px; border: none;
    }
    tfoot td:first-child { border-radius: 0 0 0 10px; }
    tfoot td:last-child { border-radius: 0 0 10px 0; }

    .mono { font-family: ui-monospace, 'Courier New', monospace; font-size: 11px; }
    .right { text-align: right; }
    .center { text-align: center; }

    /* ── Badges ── */
    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-blue { background: rgba(144, 111, 225, 0.14); color: #7957d5; }
    .badge-green { background: rgba(34, 197, 94, 0.14); color: #166534; }
    .badge-yellow { background: rgba(245, 158, 11, 0.16); color: #854d0e; }
    .badge-red { background: rgba(239, 68, 68, 0.14); color: #991b1b; }
    .badge-gray { background: rgba(148, 163, 184, 0.14); color: #475569; }

    /* ── Note box ── */
    .note-box {
      border-left: 4px solid #f59e0b;
      background: rgba(255, 251, 235, 0.80);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      border-radius: 0 8px 8px 0; padding: 10px 14px; margin: 10px 0; font-size: 12px;
    }

    /* ── Footer ── */
    .print-footer {
      margin-top: 28px; padding-top: 12px;
      border-top: 1px solid rgba(144, 111, 225, 0.14);
      font-size: 10px; color: #94a3b8;
      display: flex; justify-content: space-between;
    }

    @media print {
      .print-toolbar { display: none !important; }
      body { padding: 0; background: #fff; }
      .print-header, .box, .info-card {
        backdrop-filter: none; -webkit-backdrop-filter: none;
        background: #fff; border-color: #e5e7eb;
      }
      tbody tr { background: #fff !important; }
      tbody tr:nth-child(even) { background: #f5f3ff !important; }
      @page { margin: 1.8cm 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
    <span>Para guardar como PDF, selecciona "Guardar como PDF" en el dialogo de impresora.</span>
  </div>
  <div class="print-header">
    <div class="print-header-left">
      <div class="doc-title">${String(title || "Documento")}</div>
      <div class="doc-subtitle">Sistema de gestion optica · RSBO</div>
    </div>
    <div class="print-header-right">
      <div class="brand">RSBO</div>
      <div class="gen-date">Generado el ${fechaGenerado}</div>
    </div>
  </div>
  ${bodyHtml || ""}
  <div class="print-footer">
    <span>RSBO — Sistema de Gestion Optica</span>
    <span>${fechaGenerado}</span>
  </div>
</body>
</html>`);
  w.document.close();
  w.focus();
}

// ============================================================================
// BARCODE (EAN-13)
// ============================================================================

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

function checksumEan13(d12) {
  const digits = d12.split("").map((x) => Number(x));
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function normalizeEan13(raw) {
  const d = onlyDigits(raw);
  if (d.length === 12) return d + String(checksumEan13(d));
  if (d.length === 13) return d;
  return "";
}

function isEan13(raw) {
  const d = onlyDigits(raw);
  if (d.length !== 13) return false;
  return Number(d[12]) === checksumEan13(d.slice(0, 12));
}

function ean13SvgString(value, scale = 2, height = 90) {
  const quiet = 10;
  const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
  const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
  const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

  const ean = normalizeEan13(value);
  if (!ean) return "";

  const first = Number(ean[0]);
  const left = ean.slice(1, 7).split("").map(Number);
  const right = ean.slice(7, 13).split("").map(Number);
  const parity = PARITY[first];

  let bits = "101";
  for (let i = 0; i < 6; i++) bits += parity[i] === "L" ? L[left[i]] : G[left[i]];
  bits += "01010";
  for (let i = 0; i < 6; i++) bits += R[right[i]];
  bits += "101";

  const isGuardBit = (i) => (i >= 0 && i <= 2) || (i >= 45 && i <= 49) || (i >= 92 && i <= 94);
  const sc = Math.max(1, Number(scale || 2));
  const normalH = Math.max(40, Number(height || 90));
  const guardH = normalH + 10;
  const textH = 18;
  const w = (bits.length + quiet * 2) * sc;
  const hSvg = guardH + textH + 6;

  let rects = [];
  let runStart = -1;
  let runGuard = false;

  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i];
    const guard = isGuardBit(i);

    if (bit === "1" && runStart === -1) {
      runStart = i;
      runGuard = guard;
    } else if (bit === "1" && runStart !== -1 && runGuard !== guard) {
      rects.push({ start: runStart, end: i - 1, guard: runGuard });
      runStart = i;
      runGuard = guard;
    } else if (bit === "0" && runStart !== -1) {
      rects.push({ start: runStart, end: i - 1, guard: runGuard });
      runStart = -1;
    }
  }
  if (runStart !== -1) rects.push({ start: runStart, end: bits.length - 1, guard: runGuard });

  const rectsSvg = rects
    .map(
      (r) =>
        `<rect x="${(quiet + r.start) * sc}" y="6" width="${(r.end - r.start + 1) * sc}" height="${r.guard ? guardH : normalH}" fill="#000" />`
    )
    .join("");

  return `<svg width="${w}" height="${hSvg}" viewBox="0 0 ${w} ${hSvg}" role="img" aria-label="Barcode EAN-13" style="display:block">
  <rect x="0" y="0" width="${w}" height="${hSvg}" fill="#fff"></rect>
  ${rectsSvg}
  <text x="${w / 2}" y="${guardH + textH}" text-anchor="middle" font-size="14" fill="#111"
    font-family="ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace">${ean}</text>
</svg>`;
}

// ============================================================================
// SAFE UI ERROR HANDLING
// ============================================================================

const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "");
const collapseWs = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

const looksLikeStackTrace = (s) => {
  const t = String(s ?? "");
  return (
    /(\bat\s+.+\([^)]+\)\b)/.test(t) ||
    /([A-Za-z]:\\|\/).+\.(js|ts|jsx|tsx|json|yml|yaml):\d+:\d+/.test(t) ||
    /\b(node:internal|webpack|vite|chunk)\b/i.test(t)
  );
};

const containsSensitive = (s) => {
  const t = String(s ?? "");
  if (!t) return false;
  return [
    /\bAuthorization:\s*Bearer\s+[A-Za-z0-9\-_\.]+\b/i,
    /\bBearer\s+[A-Za-z0-9\-_\.]+\b/i,
    /\beyJ[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+\b/,
    /\bmongodb(\+srv)?:\/\/[^\s]+/i,
    /\/\/[^/\s:]+:[^@\s]+@/i,
    /\b(api[_-]?key|token|secret|password|passwd|pwd)\b\s*[:=]\s*["']?[^"'\s]+/i,
    /\bPRIVATE KEY\b|\bBEGIN (RSA|EC|OPENSSH) PRIVATE KEY\b/i,
    /\bAKIA[0-9A-Z]{16}\b/
  ].some((re) => re.test(t));
};

const sanitizeUserText = (raw, { maxLen = 160 } = {}) => {
  if (raw == null) return "";
  let s = collapseWs(stripHtml(raw));
  if (!s) return "";
  if (containsSensitive(s) || looksLikeStackTrace(s)) return "";
  if (s.length > maxLen) s = s.slice(0, maxLen - 1).trimEnd() + "…";
  return s;
};

const guessCategory = (status, rawMsg) => {
  const msg = String(rawMsg ?? "").toLowerCase();
  if (msg.includes("network error") || msg.includes("failed to fetch") || msg.includes("econnrefused") || msg.includes("timeout") || msg.includes("etimedout"))
    return "network";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 400 || status === 422) return "validation";
  if (status === 404) return "notfound";
  if (status === 409) return "conflict";
  if (status === 429) return "ratelimit";
  if (msg.includes("e11000") || msg.includes("duplicate key")) return "conflict";
  if (msg.includes("casterror") || msg.includes("validationerror")) return "validation";
  if (typeof status === "number" && status >= 500) return "server";
  return "generic";
};

const categoryToPublicMessage = (category) => ({
  network: "No se pudo conectar con el servidor. Revisa tu red o intenta de nuevo.",
  auth: "Tu sesión expiró. Vuelve a iniciar sesión.",
  forbidden: "No tienes permisos para realizar esta acción.",
  validation: "Hay datos inválidos o fuera de rango. Revisa los valores e intenta de nuevo.",
  notfound: "No se encontró el recurso solicitado.",
  conflict: "Conflicto: ese registro o valor ya existe o está en uso.",
  ratelimit: "Demasiadas solicitudes. Intenta nuevamente en unos segundos.",
  server: "Error interno del servidor. Intenta más tarde.",
  generic: "Ocurrió un error al procesar la operación. Intenta de nuevo."
}[category] || "Ocurrió un error al procesar la operación. Intenta de nuevo.");

const normalizeAck = (ack, { successFallback = "Listo.", errorFallback = "Ocurrió un error." } = {}) => {
  if (!ack) return null;
  if (typeof ack === "string") {
    const safe = sanitizeUserText(ack);
    return { ok: false, status: null, message: safe || errorFallback, _raw: ack };
  }
  if (ack instanceof Error) {
    const status = ack?.response?.status ?? ack?.status ?? null;
    const rawMsg = ack?.response?.data?.message ?? ack?.message ?? String(ack);
    const safeMsg = sanitizeUserText(rawMsg);
    return {
      ok: false,
      status,
      message: safeMsg || categoryToPublicMessage(guessCategory(status, rawMsg)),
      _raw: rawMsg
    };
  }
  const status = ack?.status ?? ack?.statusCode ?? ack?.response?.status ?? ack?.response?.statusCode ?? null;
  const ok = ack?.ok === true ? true : ack?.ok === false ? false : typeof status === "number" ? status < 400 : null;
  const rawMsg = ack?.message ?? ack?.response?.data?.message ?? ack?.response?.data?.error ?? ack?.error ?? "";

  if (ok === true) {
    const safe = sanitizeUserText(rawMsg);
    return { ok: true, status, message: safe || successFallback, _raw: rawMsg };
  }
  const safe = sanitizeUserText(rawMsg);
  return {
    ok: ok === null ? false : ok,
    status,
    message: safe || categoryToPublicMessage(guessCategory(status, rawMsg)) || errorFallback,
    _raw: rawMsg
  };
};

// ============================================================================
// HELPERS DE MICAS
// ============================================================================

const getMicaTypeName = (tipoMatriz) => ({
  BASE: "Lente Monofocal (Base)",
  SPH_CYL: "Lente Monofocal",
  SPH_ADD: "Lente Bifocal",
  BASE_ADD: "Lente Progresivo"
}[tipoMatriz] || tipoMatriz || "—");

function getPeriodStart(period) {
  const now = new Date();
  switch (period) {
    case "day":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(0);
  }
}

// ============================================================================
// COMPOSABLE PRINCIPAL
// ============================================================================

export function useLaboratorioApi(getUser) {
  const notify = (message, type = "is-info", duration = 4000) => {
    const clean = sanitizeUserText(String(message ?? ""), { maxLen: 200 }) || "Listo.";
    labToast.show(clean, type, duration);
  };

  // ---- UI state ----
  const activeMainTab = ref("pedidos");
  const mode = ref("crear");
  const includeDeleted = ref(false);
  const sheetQuery = ref("");

  const selectedSheetId = ref("");
  const _itemsLimit = ref(5000);
  const itemQuery = ref("");
  const stockFilter = ref("all");

  const catalogQuery = ref("");
  const catalogFilter = ref("withStock");
  const catalogPage = ref(1);
  const catalogPageSize = ref(18);

  const orderStatusFilter = ref("open");
  const orderQuery = ref("");
  const selectedOrderId = ref("");
  const scanCode = ref("");

  // modals
  const barcodeOpen = ref(false);
  const barcodeValue = ref("");
  const correctionOpen = ref(false);
  const correction = reactive({ orderId: "", codebar: "", message: "" });

  // data (DB)
  const sheetsDB = ref([]);
  const itemsDB = ref([]);
  const ordersDB = ref([]);
  const entryEvents = ref([]);
  const exitEvents = ref([]);
  const correctionEvents = ref([]);

  // loaders globales
  const loadingSheets = ref(false);
  const loadingItems = ref(false);
  const loadingOrders = ref(false);
  const loadingEvents = ref(false);

  // loaders de acciones
  const loadingCreateOrder = ref(false);
  const loadingCloseOrder = ref(false);
  const loadingScan = ref(false);
  const loadingReset = ref(false);
  const loadingSubmitCorrection = ref(false);
  const loadingRefreshAll = ref(false);
  const loadingExportInv = ref(false);
  const loadingExportCat = ref(false);
  const loadingExportOrders = ref(false);
  const loadingCancelOrder = ref(false);
  const loadingEditOrder   = ref(false);

  const lastUpdatedAt = ref(Date.now());

  const actorRef = () => {
    // Primero intentar con el usuario inyectado desde el prop del layout
    if (typeof getUser === "function") {
      const u = getUser();
      if (u) {
        const userId = u.id ?? u.userId ?? null;
        const name   = u.name ?? u.nombre ?? null;
        if (userId || name) return { userId, name };
      }
    }
    // Fallback: localStorage (para compatibilidad con otros contextos)
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("auth_user") || "";
      if (!raw) return undefined;
      const u = JSON.parse(raw);
      const userId = u?.id || u?.userId || null;
      const name = u?.name || u?.nombre || null;
      return userId || name ? { userId, name } : undefined;
    } catch {
      return undefined;
    }
  };

  const sheetById = (id) => sheetsDB.value.find((s) => String(s.id) === String(id)) || null;
  const sheetNameById = (id) => sheetById(id)?.nombre || sheetById(id)?.name || "—";

  const prettyTrat = (arr) => {
    const a = Array.isArray(arr) ? arr : [];
    return a.length ? a.join(" · ") : "—";
  };

  const sheetTitle = (s) => {
    if (!s) return "—";
    const name = s.nombre || s.name || "Planilla";
    const sku = s.sku ? ` · ${s.sku}` : "";
    return `${name}${sku}`;
  };

  const selectedSheet = computed(() => sheetById(selectedSheetId.value));
  const selectedSheetLabel = computed(() =>
    selectedSheet.value ? sheetTitle(selectedSheet.value) : "Sin planilla"
  );

  const lastUpdatedHuman = computed(() => {
    const ms = Date.now() - Number(lastUpdatedAt.value || Date.now());
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  });

  const fmtVal = (v) => { const n = Number(v ?? 0); return n === 0 ? "—" : n.toFixed(2); };

  const buildRowTitle = (row, sheet) => {
    const t = sheet?.tipo_matriz;
    const name = sheet?.nombre || sheet?.name || "Producto";
    if (t === "BASE") return `${name} · Base ${fmtVal(row.base)}`;
    if (t === "SPH_CYL") return `${name} · Esfera ${fmtVal(row.sph)}, Cilindro ${fmtVal(row.cyl)}`;
    if (t === "SPH_ADD") return `${name} · Ojo ${eyeLabel(row.eye)}`;
    if (t === "BASE_ADD") return `${name} · Ojo ${eyeLabel(row.eye)}`;
    return name;
  };

  const buildRowParams = (row, sheet) => {
    const t = sheet?.tipo_matriz;
    const parts = [];
    if (t === "BASE") {
      parts.push(`Base: ${fmtVal(row.base)}`);
    } else if (t === "SPH_CYL") {
      parts.push(`Esfera: ${fmtVal(row.sph)}`);
      parts.push(`Cilindro: ${fmtVal(row.cyl)}`);
    } else if (t === "SPH_ADD") {
      parts.push(`Esfera: ${fmtVal(row.sph)}`);
      parts.push(`Adicion: ${fmtVal(row.add)}`);
      if (Number(row.base_izq ?? 0) !== 0) parts.push(`Base Izq: ${fmtVal(row.base_izq)}`);
      if (Number(row.base_der ?? 0) !== 0) parts.push(`Base Der: ${fmtVal(row.base_der)}`);
    } else if (t === "BASE_ADD") {
      if (Number(row.base_izq ?? 0) !== 0) parts.push(`Base Izq: ${fmtVal(row.base_izq)}`);
      if (Number(row.base_der ?? 0) !== 0) parts.push(`Base Der: ${fmtVal(row.base_der)}`);
      parts.push(`Adicion: ${fmtVal(row.add)}`);
    }
    return parts.length ? parts.join(" · ") : "—";
  };

  // ======= Sheets =======
  const normalizeSheet = (s) => {
    const id = String(s?._id ?? s?.id ?? "");
    const updatedByName = s?.updatedBy?.name || s?.updatedBy?.nombre || (typeof s?.updatedBy === "string" ? s.updatedBy : "") || "";
    return {
      ...s,
      id,
      nombre: s?.nombre ?? s?.name ?? "",
      name: s?.nombre ?? s?.name ?? "",
      tratamientos: Array.isArray(s?.tratamientos) ? s.tratamientos : [],
      updatedByName
    };
  };

  // ---- in-flight deduplication: evita peticiones paralelas idénticas ----
  const _inFlight = { sheets: null, orders: null, items: null, events: null };

  async function loadSheets() {
    if (_inFlight.sheets) return _inFlight.sheets;
    loadingSheets.value = true;
    _inFlight.sheets = (async () => {
      try {
        const params = {
          includeDeleted: includeDeleted.value ? "true" : "false",
          q: String(sheetQuery.value || "").trim() || undefined
        };
        const { data } = await invListSheets(params);
        const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const mapped = arr.map(normalizeSheet);
        mapped.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
        sheetsDB.value = mapped;
        if (!selectedSheetId.value && mapped.length) selectedSheetId.value = mapped[0].id;
        if (selectedSheetId.value && !sheetById(selectedSheetId.value) && mapped.length) selectedSheetId.value = mapped[0].id;
        lastUpdatedAt.value = Date.now();
      } catch (e) {
        console.error("[LAB] loadSheets", e?.response?.data || e);
        sheetsDB.value = [];
      } finally {
        loadingSheets.value = false;
        _inFlight.sheets = null;
      }
    })();
    return _inFlight.sheets;
  }

  async function loadItems(forceSheetId) {
    const sid = forceSheetId || selectedSheetId.value;
    const sheet = sheetById(sid);
    if (!sheet?.id) {
      itemsDB.value = [];
      return;
    }

    if (_inFlight.items) return _inFlight.items;
    loadingItems.value = true;
    _inFlight.items = (async () => {
      try {
        const params = {
          limit: Number(_itemsLimit.value || 5000),
          q: String(itemQuery.value || "").trim() || undefined
        };
        const { data } = await invFetchItems(sheet.id, params);
        const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        itemsDB.value = rows.map((r, idx) => ({
          ...r,
          _k: String(r.codebar || "") ? `${r.codebar}` : `row_${idx}`,
          existencias: Number(r.existencias || 0)
        }));
        lastUpdatedAt.value = Date.now();
      } catch (e) {
        console.error("[LAB] loadItems", e?.response?.data || e);
        itemsDB.value = [];
      } finally {
        loadingItems.value = false;
        _inFlight.items = null;
      }
    })();
    return _inFlight.items;
  }

  // ======= Orders =======
  const normalizeOrder = (o) => {
    const id = String(o?._id ?? o?.id ?? "");
    const sheetId = String(o?.sheet ?? o?.sheetId ?? "");
    const lines = Array.isArray(o?.lines) ? o.lines : [];
    return {
      ...o,
      id,
      sheetId,
      createdAtShort: fmtShort(o?.createdAt),
      updatedAtShort: fmtShort(o?.updatedAt),
      lines: lines.map((l, i) => ({
        ...l,
        id: String(l?.lineId ?? l?.id ?? `line_${i}`),
        lineId: String(l?.lineId ?? l?.id ?? `line_${i}`),
        qty: Number(l?.qty || 0),
        picked: Number(l?.picked || 0),
        codebar: String(l?.codebar || ""),
        params: l?.params || {},
        eye: l?.eye ?? null,
        tipoMatriz: l?.tipo_matriz || null,
        micaType: l?.micaType || getMicaTypeName(l?.tipo_matriz),
        sheetNombre: l?.sheetNombre || "",
        lineSheetId: l?.sheet ? String(l.sheet) : null
      }))
    };
  };

  async function loadOrders() {
    if (_inFlight.orders) return _inFlight.orders;
    loadingOrders.value = true;
    _inFlight.orders = (async () => {
      try {
        const statusUi = String(orderStatusFilter.value || "open");
        const statusParam = statusUi === "open" ? "all" : statusUi;
        const params = {
          status: statusParam,
          q: String(orderQuery.value || "").trim() || undefined,
          limit: 200
        };
        const { data } = await listOrders(params);
        const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        let mapped = arr.map(normalizeOrder);
        updatePendingCount(arr.filter((o) => o.status === "pendiente" || o.status === "parcial").length);
        if (statusUi === "open") mapped = mapped.filter((o) => o.status === "pendiente" || o.status === "parcial");
        mapped.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        ordersDB.value = mapped;
        if (!selectedOrderId.value && mapped.length) selectedOrderId.value = mapped[0].id;
        if (selectedOrderId.value && !mapped.find((x) => x.id === selectedOrderId.value) && mapped.length)
          selectedOrderId.value = mapped[0].id;
        lastUpdatedAt.value = Date.now();
      } catch (e) {
        console.error("[LAB] loadOrders", e?.response?.data || e);
        ordersDB.value = [];
      } finally {
        loadingOrders.value = false;
        _inFlight.orders = null;
      }
    })();
    return _inFlight.orders;
  }

  const selectedOrder = computed(() => ordersDB.value.find((o) => o.id === selectedOrderId.value) || null);

  watch(selectedOrderId, (id) => {
    const o = ordersDB.value.find((x) => x.id === id);
    if (!o) return;
    if (mode.value === "surtir" && o.sheetId) selectedSheetId.value = o.sheetId;
  });

  // ======= Status helpers =======
  const statusHuman = (s) => ({ pendiente: "Pendiente", parcial: "Parcial", cerrado: "Cerrado", cancelado: "Cancelado" }[s] || s);
  const statusTagClass = (s) => ({ pendiente: "is-warning", parcial: "is-info", cerrado: "is-success", cancelado: "is-danger" }[s] || "is-light");
  const orderTotalCount = (o) => (o?.lines || []).reduce((acc, l) => acc + Number(l.qty || 0), 0);
  const orderPickedCount = (o) => (o?.lines || []).reduce((acc, l) => acc + Math.min(Number(l.picked || 0), Number(l.qty || 0)), 0);
  const orderProgressPct = (o) => {
    const t = orderTotalCount(o);
    return t <= 0 ? 0 : Math.round((orderPickedCount(o) / t) * 100);
  };
  const isOrderComplete = (o) => (o?.lines || []).every((l) => Number(l.picked || 0) >= Number(l.qty || 0));

  const lineHuman = (line, sheet) => {
    const t = line?.tipoMatriz || sheet?.tipo_matriz;
    const p = line?.params || {};
    const parts = [];
    if (line?.eye) parts.push(`Ojo ${eyeLabel(line.eye)}`);
    if (t === "BASE") {
      parts.push(`Base ${fmtVal(p.base)}`);
    } else if (t === "SPH_CYL") {
      parts.push(`Esfera ${fmtVal(p.sph)}`);
      parts.push(`Cilindro ${fmtVal(p.cyl)}`);
    } else if (t === "SPH_ADD") {
      parts.push(`Esfera ${fmtVal(p.sph)}`);
      parts.push(`Adicion ${fmtVal(p.add)}`);
    } else if (t === "BASE_ADD") {
      if (Number(p.base_izq ?? 0) !== 0) parts.push(`Base Izq ${fmtVal(p.base_izq)}`);
      if (Number(p.base_der ?? 0) !== 0) parts.push(`Base Der ${fmtVal(p.base_der)}`);
      parts.push(`Adicion ${fmtVal(p.add)}`);
    }
    return parts.length ? parts.join(" · ") : String(line?.codebar || "Linea");
  };

  // ======= Eventos =======
  const mapEntryEvent = (e) => ({
    id: String(e._id || e.id),
    folio: e?.details?.folio || "—",
    at: fmtShort(e?.createdAt),
    rawCreatedAt: e?.createdAt || null,
    cliente: e?.details?.cliente || "—",
    sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
    linesTotal: Number(e?.details?.linesTotal || 0),
    micaSummary: e?.details?.micaSummary || null
  });

  const mapExitEvent = (e) => ({
    id: String(e._id || e.id),
    folio: e?.details?.folio || "—",
    at: fmtShort(e?.createdAt),
    rawCreatedAt: e?.createdAt || null,
    sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
    codebar: e?.details?.codebar || "",
    title: e?.details?.title || "Salida",
    micaType: e?.details?.micaType || "—"
  });

  const mapCorrectionEvent = (e) => ({
    id: String(e._id || e.id),
    folio: e?.details?.folio || "—",
    at: fmtShort(e?.createdAt),
    rawCreatedAt: e?.createdAt || null,
    sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
    orderId: e?.order ? String(e.order) : null,
    codebar: e?.details?.codebar || "",
    message: e?.details?.message || "",
    actorName: e?.actor?.name || "—"
  });

  async function loadEvents() {
    if (_inFlight.events) return _inFlight.events;
    loadingEvents.value = true;
    _inFlight.events = (async () => {
      try {
        const limit = 200;
        const [en, ex, co] = await Promise.all([
          listEvents({ type: "ORDER_CREATE", limit }),
          listEvents({ type: "EXIT_SCAN", limit }),
          listEvents({ type: "CORRECTION_REQUEST", limit })
        ]);

        const ent = Array.isArray(en?.data?.data) ? en.data.data : Array.isArray(en?.data) ? en.data : [];
        const sal = Array.isArray(ex?.data?.data) ? ex.data.data : Array.isArray(ex?.data) ? ex.data : [];
        const cor = Array.isArray(co?.data?.data) ? co.data.data : Array.isArray(co?.data) ? co.data : [];

        entryEvents.value = ent.map(mapEntryEvent);
        exitEvents.value = sal.map(mapExitEvent);
        correctionEvents.value = cor.map(mapCorrectionEvent);
        lastUpdatedAt.value = Date.now();
      } catch (e) {
        console.error("[LAB] loadEvents", e?.response?.data || e);
        entryEvents.value = [];
        exitEvents.value = [];
        correctionEvents.value = [];
      } finally {
        loadingEvents.value = false;
        _inFlight.events = null;
      }
    })();
    return _inFlight.events;
  }

  // Entradas del día
  const todayEntries = computed(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return entryEvents.value.filter((e) => {
      if (!e.rawCreatedAt) return false;
      return new Date(e.rawCreatedAt) >= start;
    });
  });

  // ======= Draft (multi-planilla) =======
  const draftCliente = ref("");
  const draftNote = ref("");
  const draftLines = ref([]);

  const canCreateOrder = computed(() =>
    draftLines.value.length > 0 && String(draftCliente.value || "").trim().length > 0
  );

  const clearDraft = () => {
    draftLines.value = [];
  };

  const addToDraft = (row) => {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;
    const cb = String(row?.codebar || "").trim();
    if (!cb) return;

    const lineKey = `${sheet.id}__${cb}`;
    const found = draftLines.value.find((x) => x.key === lineKey);
    if (found) {
      found.qty = Math.min(Number(found.qty || 1) + 1, Number(found.stock || 999999));
      notify(`+1 mica: ${found.title}`, "is-info", 2000);
      return;
    }

    const title = buildRowTitle(row, sheet);
    const micaType = getMicaTypeName(sheet.tipo_matriz);
    draftLines.value.push({
      key: lineKey,
      codebar: cb,
      title,
      qty: 1,
      stock: Number(row.existencias || 0),
      sheetId: sheet.id,
      sheetName: sheet.nombre || sheet.name || "—",
      tipoMatriz: sheet.tipo_matriz,
      micaType
    });
    notify(`Agregada: ${title} (${micaType})`, "is-info", 2000);
  };

  const removeDraftLine = (key) => {
    draftLines.value = draftLines.value.filter((x) => x.key !== key);
  };

  const incDraftQty = (key) => {
    const l = draftLines.value.find((x) => x.key === key);
    if (l) l.qty = Math.min(Number(l.qty || 1) + 1, Number(l.stock || 999999));
  };

  const decDraftQty = (key) => {
    const l = draftLines.value.find((x) => x.key === key);
    if (l) l.qty = Math.max(1, Number(l.qty || 1) - 1);
  };

  async function createOrderFromDraft() {
    if (!canCreateOrder.value) return;
    loadingCreateOrder.value = true;
    try {
      const payload = {
        sheetId: draftLines.value[0]?.sheetId || undefined,
        cliente: String(draftCliente.value || "").trim(),
        note: String(draftNote.value || "").trim(),
        lines: draftLines.value.map((l) => ({
          codebar: l.codebar,
          qty: Number(l.qty || 1),
          sheetId: l.sheetId
        })),
        actor: actorRef()
      };
      const { data } = await createOrder(payload);
      const order = normalizeOrder(data?.data);
      await Promise.all([loadOrders(), loadEvents()]);
      selectedOrderId.value = order.id;
      mode.value = "surtir";
      if (order.sheetId) selectedSheetId.value = order.sheetId;
      clearDraft();
      draftCliente.value = "";
      draftNote.value = "";
      if (order.sheetId) await loadItems(order.sheetId);
      lastUpdatedAt.value = Date.now();
      notify(`Pedido ${order.folio || ""} creado para ${order.cliente}`, "is-success");
    } catch (e) {
      console.error("[LAB] createOrder", e?.response?.data || e);
      const n = normalizeAck(e, { errorFallback: "No se pudo crear el pedido." });
      notify(n?.message, "is-danger", 6000);
    } finally {
      loadingCreateOrder.value = false;
    }
  }

  // ======= Surtir =======
  async function scanAndDispatch() {
    const order = selectedOrder.value;
    if (!order?.id) return;
    const cb = String(scanCode.value || "").trim();
    if (!cb) return;

    loadingScan.value = true;
    try {
      const { data } = await scanOrder(order.id, { codebar: cb, qty: 1, actor: actorRef() });
      const updated = normalizeOrder(data?.data);
      const idx = ordersDB.value.findIndex((x) => x.id === updated.id);
      if (idx >= 0) ordersDB.value[idx] = updated;
      if (updated.sheetId) selectedSheetId.value = updated.sheetId;
      await Promise.all([loadItems(updated.sheetId), loadEvents()]);
      scanCode.value = "";
      lastUpdatedAt.value = Date.now();
      if (isOrderComplete(updated)) notify(`Pedido ${updated.folio} completado. Listo para cerrar.`, "is-success", 5000);
      else notify(`Salida registrada: ${cb}`, "is-success", 2500);
    } catch (e) {
      console.error("[LAB] scanAndDispatch", e?.response?.data || e);
      const n = normalizeAck(e, { errorFallback: "Código no encontrado en el pedido." });
      notify(n?.message, "is-danger", 5000);
    } finally {
      loadingScan.value = false;
    }
  }

  async function resetPickedForSelectedOrder() {
    const order = selectedOrder.value;
    if (!order?.id) return;

    loadingReset.value = true;
    try {
      const { data } = await resetOrder(order.id, actorRef());
      const updated = normalizeOrder(data?.data);
      const idx = ordersDB.value.findIndex((x) => x.id === updated.id);
      if (idx >= 0) ordersDB.value[idx] = updated;
      if (updated.sheetId) selectedSheetId.value = updated.sheetId;
      await Promise.all([loadItems(updated.sheetId), loadEvents()]);
      lastUpdatedAt.value = Date.now();
      notify(`Surtido reiniciado para pedido ${updated.folio}`, "is-warning");
    } catch (e) {
      console.error("[LAB] resetOrder", e?.response?.data || e);
      const n = normalizeAck(e, { errorFallback: "No se pudo reiniciar el surtido." });
      notify(n?.message, "is-danger", 5000);
    } finally {
      loadingReset.value = false;
    }
  }

  async function closeSelectedOrder() {
    const order = selectedOrder.value;
    if (!order?.id || order.status === "cerrado" || order.status === "cancelado") return;

    loadingCloseOrder.value = true;
    try {
      const { data } = await closeOrder(order.id, actorRef());
      const updated = normalizeOrder(data?.data);
      await Promise.all([loadOrders(), loadEvents()]);
      lastUpdatedAt.value = Date.now();
      notify(`Pedido ${updated.folio} cerrado correctamente.`, "is-success");
    } catch (e) {
      console.error("[LAB] closeOrder", e?.response?.data || e);
      const n = normalizeAck(e, { errorFallback: "No se pudo cerrar el pedido." });
      notify(n?.message, "is-danger", 5000);
    } finally {
      loadingCloseOrder.value = false;
    }
  }

  // ======= Cancelar/Eliminar orden =======
  async function cancelOrderById(orderId, motivo) {
    if (!orderId) return;
    loadingCancelOrder.value = true;
    try {
      await cancelOrderService(orderId, actorRef(), motivo || null);
      await Promise.all([loadOrders(), loadEvents()]);
      lastUpdatedAt.value = Date.now();
      notify("Pedido cancelado y stock devuelto.", "is-warning");
    } catch (e) {
      console.error("[LAB] cancelOrder", e?.response?.data || e);
      const n = normalizeAck(e, { errorFallback: "No se pudo cancelar el pedido." });
      notify(n?.message, "is-danger", 5000);
    } finally {
      loadingCancelOrder.value = false;
    }
  }

  // ======= Historial de un pedido =======
  const orderHistory = ref([]);
  const loadingOrderHistory = ref(false);

  async function loadOrderHistory(orderId) {
    if (!orderId) { orderHistory.value = []; return; }
    loadingOrderHistory.value = true;
    try {
      const { data } = await getOrderHistory(orderId);
      orderHistory.value = (data?.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      console.error("[LAB] loadOrderHistory", e?.response?.data || e);
      orderHistory.value = [];
    } finally {
      loadingOrderHistory.value = false;
    }
  }

  // ======= Editar orden =======
  async function editOrder(orderId, payload) {
    if (!orderId) return;
    loadingEditOrder.value = true;
    try {
      const { data } = await updateOrderService(orderId, { ...payload, actor: actorRef() });
      const updated = normalizeOrder(data?.data);
      const idx = ordersDB.value.findIndex((o) => o.id === updated.id);
      if (idx >= 0) ordersDB.value[idx] = updated;
      lastUpdatedAt.value = Date.now();
      notify("Pedido actualizado correctamente.", "is-success");
      return updated;
    } catch (e) {
      console.error("[LAB] editOrder", e?.response?.data || e);
      const n = normalizeAck(e, { errorFallback: "No se pudo editar el pedido." });
      notify(n?.message, "is-danger", 5000);
      throw e;
    } finally {
      loadingEditOrder.value = false;
    }
  }

  // ======= Correcciones =======
  watch(correctionOpen, (open) => {
    if (open) correction.orderId = correction.orderId || selectedOrderId.value || "";
  });

  async function submitCorrection() {
    const orderId = correction.orderId || selectedOrderId.value;
    const message = String(correction.message || "").trim();
    const codebar = String(correction.codebar || "").trim() || null;
    if (!orderId || message.length < 3) return;

    loadingSubmitCorrection.value = true;
    try {
      await requestCorrection({ orderId, codebar, message, actor: actorRef() });
      correctionOpen.value = false;
      correction.orderId = "";
      correction.codebar = "";
      correction.message = "";
      await loadEvents();
      lastUpdatedAt.value = Date.now();
      notify("Solicitud de corrección enviada.", "is-info");

      // Notificar solo al supervisor (agrupado)
      createGroupedNotification({
        groupKey:        "pending_corrections",
        title:           "Correcciones pendientes",
        messageTemplate: "{count} solicitud(es) de corrección pendiente(s)",
        type:            "danger",
        priority:        "high",
        targetRoles:     ["supervisor"],
      }).catch(() => {});
    } catch (e) {
      console.error("[LAB] submitCorrection", e?.response?.data || e);
      const n = normalizeAck(e, { errorFallback: "No se pudo enviar la corrección." });
      notify(n?.message, "is-danger", 5000);
    } finally {
      loadingSubmitCorrection.value = false;
    }
  }

  // ======= Computed: filtros UI =======
  const filteredSheets = computed(() => sheetsDB.value);

  const filteredItems = computed(() => {
    const sheet = selectedSheet.value;
    const rows = Array.isArray(itemsDB.value) ? itemsDB.value : [];
    const q = normTxt(itemQuery.value);
    const filter = String(stockFilter.value || "all");
    let out = rows;

    if (filter === "withStock") out = out.filter((r) => Number(r.existencias || 0) > 0);
    else if (filter === "zero") out = out.filter((r) => Number(r.existencias || 0) === 0);

    if (q) {
      out = out.filter((r) => {
        const t = buildRowTitle(r, sheet);
        const p = buildRowParams(r, sheet);
        const cb = String(r.codebar || "");
        return normTxt(t).includes(q) || normTxt(p).includes(q) || normTxt(cb).includes(q);
      });
    }

    return out;
  });

  watch([catalogQuery, catalogFilter], () => {
    catalogPage.value = 1;
  });

  const filteredCatalogRows = computed(() => {
    const sheet = selectedSheet.value;
    const rows = Array.isArray(itemsDB.value) ? itemsDB.value : [];
    const q = normTxt(catalogQuery.value);
    let out = rows;

    if (catalogFilter.value === "withStock") out = out.filter((r) => r.codebar && Number(r.existencias || 0) > 0);
    else if (catalogFilter.value === "allCodes") out = out.filter((r) => !!r.codebar);

    if (q) {
      out = out.filter((r) => {
        const title = buildRowTitle(r, sheet);
        const params = buildRowParams(r, sheet);
        const cb = String(r.codebar || "");
        return normTxt(title).includes(q) || normTxt(params).includes(q) || normTxt(cb).includes(q);
      });
    }

    return out.map((r, idx) => ({
      ...r,
      _k: String(r.codebar || "") ? `${r.codebar}__${idx}` : `row_${idx}`
    }));
  });

  const catalogPages = computed(() =>
    Math.max(1, Math.ceil(filteredCatalogRows.value.length / Number(catalogPageSize.value || 18)))
  );

  const paginatedCatalog = computed(() => {
    const page = Math.min(Math.max(1, Number(catalogPage.value || 1)), catalogPages.value);
    const per = Number(catalogPageSize.value || 18);
    return filteredCatalogRows.value.slice((page - 1) * per, (page - 1) * per + per);
  });

  const totalCodes = computed(() => {
    let n = 0;
    for (const r of itemsDB.value || []) if (r?.codebar && isEan13(r.codebar)) n++;
    return n;
  });

  const recentSheets = computed(() =>
    (sheetsDB.value || []).slice(0, 10).map((s) => ({
      id: s.id,
      nombre: s.nombre,
      sku: s.sku || null,
      material: s.material || "",
      tratamientos: Array.isArray(s.tratamientos) ? s.tratamientos : [],
      updatedAtShort: fmtShort(s.updatedAt || s.createdAt),
      updatedBy: s.updatedByName || "—"
    }))
  );

  // ======= Barcode modal =======
  const openBarcode = (code) => {
    barcodeValue.value = String(code || "");
    barcodeOpen.value = true;
  };

  const copyCodebar = async (code) => {
    const text = String(code || "");
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      notify(`Copiado: ${text}`, "is-info", 2000);
    } catch {
      notify("El navegador bloqueó el acceso al portapapeles.", "is-danger");
    }
  };

  // ======= Export / Print =======
  async function exportInventoryCsv() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    loadingExportInv.value = true;
    try {
      const rows = filteredItems.value;
      const tipo = sheet.tipo_matriz;

      const tipoHeaders =
        tipo === "BASE"
          ? [{ key: "base", label: "Curva Base", width: 14 }]
          : tipo === "SPH_CYL"
          ? [
              { key: "sph", label: "Esfera", width: 14 },
              { key: "cyl", label: "Cilindro", width: 14 }
            ]
          : tipo === "SPH_ADD"
          ? [
              { key: "eye", label: "Ojo", transform: (r) => eyeLabel(r.eye), width: 16 },
              { key: "sph", label: "Esfera", width: 14 },
              { key: "add", label: "Adicion", width: 14 },
              { key: "base_izq", label: "Base Izquierda", width: 16 },
              { key: "base_der", label: "Base Derecha", width: 16 }
            ]
          : tipo === "BASE_ADD"
          ? [
              { key: "eye", label: "Ojo", transform: (r) => eyeLabel(r.eye), width: 16 },
              { key: "base_izq", label: "Base Izquierda", width: 16 },
              { key: "base_der", label: "Base Derecha", width: 16 },
              { key: "add", label: "Adicion", width: 14 }
            ]
          : [];

      // Producto primero, luego existencias
      const columns = [
        { key: "_title", label: "Producto", transform: (r) => buildRowTitle(r, sheet), width: 32 },
        ...tipoHeaders,
        { key: "existencias", label: "Existencias", width: 14, align: "center" },
        { key: "codebar", label: "Codigo de Barras", width: 18 },
        { key: "sku", label: "Referencia", width: 14 }
      ];

      const totalStock = rows.reduce((s, r) => s + Number(r.existencias || 0), 0);
      await exportToXlsx({
        filename: `reporte_inventario_${String(sheet.nombre || "inventario").replace(/[^\w\-]+/g, "_")}_${sheet.tipo_matriz}_${todaySlug()}`,
        sheetName: String(sheet.nombre || "Inventario").slice(0, 31),
        title: `Inventario — ${sheetTitle(sheet)}`,
        subtitle: `${getMicaTypeName(sheet.tipo_matriz)}  |  ${prettyTrat(sheet.tratamientos)}`,
        columns,
        rows,
        summaryCards: [
          { label: "Productos", value: rows.length },
          { label: "Stock Total", value: totalStock },
          { label: "Tipo", value: getMicaTypeName(sheet.tipo_matriz) },
        ],
      });
      notify(`Inventario exportado: ${rows.length} filas`, "is-success", 2500);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar el inventario." })?.message, "is-danger");
    } finally {
      loadingExportInv.value = false;
    }
  }

  async function exportCatalogCsv() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    loadingExportCat.value = true;
    try {
      const rows = filteredCatalogRows.value;
      const tipo = sheet.tipo_matriz;
      const detailCols =
        tipo === "BASE"
          ? [{ key: "base", label: "Curva Base", width: 14 }]
          : tipo === "SPH_CYL"
          ? [
              { key: "sph", label: "Esfera", width: 14 },
              { key: "cyl", label: "Cilindro", width: 14 }
            ]
          : tipo === "SPH_ADD"
          ? [
              { key: "eye", label: "Ojo", transform: (r) => eyeLabel(r.eye), width: 16 },
              { key: "sph", label: "Esfera", width: 14 },
              { key: "add", label: "Adicion", width: 14 },
              { key: "base_izq", label: "Base Izquierda", width: 16 },
              { key: "base_der", label: "Base Derecha", width: 16 }
            ]
          : tipo === "BASE_ADD"
          ? [
              { key: "eye", label: "Ojo", transform: (r) => eyeLabel(r.eye), width: 16 },
              { key: "base_izq", label: "Base Izquierda", width: 16 },
              { key: "base_der", label: "Base Derecha", width: 16 },
              { key: "add", label: "Adicion", width: 14 }
            ]
          : [];
      const columns = [
        { key: "_title", label: "Producto", transform: (r) => buildRowTitle(r, sheet), width: 30 },
        ...detailCols,
        { key: "existencias", label: "Existencias", width: 14, align: "center" },
        { key: "codebar", label: "Codigo de Barras", width: 18 },
        { key: "sku", label: "Referencia", width: 14 }
      ];
      const totalStock = rows.reduce((s, r) => s + Number(r.existencias || 0), 0);
      await exportToXlsx({
        filename: `reporte_catalogo_${String(sheet.nombre || "catalogo").replace(/[^\w\-]+/g, "_")}_${sheet.tipo_matriz}_${todaySlug()}`,
        sheetName: "Catalogo",
        title: `Catalogo — ${sheetTitle(sheet)}`,
        subtitle: `${getMicaTypeName(sheet.tipo_matriz)}  |  ${prettyTrat(sheet.tratamientos)}`,
        columns,
        rows,
        summaryCards: [
          { label: "Productos", value: rows.length },
          { label: "Stock Total", value: totalStock },
        ],
      });
      notify(`Catalogo exportado: ${rows.length} productos`, "is-success", 2500);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar el catalogo." })?.message, "is-danger");
    } finally {
      loadingExportCat.value = false;
    }
  }

  async function exportOrdersCsv() {
    loadingExportOrders.value = true;
    try {
      const rows = ordersDB.value || [];
      const columns = [
        { key: "folio", label: "Folio", width: 16 },
        { key: "cliente", label: "Cliente", width: 22 },
        { key: "status", label: "Estatus", transform: (o) => statusHuman(o.status), width: 14 },
        { key: "createdAt", label: "Fecha de Creacion", transform: (o) => fmtShort(o.createdAt), width: 20 },
        { key: "_progress", label: "Entregados / Solicitados", transform: (o) => `${orderPickedCount(o)} de ${orderTotalCount(o)}`, width: 22 },
        { key: "_micas", label: "Total de Lentes", transform: (o) => String(o.lines?.length || 0), width: 16, align: "center" }
      ];
      await exportToXlsx({
        filename: `reporte_pedidos_${todaySlug()}`,
        sheetName: "Pedidos",
        title: "Reporte de Pedidos",
        columns,
        rows,
        summaryCards: [
          { label: "Pedidos", value: rows.length },
        ],
      });
      notify(`Pedidos exportados: ${rows.length} registros`, "is-success", 2500);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar pedidos." })?.message, "is-danger");
    } finally {
      loadingExportOrders.value = false;
    }
  }

  async function exportEntriesCsv(period = "day") {
    try {
      const from = getPeriodStart(period);
      const { data } = await listEvents({ type: "ORDER_CREATE", from: from.toISOString(), limit: 2000 });
      const rows = (Array.isArray(data?.data) ? data.data : []).map(mapEntryEvent);
      const columns = [
        { key: "folio", label: "Folio", width: 16 },
        { key: "cliente", label: "Cliente", width: 22 },
        { key: "at", label: "Fecha y Hora", width: 22 },
        { key: "linesTotal", label: "Total de Lentes", width: 16, align: "center" }
      ];
      const periodName = { day: "hoy", week: "semana", month: "mes", year: "ano" }[period] || period;
      await exportToXlsx({
        filename: `reporte_entradas_${periodName}_${todaySlug()}`,
        sheetName: "Entradas",
        title: `Reporte de Entradas — ${periodName}`,
        columns,
        rows,
        summaryCards: [
          { label: "Entradas", value: rows.length },
          { label: "Periodo", value: periodName },
        ],
      });
      notify(`Entradas (${periodName}): ${rows.length} registros exportados`, "is-success", 3000);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar entradas." })?.message, "is-danger");
    }
  }

  async function exportExitsCsv(period = "day") {
    try {
      const from = getPeriodStart(period);
      const { data } = await listEvents({ type: "EXIT_SCAN", from: from.toISOString(), limit: 2000 });
      const rows = (Array.isArray(data?.data) ? data.data : []).map(mapExitEvent);
      const columns = [
        { key: "folio", label: "Folio", width: 16 },
        { key: "title", label: "Producto", width: 28 },
        { key: "micaType", label: "Tipo de Lente", transform: (r) => getMicaTypeName(r.micaType), width: 20 },
        { key: "codebar", label: "Codigo de Barras", width: 18 },
        { key: "at", label: "Fecha y Hora", width: 22 }
      ];
      const periodName = { day: "hoy", week: "semana", month: "mes", year: "ano" }[period] || period;
      await exportToXlsx({
        filename: `reporte_salidas_${periodName}_${todaySlug()}`,
        sheetName: "Salidas",
        title: `Reporte de Salidas — ${periodName}`,
        columns,
        rows,
        summaryCards: [
          { label: "Salidas", value: rows.length },
          { label: "Periodo", value: periodName },
        ],
      });
      notify(`Salidas (${periodName}): ${rows.length} registros exportados`, "is-success", 3000);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar salidas." })?.message, "is-danger");
    }
  }

  async function exportOrderCsv(order) {
    const o = order || selectedOrder.value;
    if (!o?.id) return;

    try {
      const sheet = sheetById(o.sheetId);
      const columns = [
        { key: "_human", label: "Descripcion del Lente", transform: (l) => lineHuman(l, sheet), width: 30 },
        { key: "micaType", label: "Tipo de Lente", transform: (l) => getMicaTypeName(l.micaType), width: 20 },
        { key: "eye", label: "Ojo", transform: (l) => eyeLabel(l.eye), width: 16 },
        { key: "qty", label: "Cantidad Solicitada", width: 18, align: "center" },
        { key: "picked", label: "Cantidad Entregada", width: 18, align: "center" },
        { key: "codebar", label: "Codigo de Barras", width: 18 }
      ];
      const picked = orderPickedCount(o);
      const total = orderTotalCount(o);
      await exportToXlsx({
        filename: `pedido_${String(o.folio || o.id)}_${todaySlug()}`,
        sheetName: "Pedido",
        title: `Pedido — ${String(o.folio || o.id)}`,
        subtitle: `Cliente: ${o.cliente || "—"}  |  Estatus: ${statusHuman(o.status)}`,
        columns,
        rows: o.lines || [],
        summaryCards: [
          { label: "Folio", value: String(o.folio || o.id) },
          { label: "Cliente", value: o.cliente || "—" },
          { label: "Progreso", value: `${picked}/${total}` },
        ],
      });
      notify(`Pedido ${o.folio} exportado correctamente`, "is-success", 2500);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar el pedido." })?.message, "is-danger");
    }
  }

  function printBarcode(code) {
    const cb = String(code || "").trim();
    if (!cb) return;
    const svg = isEan13(cb) ? ean13SvgString(cb, 3, 120) : "";
    openPrintWindow({
      title: `Código de Barras · ${cb}`,
      bodyHtml: `
        <div class="info-grid">
          <div class="info-card">
            <div class="lbl">Código</div>
            <div class="val mono">${cb}</div>
          </div>
          <div class="info-card">
            <div class="lbl">Formato</div>
            <div class="val">${svg ? "EAN-13 válido" : "Código personalizado"}</div>
          </div>
        </div>
        <div class="box" style="text-align:center;padding:24px;">
          ${svg
            ? `<div style="margin-bottom:8px;">${svg}</div><div class="mono" style="font-size:16px;letter-spacing:4px;">${cb}</div>`
            : `<div class="mono" style="font-size:28px;letter-spacing:6px;margin-bottom:8px;">${cb}</div><div class="muted">Código no EAN-13 — se muestra sólo el número</div>`
          }
        </div>`
    });
  }

  function printCatalogPage() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    const rows = paginatedCatalog.value || [];
    const totalStock = rows.reduce((s, r) => s + Number(r.existencias || 0), 0);
    const bodyHtml = `
      <div class="info-grid">
        <div class="info-card">
          <div class="lbl">Planilla</div>
          <div class="val">${sheetTitle(sheet)}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Material</div>
          <div class="val">${sheet.material || "—"}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Tratamientos</div>
          <div class="val">${prettyTrat(sheet.tratamientos) || "—"}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Tipo de Lente</div>
          <div class="val">${getMicaTypeName(sheet.tipo_matriz)}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Pagina</div>
          <div class="val">${catalogPage.value} de ${catalogPages.value}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Stock Total (pagina)</div>
          <div class="val">${totalStock} unidades</div>
        </div>
      </div>
      <div class="box" style="padding:0;overflow:hidden;">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Detalles</th>
              <th class="center">Existencias</th>
              <th>Codigo de Barras</th>
              <th class="center">Codigo EAN-13</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => {
              const cb = String(r.codebar || "");
              const svg = cb && isEan13(cb) ? ean13SvgString(cb, 2, 70) : "";
              return `<tr>
                <td><div style="font-weight:600;">${buildRowTitle(r, sheet)}</div></td>
                <td style="font-size:11px;">${buildRowParams(r, sheet)}</td>
                <td class="center"><b>${Number(r.existencias || 0)}</b></td>
                <td class="mono">${cb || "—"}</td>
                <td class="center">${svg || `<span class="muted">—</span>`}</td>
              </tr>`;
            }).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">Total: ${rows.length} productos</td>
              <td class="center">${totalStock}</td>
              <td colspan="2">Stock total en esta pagina</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    openPrintWindow({ title: `Catálogo · ${sheetTitle(sheet)}`, bodyHtml });
  }

  function printOrder(order) {
    const o = order || selectedOrder.value;
    if (!o?.id) return;

    const sheet = sheetById(o.sheetId);
    const picked = orderPickedCount(o);
    const total = orderTotalCount(o);
    const pct = orderProgressPct(o);
    const statusClass = { pendiente: "badge-blue", parcial: "badge-yellow", cerrado: "badge-green", cancelado: "badge-red" }[o.status] || "badge-gray";

    const bodyHtml = `
      <div class="info-grid">
        <div class="info-card">
          <div class="lbl">Folio</div>
          <div class="val mono">${String(o.folio || o.id)}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Cliente</div>
          <div class="val">${String(o.cliente || "—")}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Estatus</div>
          <div class="val"><span class="badge ${statusClass}">${statusHuman(o.status)}</span></div>
        </div>
        <div class="info-card">
          <div class="lbl">Planilla</div>
          <div class="val">${sheetTitle(sheet)}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Fecha de Creación</div>
          <div class="val">${o.createdAtShort || fmtShort(o.createdAt)}</div>
        </div>
        <div class="info-card">
          <div class="lbl">Progreso de Entrega</div>
          <div class="val">${picked} de ${total} lentes (${pct}%)</div>
        </div>
      </div>
      ${o.note ? `<div class="note-box"><b>Observación:</b> ${sanitizeUserText(o.note)}</div>` : ""}
      <div class="box" style="padding:0;overflow:hidden;">
        <table>
          <thead>
            <tr>
              <th>Descripcion del Lente</th>
              <th>Tipo de Lente</th>
              <th>Ojo</th>
              <th class="right">Solicitados</th>
              <th class="right">Entregados</th>
              <th>Codigo de Barras</th>
              <th class="center">Codigo EAN-13</th>
            </tr>
          </thead>
          <tbody>
            ${(o.lines || []).map((l) => {
              const cb = String(l.codebar || "");
              const svg = cb && isEan13(cb) ? ean13SvgString(cb, 2, 60) : "";
              const pendiente = Number(l.qty || 0) - Number(l.picked || 0);
              return `<tr>
                <td><div style="font-weight:600;">${lineHuman(l, sheet)}</div></td>
                <td>${getMicaTypeName(l.micaType)}</td>
                <td>${eyeLabel(l.eye)}</td>
                <td class="right">${Number(l.qty || 0)}</td>
                <td class="right">${Number(l.picked || 0)}${pendiente > 0 ? ` <span class="muted" style="font-size:10px;">(faltan ${pendiente})</span>` : ""}</td>
                <td class="mono">${cb || "—"}</td>
                <td class="center">${svg || `<span class="muted">—</span>`}</td>
              </tr>`;
            }).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Total del pedido</td>
              <td class="right">${total}</td>
              <td class="right">${picked}</td>
              <td colspan="2">${pct}% entregado</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    openPrintWindow({ title: `Orden de Pedido · ${String(o.folio || o.id)}`, bodyHtml });
  }

  // ======= Watchers =======
  let tOrders = null;
  watch([orderStatusFilter, orderQuery], () => {
    if (tOrders) clearTimeout(tOrders);
    tOrders = setTimeout(() => loadOrders(), 250);
  });

  let tItems = null;
  watch([itemQuery], () => {
    if (tItems) clearTimeout(tItems);
    tItems = setTimeout(() => loadItems(), 250);
  });

  watch([includeDeleted, sheetQuery], () => loadSheets());
  // _isMounting previene que el watch dispare loadItems durante el mount inicial
  // (loadSheets setea selectedSheetId y causaría una carga duplicada)
  let _isMounting = false;
  watch([selectedSheetId], () => { if (!_isMounting) loadItems(); });

  async function refreshAll() {
    loadingRefreshAll.value = true;
    try {
      await Promise.all([loadSheets(), loadOrders(), loadItems(), loadEvents()]);
      notify("Datos actualizados.", "is-success", 2000);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo recargar los datos." })?.message, "is-danger");
    } finally {
      loadingRefreshAll.value = false;
    }
  }

  async function refreshItems() {
    await loadItems();
    notify("Inventario actualizado.", "is-info", 2000);
  }

  const LAB_WS_EVENTS = new Set(["LAB_ORDER_CREATE","LAB_ORDER_CANCEL","LAB_ORDER_CLOSE","LAB_ORDER_SCAN","LAB_ORDER_RESET"]);

  function _onWsEvent(e) {
    const type = e?.detail?.type;
    if (LAB_WS_EVENTS.has(type)) {
      loadOrders();
      loadEvents();
    }
  }

  onMounted(async () => {
    _isMounting = true;
    // sheets/orders/events en paralelo; items depende de selectedSheetId que setea loadSheets
    await Promise.all([loadSheets(), loadOrders(), loadEvents()]);
    await loadItems(); // una sola vez, ya con el sheetId correcto
    _isMounting = false;
    window.addEventListener("lab:ws", _onWsEvent);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("lab:ws", _onWsEvent);
  });

  return {
    // UI state
    activeMainTab,
    mode,
    includeDeleted,
    sheetQuery,
    selectedSheetId,
    itemQuery,
    stockFilter,
    catalogQuery,
    catalogFilter,
    catalogPage,
    catalogPageSize,
    catalogPages,
    paginatedCatalog,
    orderStatusFilter,
    orderQuery,
    selectedOrderId,
    scanCode,

    // modals
    barcodeOpen,
    barcodeValue,
    correctionOpen,
    correction,

    // db data
    sheetsDB,
    itemsDB,
    ordersDB,
    entryEvents,
    exitEvents,
    correctionEvents,

    // loaders globales
    loadingSheets,
    loadingItems,
    loadingOrders,
    loadingEvents,

    // loaders de acciones
    loadingCreateOrder,
    loadingCloseOrder,
    loadingScan,
    loadingReset,
    loadingSubmitCorrection,
    loadingRefreshAll,
    loadingExportInv,
    loadingExportCat,
    loadingExportOrders,
    loadingCancelOrder,
    loadingEditOrder,

    // computed
    lastUpdatedHuman,
    filteredSheets,
    selectedSheet,
    selectedSheetLabel,
    filteredItems,
    filteredCatalogRows,
    selectedOrder,
    recentSheets,
    totalCodes,
    canCreateOrder,
    todayEntries,

    // helpers
    sheetTitle,
    prettyTrat,
    sheetById,
    sheetNameById,
    buildRowTitle,
    buildRowParams,
    isEan13,
    statusHuman,
    statusTagClass,
    orderTotalCount,
    orderPickedCount,
    orderProgressPct,
    isOrderComplete,
    lineHuman,
    getMicaTypeName,

    // actions
    refreshAll,
    refreshItems,
    openBarcode,
    copyCodebar,
    draftCliente,
    draftNote,
    draftLines,
    addToDraft,
    clearDraft,
    removeDraftLine,
    incDraftQty,
    decDraftQty,
    createOrderFromDraft,
    scanAndDispatch,
    resetPickedForSelectedOrder,
    closeSelectedOrder,
    cancelOrderById,
    editOrder,
    submitCorrection,
    orderHistory,
    loadingOrderHistory,
    loadOrderHistory,

    // export/print
    exportInventoryCsv,
    exportCatalogCsv,
    exportOrdersCsv,
    exportOrderCsv,
    exportEntriesCsv,
    exportExitsCsv,
    printBarcode,
    printCatalogPage,
    printOrder
  };
}