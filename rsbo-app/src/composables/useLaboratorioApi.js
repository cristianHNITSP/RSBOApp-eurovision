// src/composables/useLaboratorioApi.js
import { ref, reactive, computed, watch, onMounted } from "vue";
import { listSheets as invListSheets, fetchItems as invFetchItems } from "@/services/inventory";
import { listOrders, createOrder, scanOrder, closeOrder, resetOrder, listEvents, requestCorrection } from "@/services/laboratorio";

/* ===================== Helpers ===================== */

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
    minute: "2-digit",
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
  // headers: [{ key, label, transform? }]
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

  // Sin CSS externo; solo inline mínimo para legibilidad en impresión.
  w.document.open();
  w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${String(title || "Impresión")}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:Arial,Helvetica,sans-serif;padding:16px;color:#111}
    h1,h2,h3{margin:0 0 10px}
    .muted{color:#555}
    .box{border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #ddd;padding:8px;font-size:12px;vertical-align:top}
    th{background:#f5f5f5;text-align:left}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
    .right{text-align:right}
    .badge{display:inline-block;border:1px solid #ddd;border-radius:999px;padding:2px 8px;font-size:12px;margin-left:8px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    @media print{ .no-print{display:none} }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:10px;">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>
  ${bodyHtml || ""}
</body>
</html>`);
  w.document.close();
  w.focus();
}

/* ===================== Barcode (EAN-13) for printing ===================== */

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

function checksumEan13(d12) {
  const digits = d12.split("").map((x) => Number(x));
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const pos = i + 1;
    const w = pos % 2 === 0 ? 3 : 1;
    sum += digits[i] * w;
  }
  const mod = sum % 10;
  return (10 - mod) % 10;
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
  const d12 = d.slice(0, 12);
  const chk = Number(d[12]);
  return chk === checksumEan13(d12);
}

// Genera SVG string (para impresión)
function ean13SvgString(value, scale = 2, height = 90) {
  const quiet = 10;

  const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
  const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
  const R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
  const PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

  const ean = normalizeEan13(value);
  if (!ean) return "";

  const first = Number(ean[0]);
  const left = ean.slice(1, 7).split("").map(Number);
  const right = ean.slice(7, 13).split("").map(Number);

  const parity = PARITY[first];
  let bits = "101";
  for (let i = 0; i < 6; i++) {
    const d = left[i];
    bits += parity[i] === "L" ? L[d] : G[d];
  }
  bits += "01010";
  for (let i = 0; i < 6; i++) bits += R[right[i]];
  bits += "101";

  const isGuardBit = (i) => (i >= 0 && i <= 2) || (i >= 45 && i <= 49) || (i >= 92 && i <= 94);

  const sc = Math.max(1, Number(scale || 2));
  const normalH = Math.max(40, Number(height || 90));
  const guardH = normalH + 10;
  const textH = 18;

  const totalModules = bits.length + quiet * 2;
  const w = totalModules * sc;
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
    } else if (bit === "1" && runStart !== -1) {
      if (runGuard !== guard) {
        rects.push({ start: runStart, end: i - 1, guard: runGuard });
        runStart = i;
        runGuard = guard;
      }
    } else if (bit === "0" && runStart !== -1) {
      rects.push({ start: runStart, end: i - 1, guard: runGuard });
      runStart = -1;
    }
  }
  if (runStart !== -1) rects.push({ start: runStart, end: bits.length - 1, guard: runGuard });

  const rectsSvg = rects
    .map((r) => {
      const x = (quiet + r.start) * sc;
      const y = 6;
      const width = (r.end - r.start + 1) * sc;
      const height = r.guard ? guardH : normalH;
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#000" />`;
    })
    .join("");

  return `
<svg width="${w}" height="${hSvg}" viewBox="0 0 ${w} ${hSvg}" role="img" aria-label="Barcode EAN-13" style="display:block">
  <rect x="0" y="0" width="${w}" height="${hSvg}" fill="#fff"></rect>
  ${rectsSvg}
  <text x="${w / 2}" y="${guardH + textH}" text-anchor="middle" font-size="14" fill="#111"
    font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">${ean}</text>
</svg>`;
}

/* ===================== Composable ===================== */

export function useLaboratorioApi() {
  // UI
  const activeMainTab = ref("pedidos");
  const mode = ref("crear");

  const includeDeleted = ref(false);
  const sheetQuery = ref("");

  const selectedSheetId = ref("");
  const itemsLimit = ref(5000);
  const itemQuery = ref("");
  const stockFilter = ref("withStock");

  const catalogQuery = ref("");
  const catalogFilter = ref("withStock");
  const catalogPage = ref(1);
  const catalogPageSize = ref(18);

  // filtros backend (pedidos)
  const orderStatusFilter = ref("pendiente");
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

  // eventos persistentes (DB)
  const entryEvents = ref([]);
  const exitEvents = ref([]);
  const correctionEvents = ref([]);

  // loaders
  const loadingSheets = ref(false);
  const loadingItems = ref(false);
  const loadingOrders = ref(false);
  const loadingEvents = ref(false);

  const lastUpdatedAt = ref(Date.now());

  // actor (sin hardcode: intenta sacar del storage; si no, backend usa system)
  const actorRef = () => {
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

  // helpers
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
  const selectedSheetLabel = computed(() => (selectedSheet.value ? sheetTitle(selectedSheet.value) : "Sin planilla"));

  const lastUpdatedHuman = computed(() => {
    const ms = Date.now() - Number(lastUpdatedAt.value || Date.now());
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h`;
  });

  // ======= Presentación de fila =======
  const buildRowTitle = (row, sheet) => {
    const t = sheet?.tipo_matriz;
    if (t === "BASE") return `BASE ${Number(row.base ?? 0).toFixed(2)}`;
    if (t === "SPH_CYL") return `SPH ${Number(row.sph ?? 0).toFixed(2)} · CYL ${Number(row.cyl ?? 0).toFixed(2)}`;
    if (t === "SPH_ADD") return `${row.eye || ""} · SPH ${Number(row.sph ?? 0).toFixed(2)} · ADD ${Number(row.add ?? 0).toFixed(2)}`;
    if (t === "BASE_ADD") return `${row.eye || ""} · BI ${Number(row.base_izq ?? 0).toFixed(2)} · BD ${Number(row.base_der ?? 0).toFixed(2)} · ADD ${Number(row.add ?? 0).toFixed(2)}`;
    return "Producto";
  };

  const buildRowParams = (row, sheet) => {
    const t = sheet?.tipo_matriz;
    if (t === "BASE") return `base=${Number(row.base ?? 0).toFixed(2)}`;
    if (t === "SPH_CYL") return `sph=${Number(row.sph ?? 0).toFixed(2)} · cyl=${Number(row.cyl ?? 0).toFixed(2)}`;
    if (t === "SPH_ADD") return `sph=${Number(row.sph ?? 0).toFixed(2)} · add=${Number(row.add ?? 0).toFixed(2)} · bi=${Number(row.base_izq ?? 0).toFixed(2)} · bd=${Number(row.base_der ?? 0).toFixed(2)}`;
    if (t === "BASE_ADD") return `bi=${Number(row.base_izq ?? 0).toFixed(2)} · bd=${Number(row.base_der ?? 0).toFixed(2)} · add=${Number(row.add ?? 0).toFixed(2)}`;
    return "—";
  };

  // ======= Sheets =======
  const normalizeSheet = (s) => {
    const id = String(s?._id ?? s?.id ?? "");
    const updatedByName =
      s?.updatedBy?.name ||
      s?.updatedBy?.nombre ||
      (typeof s?.updatedBy === "string" ? s.updatedBy : "") ||
      "";

    return {
      ...s,
      id,
      nombre: s?.nombre ?? s?.name ?? "",
      name: s?.nombre ?? s?.name ?? "",
      tratamientos: Array.isArray(s?.tratamientos) ? s.tratamientos : [],
      updatedByName,
    };
  };

  async function loadSheets() {
    loadingSheets.value = true;
    try {
      const params = {
        includeDeleted: includeDeleted.value ? "true" : "false",
        q: String(sheetQuery.value || "").trim() || undefined,
      };

      const { data } = await invListSheets(params);

      // tu inventory suele regresar { ok, data: [...] } o { data: [...] }
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const mapped = arr.map(normalizeSheet);

      mapped.sort((a, b) => {
        const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return db - da;
      });

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

  // ======= Items (DB) =======
  async function loadItems(forceSheetId) {
    const sid = forceSheetId || selectedSheetId.value;
    const sheet = sheetById(sid);
    if (!sheet?.id) {
      itemsDB.value = [];
      return;
    }

    loadingItems.value = true;
    try {
      // Si tu backend ignora q/stock, no pasa nada.
      const params = {
        limit: Number(itemsLimit.value || 5000),
        q: String(itemQuery.value || "").trim() || undefined,
        stock: String(stockFilter.value || "") || undefined,
      };

      const { data } = await invFetchItems(sheet.id, params);

      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      itemsDB.value = rows.map((r, idx) => ({
        ...r,
        _k: String(r.codebar || "") ? `${r.codebar}` : `row_${idx}`,
        existencias: Number(r.existencias || 0),
      }));

      lastUpdatedAt.value = Date.now();
    } catch (e) {
      console.error("[LAB] loadItems", e?.response?.data || e);
      itemsDB.value = [];
    } finally {
      loadingItems.value = false;
    }
  }

  // ======= Orders (DB, filtros backend) =======
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
      })),
    };
  };

  async function loadOrders() {
    loadingOrders.value = true;
    try {
      const params = {
        status: String(orderStatusFilter.value || "all"),
        q: String(orderQuery.value || "").trim() || undefined,
        limit: 200,
      };

      const { data } = await listOrders(params);
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const mapped = arr.map(normalizeOrder);

      mapped.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      ordersDB.value = mapped;

      if (!selectedOrderId.value && mapped.length) selectedOrderId.value = mapped[0].id;
      if (selectedOrderId.value && !mapped.find((x) => x.id === selectedOrderId.value) && mapped.length) selectedOrderId.value = mapped[0].id;

      lastUpdatedAt.value = Date.now();
    } catch (e) {
      console.error("[LAB] loadOrders", e?.response?.data || e);
      ordersDB.value = [];
    } finally {
      loadingOrders.value = false;
    }
  }

  const selectedOrder = computed(() => ordersDB.value.find((o) => o.id === selectedOrderId.value) || null);

  // si seleccionas pedido en surtir, cambia la planilla
  watch(selectedOrderId, (id) => {
    const o = ordersDB.value.find((x) => x.id === id);
    if (!o) return;
    if (mode.value === "surtir" && o.sheetId) selectedSheetId.value = o.sheetId;
  });

  // ======= Status helpers =======
  const statusHuman = (s) =>
    ({ pendiente: "Pendiente", parcial: "Parcial", cerrado: "Cerrado", cancelado: "Cancelado" }[s] || s);

  const statusTagClass = (s) =>
    ({ pendiente: "is-warning", parcial: "is-info", cerrado: "is-success", cancelado: "is-danger" }[s] || "is-light");

  const orderTotalCount = (o) => (o?.lines || []).reduce((acc, l) => acc + Number(l.qty || 0), 0);
  const orderPickedCount = (o) => (o?.lines || []).reduce((acc, l) => acc + Math.min(Number(l.picked || 0), Number(l.qty || 0)), 0);

  const orderProgressPct = (o) => {
    const t = orderTotalCount(o);
    if (t <= 0) return 0;
    return Math.round((orderPickedCount(o) / t) * 100);
  };

  const isOrderComplete = (o) => (o?.lines || []).every((l) => Number(l.picked || 0) >= Number(l.qty || 0));

  const lineHuman = (line, sheet) => {
    const t = sheet?.tipo_matriz;
    const p = line?.params || {};
    const eye = line?.eye || "";
    if (t === "BASE") return `BASE ${Number(p.base ?? 0).toFixed(2)}`;
    if (t === "SPH_CYL") return `SPH ${Number(p.sph ?? 0).toFixed(2)} · CYL ${Number(p.cyl ?? 0).toFixed(2)}`;
    if (t === "SPH_ADD") return `${eye} · SPH ${Number(p.sph ?? 0).toFixed(2)} · ADD ${Number(p.add ?? 0).toFixed(2)}`;
    if (t === "BASE_ADD") return `${eye} · BI ${Number(p.base_izq ?? 0).toFixed(2)} · BD ${Number(p.base_der ?? 0).toFixed(2)} · ADD ${Number(p.add ?? 0).toFixed(2)}`;
    return String(line?.codebar || "Línea");
  };

  // ======= Eventos (DB) =======
  const mapEntryEvent = (e) => ({
    id: String(e._id || e.id),
    folio: e?.details?.folio || "—",
    at: fmtShort(e?.createdAt),
    cliente: e?.details?.cliente || "—",
    sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
    linesTotal: Number(e?.details?.linesTotal || 0),
  });

  const mapExitEvent = (e) => ({
    id: String(e._id || e.id),
    folio: e?.details?.folio || "—",
    at: fmtShort(e?.createdAt),
    sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
    codebar: e?.details?.codebar || "",
    title: e?.details?.title || "Salida",
  });

  const mapCorrectionEvent = (e) => ({
    id: String(e._id || e.id),
    folio: e?.details?.folio || "—",
    at: fmtShort(e?.createdAt),
    sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
    codebar: e?.details?.codebar || "",
    message: e?.details?.message || "",
  });

  async function loadEvents() {
    loadingEvents.value = true;
    try {
      const limit = 50;

      const [en, ex, co] = await Promise.all([
        listEvents({ type: "ORDER_CREATE", limit }),
        listEvents({ type: "EXIT_SCAN", limit }),
        listEvents({ type: "CORRECTION_REQUEST", limit }),
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

  /* ===================== Draft (crear pedido) ===================== */

  const draftCliente = ref("");
  const draftNote = ref("");
  const draftLines = ref([]);

  const canCreateOrder = computed(() => {
    return !!selectedSheetId.value && draftLines.value.length > 0 && String(draftCliente.value || "").trim().length > 0;
  });

  const clearDraft = () => (draftLines.value = []);

  const addToDraft = (row) => {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    const cb = String(row?.codebar || "").trim();
    if (!cb) return;

    const key = cb;
    const found = draftLines.value.find((x) => x.key === key);
    if (found) {
      const next = Math.min(Number(found.qty || 1) + 1, Number(found.stock || 999999));
      found.qty = next;
      return;
    }

    draftLines.value.push({
      key,
      codebar: cb,
      title: buildRowTitle(row, sheet),
      qty: 1,
      stock: Number(row.existencias || 0),
    });
  };

  const removeDraftLine = (key) => {
    draftLines.value = draftLines.value.filter((x) => x.key !== key);
  };

  const incDraftQty = (key) => {
    const l = draftLines.value.find((x) => x.key === key);
    if (!l) return;
    const next = Math.min(Number(l.qty || 1) + 1, Number(l.stock || 999999));
    l.qty = next;
  };

  const decDraftQty = (key) => {
    const l = draftLines.value.find((x) => x.key === key);
    if (!l) return;
    l.qty = Math.max(1, Number(l.qty || 1) - 1);
  };

  async function createOrderFromDraft() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;
    if (!canCreateOrder.value) return;

    const payload = {
      sheetId: sheet.id,
      cliente: String(draftCliente.value || "").trim(),
      note: String(draftNote.value || "").trim(),
      lines: draftLines.value.map((l) => ({ codebar: l.codebar, qty: Number(l.qty || 1) })),
      actor: actorRef(),
    };

    const { data } = await createOrder(payload);
    const order = normalizeOrder(data?.data);

    await Promise.all([loadOrders(), loadEvents()]);

    selectedOrderId.value = order.id;
    mode.value = "surtir";
    selectedSheetId.value = order.sheetId;

    clearDraft();
    draftCliente.value = "";
    draftNote.value = "";

    await loadItems(order.sheetId);
    lastUpdatedAt.value = Date.now();
  }

  /* ===================== Surtir / acciones ===================== */

  async function scanAndDispatch() {
    const order = selectedOrder.value;
    if (!order?.id) return;

    const cb = String(scanCode.value || "").trim();
    if (!cb) return;

    const { data } = await scanOrder(order.id, { codebar: cb, qty: 1, actor: actorRef() });
    const updated = normalizeOrder(data?.data);

    const idx = ordersDB.value.findIndex((x) => x.id === updated.id);
    if (idx >= 0) ordersDB.value[idx] = updated;

    selectedSheetId.value = updated.sheetId;
    await Promise.all([loadItems(updated.sheetId), loadEvents()]);

    scanCode.value = "";
    lastUpdatedAt.value = Date.now();
  }

  async function resetPickedForSelectedOrder() {
    const order = selectedOrder.value;
    if (!order?.id) return;

    const { data } = await resetOrder(order.id, actorRef());
    const updated = normalizeOrder(data?.data);

    const idx = ordersDB.value.findIndex((x) => x.id === updated.id);
    if (idx >= 0) ordersDB.value[idx] = updated;

    selectedSheetId.value = updated.sheetId;
    await Promise.all([loadItems(updated.sheetId), loadEvents()]);

    lastUpdatedAt.value = Date.now();
  }

  async function closeSelectedOrder() {
    const order = selectedOrder.value;
    if (!order?.id) return;
    if (!isOrderComplete(order)) return;

    const { data } = await closeOrder(order.id, actorRef());
    const updated = normalizeOrder(data?.data);

    const idx = ordersDB.value.findIndex((x) => x.id === updated.id);
    if (idx >= 0) ordersDB.value[idx] = updated;

    await loadEvents();
    lastUpdatedAt.value = Date.now();
  }

  /* ===================== Correcciones (DB) ===================== */

  watch(correctionOpen, (open) => {
    if (open) {
      // precarga order
      correction.orderId = correction.orderId || selectedOrderId.value || "";
    }
  });

  async function submitCorrection() {
    const orderId = correction.orderId || selectedOrderId.value;
    const message = String(correction.message || "").trim();
    const codebar = String(correction.codebar || "").trim() || null;
    if (!orderId || message.length < 3) return;

    await requestCorrection({ orderId, codebar, message, actor: actorRef() });

    correctionOpen.value = false;
    correction.orderId = "";
    correction.codebar = "";
    correction.message = "";

    await loadEvents();
    lastUpdatedAt.value = Date.now();
  }

  /* ===================== Computed: filtros UI (sobre datos DB) ===================== */

  const filteredSheets = computed(() => sheetsDB.value);

  const filteredItems = computed(() => {
    const sheet = selectedSheet.value;
    const rows = Array.isArray(itemsDB.value) ? itemsDB.value : [];

    const q = normTxt(itemQuery.value);
    const filter = String(stockFilter.value || "withStock");

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

  watch([catalogQuery, catalogFilter], () => (catalogPage.value = 1));

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
      _k: String(r.codebar || "") ? `${r.codebar}__${idx}` : `row_${idx}`,
    }));
  });

  const catalogPages = computed(() => {
    const total = filteredCatalogRows.value.length;
    return Math.max(1, Math.ceil(total / Number(catalogPageSize.value || 18)));
  });

  const paginatedCatalog = computed(() => {
    const page = Math.min(Math.max(1, Number(catalogPage.value || 1)), catalogPages.value);
    const per = Number(catalogPageSize.value || 18);
    const start = (page - 1) * per;
    return filteredCatalogRows.value.slice(start, start + per);
  });

  const totalCodes = computed(() => {
    const rows = itemsDB.value || [];
    let n = 0;
    for (const r of rows) if (r?.codebar && isEan13(r.codebar)) n++;
    return n;
  });

  const recentSheets = computed(() => {
    const arr = (sheetsDB.value || []).slice(0, 10);
    return arr.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      sku: s.sku || null,
      material: s.material || "",
      tratamientos: Array.isArray(s.tratamientos) ? s.tratamientos : [],
      updatedAtShort: fmtShort(s.updatedAt || s.createdAt),
      updatedBy: s.updatedByName || "—",
    }));
  });

  /* ===================== Acciones UI: Barcode modal ===================== */

  const openBarcode = (code) => {
    barcodeValue.value = String(code || "");
    barcodeOpen.value = true;
  };

  const copyCodebar = async (code) => {
    const text = String(code || "");
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  /* ===================== Export / Print ===================== */

  function exportInventoryCsv() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    const rows = filteredItems.value; // lo que estás viendo
    const tipo = sheet.tipo_matriz;

    const baseHeaders = [
      { key: "existencias", label: "existencias" },
      { key: "codebar", label: "codebar" },
      { key: "sku", label: "sku" },
    ];

    const tipoHeaders =
      tipo === "BASE"
        ? [{ key: "base", label: "base" }]
        : tipo === "SPH_CYL"
        ? [
            { key: "sph", label: "sph" },
            { key: "cyl", label: "cyl" },
          ]
        : tipo === "SPH_ADD"
        ? [
            { key: "eye", label: "eye" },
            { key: "sph", label: "sph" },
            { key: "add", label: "add" },
            { key: "base_izq", label: "base_izq" },
            { key: "base_der", label: "base_der" },
          ]
        : tipo === "BASE_ADD"
        ? [
            { key: "eye", label: "eye" },
            { key: "base_izq", label: "base_izq" },
            { key: "base_der", label: "base_der" },
            { key: "add", label: "add" },
          ]
        : [];

    const headers = [...baseHeaders, ...tipoHeaders, { key: "_title", label: "title", transform: (r) => buildRowTitle(r, sheet) }];

    const csv = toCsv(rows, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const safeName = String(sheet.nombre || sheet.name || "inventario").replace(/[^\w\-]+/g, "_");
    downloadBlob(`inventario_${safeName}_${sheet.tipo_matriz}.csv`, blob);
  }

  function exportCatalogCsv() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    const rows = filteredCatalogRows.value; // lo filtrado en catálogo
    const headers = [
      { key: "existencias", label: "existencias" },
      { key: "codebar", label: "codebar" },
      { key: "sku", label: "sku" },
      { key: "_title", label: "title", transform: (r) => buildRowTitle(r, sheet) },
      { key: "_params", label: "params", transform: (r) => buildRowParams(r, sheet) },
    ];

    const csv = toCsv(rows, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const safeName = String(sheet.nombre || sheet.name || "catalogo").replace(/[^\w\-]+/g, "_");
    downloadBlob(`catalogo_${safeName}_${sheet.tipo_matriz}.csv`, blob);
  }

  function exportOrdersCsv() {
    const rows = ordersDB.value || [];
    const headers = [
      { key: "folio", label: "folio" },
      { key: "cliente", label: "cliente" },
      { key: "status", label: "status" },
      { key: "sheetId", label: "sheetId" },
      { key: "createdAt", label: "createdAt" },
      { key: "_progress", label: "progress", transform: (o) => `${orderPickedCount(o)}/${orderTotalCount(o)}` },
    ];
    const csv = toCsv(rows, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(`pedidos_${new Date().toISOString().slice(0, 10)}.csv`, blob);
  }

  function exportOrderCsv(order) {
    const o = order || selectedOrder.value;
    if (!o?.id) return;

    const sheet = sheetById(o.sheetId);
    const headers = [
      { key: "codebar", label: "codebar" },
      { key: "qty", label: "qty" },
      { key: "picked", label: "picked" },
      { key: "_human", label: "line", transform: (l) => lineHuman(l, sheet) },
      { key: "eye", label: "eye" },
      { key: "_params", label: "params", transform: (l) => JSON.stringify(l?.params || {}) },
    ];

    const csv = toCsv(o.lines || [], headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(`pedido_${String(o.folio || o.id)}.csv`, blob);
  }

  function printBarcode(code) {
    const cb = String(code || "").trim();
    if (!cb) return;

    const svg = isEan13(cb) ? ean13SvgString(cb, 3, 120) : "";
    const bodyHtml = `
      <h2>Código de barras</h2>
      <div class="box">
        <div class="mono" style="font-size:16px;margin-bottom:10px;">${cb}</div>
        ${svg ? svg : `<div class="muted">Código inválido para EAN-13</div>`}
      </div>
    `;
    openPrintWindow({ title: `Barcode ${cb}`, bodyHtml });
  }

  function printCatalogPage() {
    const sheet = selectedSheet.value;
    if (!sheet?.id) return;

    const rows = paginatedCatalog.value || [];
    const bodyHtml = `
      <h2>Catálogo (página ${catalogPage.value}/${catalogPages.value}) <span class="badge">${sheet.tipo_matriz}</span></h2>
      <div class="muted">${sheetTitle(sheet)} · ${sheet.material || ""} · ${prettyTrat(sheet.tratamientos)}</div>
      <div class="box">
        <table>
          <thead>
            <tr>
              <th>existencias</th>
              <th>producto</th>
              <th>codebar</th>
              <th>barcode</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((r) => {
                const cb = String(r.codebar || "");
                const svg = cb && isEan13(cb) ? ean13SvgString(cb, 2, 80) : "";
                return `
                  <tr>
                    <td class="right">${Number(r.existencias || 0)}</td>
                    <td>${buildRowTitle(r, sheet)}<div class="muted">${buildRowParams(r, sheet)}</div></td>
                    <td class="mono">${cb || "—"}</td>
                    <td>${svg || `<span class="muted">—</span>`}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    openPrintWindow({ title: `Catálogo ${sheetTitle(sheet)}`, bodyHtml });
  }

  function printOrder(order) {
    const o = order || selectedOrder.value;
    if (!o?.id) return;

    const sheet = sheetById(o.sheetId);
    const bodyHtml = `
      <h2>Pedido <span class="mono">${String(o.folio || o.id)}</span> <span class="badge">${statusHuman(o.status)}</span></h2>
      <div class="muted">
        Cliente: <b>${String(o.cliente || "—")}</b> · Planilla: <b>${sheetTitle(sheet)}</b> · Creado: ${o.createdAtShort || fmtShort(o.createdAt)}
      </div>

      ${o.note ? `<div class="box"><b>Nota:</b> ${String(o.note)}</div>` : ""}

      <div class="box">
        <div class="muted">Progreso: <b>${orderPickedCount(o)}/${orderTotalCount(o)}</b> (${orderProgressPct(o)}%)</div>
        <table>
          <thead>
            <tr>
              <th>Línea</th>
              <th class="right">qty</th>
              <th class="right">picked</th>
              <th>codebar</th>
              <th>barcode</th>
            </tr>
          </thead>
          <tbody>
            ${(o.lines || [])
              .map((l) => {
                const cb = String(l.codebar || "");
                const svg = cb && isEan13(cb) ? ean13SvgString(cb, 2, 70) : "";
                return `
                  <tr>
                    <td>${lineHuman(l, sheet)}<div class="muted">${l.eye ? `eye=${l.eye} · ` : ""}${cb}</div></td>
                    <td class="right">${Number(l.qty || 0)}</td>
                    <td class="right">${Number(l.picked || 0)}</td>
                    <td class="mono">${cb || "—"}</td>
                    <td>${svg || `<span class="muted">—</span>`}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    openPrintWindow({ title: `Pedido ${String(o.folio || o.id)}`, bodyHtml });
  }

  /* ===================== Watchers (reload real DB) ===================== */

  let tOrders = null;
  watch([orderStatusFilter, orderQuery], () => {
    if (tOrders) clearTimeout(tOrders);
    tOrders = setTimeout(() => loadOrders(), 250);
  });

  let tItems = null;
  watch([itemQuery, stockFilter], () => {
    if (tItems) clearTimeout(tItems);
    tItems = setTimeout(() => loadItems(), 250);
  });

  watch([includeDeleted, sheetQuery], () => loadSheets());
  watch([selectedSheetId, itemsLimit], () => loadItems());

  async function refreshAll() {
    await Promise.all([loadSheets(), loadOrders(), loadItems(), loadEvents()]);
  }

  async function refreshItems() {
    await loadItems();
  }

  onMounted(async () => {
    await refreshAll();
  });

  return {
    // UI state
    activeMainTab,
    mode,
    includeDeleted,
    sheetQuery,
    selectedSheetId,
    itemsLimit,
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

    // loaders
    loadingSheets,
    loadingItems,
    loadingOrders,
    loadingEvents,

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

    submitCorrection,

    // export/print
    exportInventoryCsv,
    exportCatalogCsv,
    exportOrdersCsv,
    exportOrderCsv,
    printBarcode,
    printCatalogPage,
    printOrder,
  };
}