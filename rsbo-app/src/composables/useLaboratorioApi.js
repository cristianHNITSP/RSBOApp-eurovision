import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/useLabToast.js";
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
  updateOrder as updateOrderService
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

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows, headers) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = headers.map((h) => esc(h.label)).join(",");
  const body = rows
    .map((r) =>
      headers
        .map((h) => {
          const raw = typeof h.transform === "function" ? h.transform(r) : r?.[h.key];
          return esc(raw);
        })
        .join(",")
    )
    .join("\n");
  return `${head}\n${body}\n`;
}

function openPrintWindow({ title, bodyHtml }) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${String(title || "Impresión")}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 16px; color: #111; }
    h1, h2, h3 { margin: 0 0 10px; }
    .muted { color: #555; }
    .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; vertical-align: top; }
    th { background: #f5f5f5; text-align: left; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .right { text-align: right; }
    .badge { display: inline-block; border: 1px solid #ddd; border-radius: 999px; padding: 2px 8px; font-size: 12px; margin-left: 8px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 10px;">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>
  ${bodyHtml || ""}
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
  BASE: "Monofocal (Base)",
  SPH_CYL: "Monofocal",
  SPH_ADD: "Bifocal",
  BASE_ADD: "Progresivo"
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

  const buildRowTitle = (row, sheet) => {
    const t = sheet?.tipo_matriz;
    if (t === "BASE") return `BASE ${Number(row.base ?? 0).toFixed(2)}`;
    if (t === "SPH_CYL") return `SPH ${Number(row.sph ?? 0).toFixed(2)} · CYL ${Number(row.cyl ?? 0).toFixed(2)}`;
    if (t === "SPH_ADD") return `${row.eye || ""} · SPH ${Number(row.sph ?? 0).toFixed(2)} · ADD ${Number(row.add ?? 0).toFixed(2)}`;
    if (t === "BASE_ADD")
      return `${row.eye || ""} · BI ${Number(row.base_izq ?? 0).toFixed(2)} · BD ${Number(row.base_der ?? 0).toFixed(2)} · ADD ${Number(row.add ?? 0).toFixed(2)}`;
    return "Producto";
  };

  const buildRowParams = (row, sheet) => {
    const t = sheet?.tipo_matriz;
    if (t === "BASE") return `base=${Number(row.base ?? 0).toFixed(2)}`;
    if (t === "SPH_CYL") return `sph=${Number(row.sph ?? 0).toFixed(2)} · cyl=${Number(row.cyl ?? 0).toFixed(2)}`;
    if (t === "SPH_ADD")
      return `sph=${Number(row.sph ?? 0).toFixed(2)} · add=${Number(row.add ?? 0).toFixed(2)} · bi=${Number(row.base_izq ?? 0).toFixed(2)} · bd=${Number(row.base_der ?? 0).toFixed(2)}`;
    if (t === "BASE_ADD")
      return `bi=${Number(row.base_izq ?? 0).toFixed(2)} · bd=${Number(row.base_der ?? 0).toFixed(2)} · add=${Number(row.add ?? 0).toFixed(2)}`;
    return "—";
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

  async function loadSheets() {
    loadingSheets.value = true;
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
    }
  }

  async function loadItems(forceSheetId) {
    const sid = forceSheetId || selectedSheetId.value;
    const sheet = sheetById(sid);
    if (!sheet?.id) {
      itemsDB.value = [];
      return;
    }

    loadingItems.value = true;
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
    }
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
    loadingOrders.value = true;
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
    }
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
    const eye = line?.eye || "";
    if (t === "BASE") return `BASE ${Number(p.base ?? 0).toFixed(2)}`;
    if (t === "SPH_CYL") return `SPH ${Number(p.sph ?? 0).toFixed(2)} · CYL ${Number(p.cyl ?? 0).toFixed(2)}`;
    if (t === "SPH_ADD") return `${eye} · SPH ${Number(p.sph ?? 0).toFixed(2)} · ADD ${Number(p.add ?? 0).toFixed(2)}`;
    if (t === "BASE_ADD") return `${eye} · BI ${Number(p.base_izq ?? 0).toFixed(2)} · BD ${Number(p.base_der ?? 0).toFixed(2)} · ADD ${Number(p.add ?? 0).toFixed(2)}`;
    return String(line?.codebar || "Línea");
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
    loadingEvents.value = true;
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
    }
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
  async function cancelOrderById(orderId) {
    if (!orderId) return;
    loadingCancelOrder.value = true;
    try {
      await cancelOrderService(orderId, actorRef());
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
  function exportInventoryCsv() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    loadingExportInv.value = true;
    try {
      const rows = filteredItems.value;
      const tipo = sheet.tipo_matriz;
      const baseHeaders = [
        { key: "existencias", label: "existencias" },
        { key: "codebar", label: "codebar" },
        { key: "sku", label: "sku" }
      ];

      const tipoHeaders =
        tipo === "BASE"
          ? [{ key: "base", label: "base" }]
          : tipo === "SPH_CYL"
          ? [
              { key: "sph", label: "sph" },
              { key: "cyl", label: "cyl" }
            ]
          : tipo === "SPH_ADD"
          ? [
              { key: "eye", label: "eye" },
              { key: "sph", label: "sph" },
              { key: "add", label: "add" },
              { key: "base_izq", label: "base_izq" },
              { key: "base_der", label: "base_der" }
            ]
          : tipo === "BASE_ADD"
          ? [
              { key: "eye", label: "eye" },
              { key: "base_izq", label: "base_izq" },
              { key: "base_der", label: "base_der" },
              { key: "add", label: "add" }
            ]
          : [];

      const headers = [
        ...baseHeaders,
        ...tipoHeaders,
        { key: "_title", label: "title", transform: (r) => buildRowTitle(r, sheet) }
      ];
      const csv = toCsv(rows, headers);
      downloadBlob(
        `inventario_${String(sheet.nombre || "inventario").replace(/[^\w\-]+/g, "_")}_${sheet.tipo_matriz}.csv`,
        new Blob([csv], { type: "text/csv;charset=utf-8" })
      );
      notify(`CSV exportado: ${rows.length} filas`, "is-success", 2500);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar el CSV." })?.message, "is-danger");
    } finally {
      loadingExportInv.value = false;
    }
  }

  function exportCatalogCsv() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    loadingExportCat.value = true;
    try {
      const rows = filteredCatalogRows.value;
      const headers = [
        { key: "existencias", label: "existencias" },
        { key: "codebar", label: "codebar" },
        { key: "sku", label: "sku" },
        { key: "_title", label: "title", transform: (r) => buildRowTitle(r, sheet) },
        { key: "_params", label: "params", transform: (r) => buildRowParams(r, sheet) }
      ];
      const csv = toCsv(rows, headers);
      downloadBlob(
        `catalogo_${String(sheet.nombre || "catalogo").replace(/[^\w\-]+/g, "_")}_${sheet.tipo_matriz}.csv`,
        new Blob([csv], { type: "text/csv;charset=utf-8" })
      );
      notify(`CSV catálogo exportado: ${rows.length} filas`, "is-success", 2500);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar el catálogo." })?.message, "is-danger");
    } finally {
      loadingExportCat.value = false;
    }
  }

  function exportOrdersCsv() {
    loadingExportOrders.value = true;
    try {
      const rows = ordersDB.value || [];
      const headers = [
        { key: "folio", label: "folio" },
        { key: "cliente", label: "cliente" },
        { key: "status", label: "status" },
        { key: "createdAt", label: "createdAt" },
        { key: "_progress", label: "progreso", transform: (o) => `${orderPickedCount(o)}/${orderTotalCount(o)}` },
        { key: "_micas", label: "micas", transform: (o) => String(o.lines?.length || 0) }
      ];
      downloadBlob(
        `pedidos_${new Date().toISOString().slice(0, 10)}.csv`,
        new Blob([toCsv(rows, headers)], { type: "text/csv;charset=utf-8" })
      );
      notify(`CSV pedidos exportado: ${rows.length} pedidos`, "is-success", 2500);
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
      const headers = [
        { key: "folio", label: "folio" },
        { key: "cliente", label: "cliente" },
        { key: "at", label: "fecha" },
        { key: "linesTotal", label: "micas" }
      ];
      const periodName = { day: "hoy", week: "semana", month: "mes", year: "año" }[period] || period;
      downloadBlob(
        `entradas_${periodName}_${new Date().toISOString().slice(0, 10)}.csv`,
        new Blob([toCsv(rows, headers)], { type: "text/csv;charset=utf-8" })
      );
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
      const headers = [
        { key: "folio", label: "folio" },
        { key: "codebar", label: "codebar" },
        { key: "title", label: "producto" },
        { key: "micaType", label: "tipo_mica" },
        { key: "at", label: "fecha" }
      ];
      const periodName = { day: "hoy", week: "semana", month: "mes", year: "año" }[period] || period;
      downloadBlob(
        `salidas_${periodName}_${new Date().toISOString().slice(0, 10)}.csv`,
        new Blob([toCsv(rows, headers)], { type: "text/csv;charset=utf-8" })
      );
      notify(`Salidas (${periodName}): ${rows.length} registros exportados`, "is-success", 3000);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar salidas." })?.message, "is-danger");
    }
  }

  function exportOrderCsv(order) {
    const o = order || selectedOrder.value;
    if (!o?.id) return;

    try {
      const sheet = sheetById(o.sheetId);
      const headers = [
        { key: "codebar", label: "codebar" },
        { key: "qty", label: "qty" },
        { key: "picked", label: "picked" },
        { key: "_human", label: "mica", transform: (l) => lineHuman(l, sheet) },
        { key: "micaType", label: "tipo_mica" },
        { key: "eye", label: "eye" },
        { key: "_params", label: "params", transform: (l) => JSON.stringify(l?.params || {}) }
      ];
      downloadBlob(
        `pedido_${String(o.folio || o.id)}.csv`,
        new Blob([toCsv(o.lines || [], headers)], { type: "text/csv;charset=utf-8" })
      );
      notify(`CSV pedido ${o.folio} exportado`, "is-success", 2500);
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "No se pudo exportar el pedido." })?.message, "is-danger");
    }
  }

  function printBarcode(code) {
    const cb = String(code || "").trim();
    if (!cb) return;
    const svg = isEan13(cb) ? ean13SvgString(cb, 3, 120) : "";
    openPrintWindow({
      title: `Barcode ${cb}`,
      bodyHtml: `<h2>Código de barras</h2><div class="box"><div class="mono" style="font-size:16px;margin-bottom:10px;">${cb}</div>${
        svg || `<div class="muted">Código inválido para EAN-13</div>`
      }</div>`
    });
  }

  function printCatalogPage() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    const rows = paginatedCatalog.value || [];
    const bodyHtml = `<h2>Catálogo (página ${catalogPage.value}/${catalogPages.value}) <span class="badge">${sheet.tipo_matriz}</span></h2>
      <div class="muted">${sheetTitle(sheet)} · ${sheet.material || ""} · ${prettyTrat(sheet.tratamientos)}</div>
      <div class="box"><table><thead><tr><th>existencias</th><th>producto</th><th>codebar</th><th>barcode</th></tr></thead>
      <tbody>${rows
        .map((r) => {
          const cb = String(r.codebar || "");
          const svg = cb && isEan13(cb) ? ean13SvgString(cb, 2, 80) : "";
          return `<tr><td class="right">${Number(r.existencias || 0)}</td><td>${buildRowTitle(r, sheet)}<div class="muted">${buildRowParams(r, sheet)}</div></td><td class="mono">${cb || "—"}</td><td>${svg || `<span class="muted">—</span>`}</td></tr>`;
        })
        .join("")}</tbody></table></div>`;

    openPrintWindow({ title: `Catálogo ${sheetTitle(sheet)}`, bodyHtml });
  }

  function printOrder(order) {
    const o = order || selectedOrder.value;
    if (!o?.id) return;

    const sheet = sheetById(o.sheetId);
    const bodyHtml = `<h2>Pedido <span class="mono">${String(o.folio || o.id)}</span> <span class="badge">${statusHuman(o.status)}</span></h2>
      <div class="muted">Cliente: <b>${String(o.cliente || "—")}</b> · Planilla: <b>${sheetTitle(sheet)}</b> · Creado: ${o.createdAtShort || fmtShort(o.createdAt)}</div>
      ${o.note ? `<div class="box"><b>Nota:</b> ${sanitizeUserText(o.note)}</div>` : ""}
      <div class="box"><div class="muted">Progreso: <b>${orderPickedCount(o)}/${orderTotalCount(o)}</b> (${orderProgressPct(o)}%)</div>
      <table><thead><tr><th>Mica</th><th>Tipo</th><th class="right">qty</th><th class="right">picked</th><th>codebar</th><th>barcode</th></tr></thead>
      <tbody>${(o.lines || [])
        .map((l) => {
          const cb = String(l.codebar || "");
          const svg = cb && isEan13(cb) ? ean13SvgString(cb, 2, 70) : "";
          return `<tr><td>${lineHuman(l, sheet)}</td><td>${l.micaType || "—"}</td><td class="right">${Number(l.qty || 0)}</td><td class="right">${Number(l.picked || 0)}</td><td class="mono">${cb || "—"}</td><td>${svg || `<span class="muted">—</span>`}</td></tr>`;
        })
        .join("")}</tbody></table></div>`;

    openPrintWindow({ title: `Pedido ${String(o.folio || o.id)}`, bodyHtml });
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
  watch([selectedSheetId], () => loadItems());

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
    await Promise.all([loadSheets(), loadOrders(), loadItems(), loadEvents()]);
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