// src/composables/useLaboratorioMock.js
import { computed, reactive, ref, watch } from "vue";
import { labToast } from "@/composables/useLabToast.js";

const deepClone = (x) => {
  try {
    return structuredClone(x);
  } catch {
    return JSON.parse(JSON.stringify(x));
  }
};

/* ===========================
   MOCK BASE
=========================== */
const mockSheetsBase = [
  {
    id: "sh_001",
    nombre: "Monofocal CR-39",
    sku: "MF-CR39-001",
    tipo_matriz: "SPH_CYL",
    material: "CR-39",
    tratamientos: ["AR", "UV"],
    deleted: false,
    updatedAtShort: "2025-11-29",
    updatedBy: "Benja",
  },
  {
    id: "sh_002",
    nombre: "Progresivo Digital",
    sku: "PG-DIG-214",
    tipo_matriz: "BASE_ADD",
    material: "Policarbonato",
    tratamientos: ["AR", "BlueCut"],
    deleted: false,
    updatedAtShort: "2025-11-28",
    updatedBy: "Majo",
  },
  {
    id: "sh_003",
    nombre: "Bifocal FT-28",
    sku: "BF-FT28-077",
    tipo_matriz: "SPH_ADD",
    material: "CR-39",
    tratamientos: ["UV"],
    deleted: true,
    updatedAtShort: "2025-10-02",
    updatedBy: "Admin",
  },
];

function makeRow({ sheetId, sku, existencias, codebar, base, sph, cyl, add, eye, base_izq, base_der }) {
  return { sheetId, sku, existencias, codebar, base, sph, cyl, add, eye, base_izq, base_der };
}

const mockItemsBase = [
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-A", existencias: 12, codebar: "2790000000011", sph: -1.25, cyl: -0.5 }),
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-B", existencias: 0,  codebar: "2790000000028", sph: -2.0,  cyl: -0.25 }),
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-C", existencias: 7,  codebar: "2790000000035", sph: 0.0,   cyl: -1.0 }),
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-D", existencias: 3,  codebar: "2790000000042", sph: 1.5,   cyl: -0.75 }),
  makeRow({ sheetId: "sh_001", sku: "MF-CR39-001-E", existencias: 1,  codebar: "2790000000059", sph: 2.25,  cyl: -0.25 }),

  makeRow({ sheetId: "sh_002", sku: "PG-DIG-214-A", existencias: 5, codebar: "2790000000103", add: 2.0, eye: "OD", base_izq: 1.0, base_der: 1.5 }),
  makeRow({ sheetId: "sh_002", sku: "PG-DIG-214-B", existencias: 2, codebar: "2790000000110", add: 2.5, eye: "OI", base_izq: 0.5, base_der: 1.0 }),
  makeRow({ sheetId: "sh_002", sku: "PG-DIG-214-C", existencias: 0, codebar: "2790000000127", add: 3.0, eye: "OD", base_izq: 1.5, base_der: 2.0 }),

  makeRow({ sheetId: "sh_003", sku: "BF-FT28-077-A", existencias: 9, codebar: "2790000000202", sph: -1.0, add: 2.0, eye: "OD" }),
  makeRow({ sheetId: "sh_003", sku: "BF-FT28-077-B", existencias: 0, codebar: "2790000000219", sph: 0.5,  add: 1.5, eye: "OI" }),
];

function mkLine(id, spec, qty) {
  return { id, spec, qty, picked: 0 };
}

const mockOrdersBase = [
  {
    id: "ord_1001",
    folio: "PED-1001",
    cliente: "Óptica Luz",
    nota: "Urgente",
    createdAtShort: "2025-11-29 10:12",
    sheetId: "sh_001",
    status: "pendiente",
    lines: [
      mkLine("l1", { sph: -1.25, cyl: -0.5 }, 2),
      mkLine("l2", { sph: 0.0,   cyl: -1.0 }, 1),
    ],
  },
];

function nowShort() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ===========================
   COMPOSABLE
=========================== */
export function useLaboratorioMock() {
  // Tabs
  const activeMainTab = ref("pedidos");
  const mode = ref("crear"); // crear | surtir

  // filtros generales
  const includeDeleted = ref(false);
  const sheetQuery = ref("");

  // inventario
  const itemQuery = ref("");
  const stockFilter = ref("withStock");
  const itemsLimit = ref(5000);

  // surtir
  const scanCode = ref("");
  const selectedOrderId = ref("");

  // modales
  const barcodeOpen = ref(false);
  const barcodeValue = ref("");
  const correctionOpen = ref(false);

  const correction = reactive({
    orderId: "",
    codebar: "",
    message: "",
  });

  // order inbox (pendientes/filtrar/buscar)
  const orderStatusFilter = ref("pendiente"); // pendiente | parcial | cerrado | all
  const orderQuery = ref("");

  // “DB”
  const sheetsDB = ref(deepClone(mockSheetsBase));
  const itemsDB = ref(deepClone(mockItemsBase));
  const ordersDB = ref(deepClone(mockOrdersBase));

  const selectedSheetId = ref(sheetsDB.value.find((s) => !s.deleted)?.id || sheetsDB.value[0]?.id || "");
  selectedOrderId.value = ordersDB.value[0]?.id || "";
  correction.orderId = selectedOrderId.value || "";

  // logs (entradas/salidas)
  const eventsDB = ref([
    {
      id: "ev_seed_1",
      type: "order_created",
      at: "2025-11-29 10:12",
      orderId: "ord_1001",
      folio: "PED-1001",
      cliente: "Óptica Luz",
      sheetId: "sh_001",
      linesTotal: 2,
    },
  ]);

  function pushEvent(ev) {
    const id = `ev_${(globalThis.crypto?.randomUUID?.() || Date.now())}`;
    eventsDB.value.unshift({ id, at: nowShort(), ...ev });
  }

  const entryEvents = computed(() => eventsDB.value.filter((e) => e.type === "order_created").slice(0, 6));
  const exitEvents = computed(() => eventsDB.value.filter((e) => e.type === "dispatch").slice(0, 6));

  /* ===========================
     Helpers UI
  ============================ */
  const lastUpdatedHuman = computed(() => "5m"); // mock

  function toast(message, type = "is-primary") {
    const t = type === "is-primary" ? "is-info" : type;
    labToast.show(message, t, 2000);
  }

  function noop() {
    toast("Acción mock (sin backend)", "is-light");
  }

  /* ===========================
     Sheets
  ============================ */
  const selectedSheet = computed(() => sheetsDB.value.find((s) => s.id === selectedSheetId.value) || null);

  const filteredSheets = computed(() => {
    let s = sheetsDB.value.slice();
    if (!includeDeleted.value) s = s.filter((x) => !x.deleted);

    const q = sheetQuery.value.trim().toLowerCase();
    if (q) {
      s = s.filter((x) => {
        const hay = [x.nombre, x.material, (x.tratamientos || []).join(" "), x.tipo_matriz, x.sku]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return s;
  });

  watch(filteredSheets, () => {
    const exists = filteredSheets.value.some((s) => s.id === selectedSheetId.value);
    if (!exists) selectedSheetId.value = filteredSheets.value[0]?.id || "";
  });

  const recentSheets = computed(() => filteredSheets.value.slice(0, 5));

  const selectedSheetLabel = computed(() => {
    const s = selectedSheet.value;
    return s ? `${s.tipo_matriz} · ${s.material}` : "—";
  });

  function sheetById(id) {
    return sheetsDB.value.find((s) => s.id === id) || null;
  }
  function sheetNameById(id) {
    return sheetById(id)?.nombre || "—";
  }
  function prettyTrat(trats) {
    if (!trats) return "—";
    if (Array.isArray(trats)) return trats.length ? trats.join(", ") : "—";
    return String(trats || "—");
  }
  function sheetTitle(s) {
    const t = prettyTrat(s?.tratamientos);
    const sku = s?.sku ? ` · ${s.sku}` : "";
    return `${s?.nombre || "Sin nombre"} · ${s?.material || "—"} · ${t}${sku}`;
  }

  /* ===========================
     Items
  ============================ */
  const itemsForSelected = computed(() => {
    const sid = selectedSheetId.value;
    if (!sid) return [];
    let arr = itemsDB.value.filter((r) => r.sheetId === sid);
    arr = arr.slice(0, Number(itemsLimit.value || 5000));
    return arr;
  });

  function fmt(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "—";
    const fixed = num.toFixed(2);
    return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed.replace(/0$/, "");
  }

  function buildRowTitle(row, sheet) {
    const tipo = sheet?.tipo_matriz;
    if (!tipo) return "Producto";

    if (tipo === "BASE") return `Base ${fmt(row.base)} D`;
    if (tipo === "SPH_CYL") return `Monofocal · Esfera ${fmt(row.sph)} · Cilindro ${fmt(row.cyl)}`;
    if (tipo === "SPH_ADD") return `Bifocal · Esfera ${fmt(row.sph)} · Adición ${fmt(row.add)} · ${row.eye || "OD"}`;
    if (tipo === "BASE_ADD") return `Progresivo · ADD ${fmt(row.add)} · ${row.eye || "OD"} · BI ${fmt(row.base_izq)} / BD ${fmt(row.base_der)}`;

    return `${tipo}`;
  }

  function buildRowParams(row, sheet) {
    const tipo = sheet?.tipo_matriz;
    if (tipo === "SPH_CYL") return `SPH ${fmt(row.sph)} · CYL ${fmt(row.cyl)}`;
    if (tipo === "SPH_ADD") return `SPH ${fmt(row.sph)} · ADD ${fmt(row.add)} · ${row.eye || "OD"}`;
    if (tipo === "BASE_ADD") return `ADD ${fmt(row.add)} · ${row.eye || "OD"} · BI ${fmt(row.base_izq)} · BD ${fmt(row.base_der)}`;
    if (tipo === "BASE") return `BASE ${fmt(row.base)}`;
    return "";
  }

  const filteredItems = computed(() => {
    let data = itemsForSelected.value.slice();

    if (stockFilter.value === "withStock") data = data.filter((r) => Number(r.existencias || 0) > 0);
    if (stockFilter.value === "zero") data = data.filter((r) => Number(r.existencias || 0) <= 0);

    const q = itemQuery.value.trim().toLowerCase();
    if (q) {
      data = data.filter((r) => {
        const hay = [
          r.codebar,
          r.existencias,
          r.base,
          r.sph,
          r.cyl,
          r.add,
          r.eye,
          r.base_izq,
          r.base_der,
          buildRowTitle(r, selectedSheet.value),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return data;
  });

  /* ===========================
     Draft (crear pedido)
  ============================ */
  const draftCliente = ref("Óptica Demo");
  const draftNote = ref("");
  const draftLines = ref([]);

  function specKeyFromRow(row, sheet) {
    const tipo = sheet?.tipo_matriz;
    if (tipo === "SPH_CYL") return `SPH:${Number(row.sph)}|CYL:${Number(row.cyl)}`;
    if (tipo === "SPH_ADD") return `SPH:${Number(row.sph)}|ADD:${Number(row.add)}|EYE:${String(row.eye || "OD")}`;
    if (tipo === "BASE_ADD") {
      return `ADD:${Number(row.add)}|EYE:${String(row.eye || "OD")}|BI:${Number(row.base_izq)}|BD:${Number(row.base_der)}`;
    }
    if (tipo === "BASE") return `BASE:${Number(row.base)}`;
    return row.sku || row.codebar || "X";
  }

  function specFromRow(row, sheet) {
    const tipo = sheet?.tipo_matriz;
    if (tipo === "SPH_CYL") return { sph: Number(row.sph), cyl: Number(row.cyl) };
    if (tipo === "SPH_ADD") return { sph: Number(row.sph), add: Number(row.add), eye: String(row.eye || "OD") };
    if (tipo === "BASE_ADD") return { add: Number(row.add), eye: String(row.eye || "OD"), base_izq: Number(row.base_izq), base_der: Number(row.base_der) };
    if (tipo === "BASE") return { base: Number(row.base) };
    return { sku: row.sku || null };
  }

  function addToDraft(row) {
    const sheet = selectedSheet.value;
    if (!sheet) return;

    const key = specKeyFromRow(row, sheet);
    const found = draftLines.value.find((l) => l.key === key);
    const title = buildRowTitle(row, sheet);

    if (found) found.qty = Math.max(1, Number(found.qty || 1) + 1);
    else {
      draftLines.value.push({
        key,
        title,
        qty: 1,
        stock: Number(row.existencias || 0),
        spec: specFromRow(row, sheet),
      });
    }
    toast("Agregado al pedido (mock)", "is-success");
  }

  function removeDraftLine(key) {
    draftLines.value = draftLines.value.filter((l) => l.key !== key);
  }
  function incDraftQty(key) {
    const l = draftLines.value.find((x) => x.key === key);
    if (!l) return;
    l.qty = Number(l.qty || 1) + 1;
  }
  function decDraftQty(key) {
    const l = draftLines.value.find((x) => x.key === key);
    if (!l) return;
    l.qty = Math.max(1, Number(l.qty || 1) - 1);
  }
  function clearDraft() {
    draftLines.value = [];
    toast("Pedido limpiado (mock)", "is-light");
  }

  function nextFolio() {
    const nums = ordersDB.value
      .map((o) => Number(String(o.folio || "").replace(/[^\d]/g, "")))
      .filter((n) => Number.isFinite(n));
    const max = nums.length ? Math.max(...nums) : 1000;
    return `PED-${max + 1}`;
  }

  function createOrderFromDraft() {
    const sheet = selectedSheet.value;
    if (!sheet) return;

    if (!draftLines.value.length) {
      toast("Agrega líneas primero.", "is-warning");
      return;
    }

    const created = {
      id: `ord_${globalThis.crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())}`,
      folio: nextFolio(),
      cliente: String(draftCliente.value || "Óptica").trim() || "Óptica",
      nota: String(draftNote.value || "").trim(),
      createdAtShort: nowShort(),
      sheetId: sheet.id,
      status: "pendiente",
      lines: draftLines.value.map((l, idx) => mkLine(`l${idx + 1}`, deepClone(l.spec), Number(l.qty || 1))),
    };

    ordersDB.value.unshift(created);
    selectedOrderId.value = created.id;
    correction.orderId = selectedOrderId.value;

    // ✅ log de entrada
    pushEvent({
      type: "order_created",
      orderId: created.id,
      folio: created.folio,
      cliente: created.cliente,
      sheetId: created.sheetId,
      linesTotal: created.lines.length,
    });

    // reset draft
    draftLines.value = [];
    draftNote.value = "";
    toast(`Pedido creado: ${created.folio} (mock)`, "is-success");
  }

  /* ===========================
     Surtir (escaneo)
  ============================ */
  const selectedOrder = computed(() => ordersDB.value.find((o) => o.id === selectedOrderId.value) || null);

  function itemMatchesLine(item, lineSpec, sheetTipo) {
    if (!lineSpec) return false;
    if (sheetTipo === "SPH_CYL") return Number(item.sph) === Number(lineSpec.sph) && Number(item.cyl) === Number(lineSpec.cyl);
    if (sheetTipo === "SPH_ADD") {
      return (
        Number(item.sph) === Number(lineSpec.sph) &&
        Number(item.add) === Number(lineSpec.add) &&
        String(item.eye || "OD") === String(lineSpec.eye || "OD")
      );
    }
    if (sheetTipo === "BASE_ADD") {
      return (
        Number(item.add) === Number(lineSpec.add) &&
        String(item.eye || "OD") === String(lineSpec.eye || "OD") &&
        Number(item.base_izq) === Number(lineSpec.base_izq) &&
        Number(item.base_der) === Number(lineSpec.base_der)
      );
    }
    if (sheetTipo === "BASE") return Number(item.base) === Number(lineSpec.base);
    return false;
  }

  function lineHuman(line, sheet) {
    const tipo = sheet?.tipo_matriz;
    const s = line?.spec || {};
    if (tipo === "SPH_CYL") return `Monofocal · SPH ${fmt(s.sph)} · CYL ${fmt(s.cyl)}`;
    if (tipo === "SPH_ADD") return `Bifocal · SPH ${fmt(s.sph)} · ADD ${fmt(s.add)} · ${s.eye || "OD"}`;
    if (tipo === "BASE_ADD") return `Progresivo · ADD ${fmt(s.add)} · ${s.eye || "OD"} · BI ${fmt(s.base_izq)} / BD ${fmt(s.base_der)}`;
    if (tipo === "BASE") return `Base ${fmt(s.base)} D`;
    return "Línea";
  }

  function orderTotalCount(order) {
    return order.lines.reduce((acc, l) => acc + Number(l.qty || 0), 0);
  }
  function orderPickedCount(order) {
    return order.lines.reduce((acc, l) => acc + Math.min(Number(l.picked || 0), Number(l.qty || 0)), 0);
  }
  function orderProgressPct(order) {
    const total = orderTotalCount(order);
    if (!total) return 0;
    return Math.round((orderPickedCount(order) / total) * 100);
  }
  function isOrderComplete(order) {
    return order.lines.every((l) => Number(l.picked || 0) >= Number(l.qty || 0));
  }

  function scanAndDispatch() {
    const code = String(scanCode.value || "").trim();
    if (!code) return;

    const order = selectedOrder.value;
    if (!order) {
      toast("Selecciona un pedido.", "is-warning");
      return;
    }

    const item = itemsDB.value.find((r) => String(r.codebar || "").trim() === code);
    if (!item) {
      toast("Código no encontrado en inventario (mock).", "is-danger");
      return;
    }

    if (item.sheetId !== order.sheetId) {
      toast("Ese código pertenece a otra planilla (mock).", "is-warning");
      return;
    }

    if (Number(item.existencias || 0) <= 0) {
      toast("Encontrado, pero stock = 0 (mock).", "is-warning");
      return;
    }

    const sheet = sheetById(order.sheetId);
    const tipo = sheet?.tipo_matriz;

    const line = order.lines.find((l) => {
      const pending = Number(l.picked || 0) < Number(l.qty || 0);
      return pending && itemMatchesLine(item, l.spec, tipo);
    });

    if (!line) {
      toast("El código no corresponde a ninguna línea pendiente (mock).", "is-danger");
      return;
    }

    // ✅ salida
    line.picked = Number(line.picked || 0) + 1;
    item.existencias = Math.max(0, Number(item.existencias || 0) - 1);

    if (isOrderComplete(order)) order.status = "cerrado";
    else if (orderPickedCount(order) > 0) order.status = "parcial";

    // ✅ log de salida
    pushEvent({
      type: "dispatch",
      orderId: order.id,
      folio: order.folio,
      sheetId: order.sheetId,
      codebar: code,
      title: buildRowTitle(item, sheet),
    });

    toast("Salida registrada (mock).", "is-success");
    scanCode.value = "";
  }

  function resetPickedForSelectedOrder() {
    const order = selectedOrder.value;
    if (!order) return;
    order.lines.forEach((l) => (l.picked = 0));
    order.status = "pendiente";
    toast("Surtido reiniciado (mock).", "is-light");
  }

  function closeOrderMock() {
    const order = selectedOrder.value;
    if (!order) return;
    if (!isOrderComplete(order)) {
      toast("Aún faltan líneas por surtir (mock).", "is-warning");
      return;
    }
    order.status = "cerrado";
    toast("Pedido cerrado (mock).", "is-success");
  }

  /* ===========================
     Inbox (pendientes / parciales / cerrados)
  ============================ */
  function statusHuman(st) {
    if (st === "cerrado") return "Cerrado";
    if (st === "parcial") return "Parcial";
    return "Pendiente";
  }
  function statusTagClass(st) {
    if (st === "cerrado") return "is-success";
    if (st === "parcial") return "is-warning";
    return "";
  }

  const filteredOrders = computed(() => {
    let arr = ordersDB.value.slice();

    if (orderStatusFilter.value !== "all") {
      arr = arr.filter((o) => String(o.status) === String(orderStatusFilter.value));
    }

    const q = orderQuery.value.trim().toLowerCase();
    if (q) {
      arr = arr.filter((o) => {
        const hay = [o.folio, o.cliente, sheetNameById(o.sheetId), o.createdAtShort, o.status].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    return arr;
  });

  function resetPickedForOrder(orderId) {
    const order = ordersDB.value.find((o) => o.id === orderId);
    if (!order) return;
    order.lines.forEach((l) => (l.picked = 0));
    order.status = "pendiente";
  }

  /* ===========================
     Catálogo
  ============================ */
  const catalogQuery = ref("");
  const catalogFilter = ref("withStock");
  const catalogPage = ref(1);
  const catalogPageSize = ref(18);

  const catalogRows = computed(() =>
    itemsForSelected.value.map((r, idx) => ({ ...r, _k: `${r.codebar || r.sku || idx}-${idx}` }))
  );

  const filteredCatalogRows = computed(() => {
    let data = catalogRows.value.slice();

    if (catalogFilter.value === "withStock") data = data.filter((r) => Number(r.existencias || 0) > 0 && r.codebar);
    if (catalogFilter.value === "allCodes") data = data.filter((r) => !!r.codebar);

    const q = catalogQuery.value.trim().toLowerCase();
    if (q) {
      data = data.filter((r) => {
        const hay = [
          r.codebar,
          r.sku,
          r.existencias,
          r.sph,
          r.cyl,
          r.add,
          r.base_izq,
          r.base_der,
          buildRowTitle(r, selectedSheet.value),
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return data;
  });

  const catalogPages = computed(() => Math.max(1, Math.ceil(filteredCatalogRows.value.length / catalogPageSize.value)));

  const paginatedCatalog = computed(() => {
    const page = Math.min(Math.max(1, catalogPage.value), catalogPages.value);
    const start = (page - 1) * catalogPageSize.value;
    return filteredCatalogRows.value.slice(start, start + catalogPageSize.value);
  });

  watch([filteredCatalogRows, selectedSheetId], () => {
    catalogPage.value = 1;
  });

  /* ===========================
     Barcode helpers
  ============================ */
  function isEan13(code) {
    const d = String(code || "").replace(/\D/g, "");
    return d.length === 13;
  }

  function openBarcode(code) {
    barcodeValue.value = String(code || "");
    barcodeOpen.value = true;
  }

  async function copyCodebar(codebar) {
    const code = String(codebar || "").trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast("Código copiado", "is-success");
    } catch {
      toast("No se pudo copiar", "is-danger");
    }
  }

  /* ===========================
     Reset
  ============================ */
  function resetMock() {
    sheetsDB.value = deepClone(mockSheetsBase);
    itemsDB.value = deepClone(mockItemsBase);
    ordersDB.value = deepClone(mockOrdersBase);

    selectedSheetId.value = sheetsDB.value.find((s) => !s.deleted)?.id || sheetsDB.value[0]?.id || "";
    selectedOrderId.value = ordersDB.value[0]?.id || "";
    correction.orderId = selectedOrderId.value || "";

    mode.value = "crear";

    draftCliente.value = "Óptica Demo";
    draftNote.value = "";
    draftLines.value = [];

    scanCode.value = "";
    sheetQuery.value = "";
    itemQuery.value = "";
    catalogQuery.value = "";

    barcodeOpen.value = false;
    barcodeValue.value = "";

    orderStatusFilter.value = "pendiente";
    orderQuery.value = "";

    eventsDB.value = [
      {
        id: "ev_seed_1",
        type: "order_created",
        at: "2025-11-29 10:12",
        orderId: "ord_1001",
        folio: "PED-1001",
        cliente: "Óptica Luz",
        sheetId: "sh_001",
        linesTotal: 2,
      },
    ];

    toast("Mock recargado", "is-success");
  }

  function submitCorrectionMock() {
    correctionOpen.value = false;
    toast("Solicitud enviada (mock)", "is-warning");
    correction.orderId = selectedOrderId.value || correction.orderId;
    correction.codebar = "";
    correction.message = "";
  }

  const totalCodes = computed(() => itemsDB.value.reduce((acc, r) => acc + (r.codebar ? 1 : 0), 0));

  return {
    // state
    activeMainTab,
    mode,
    includeDeleted,
    sheetQuery,
    itemQuery,
    stockFilter,
    itemsLimit,
    scanCode,

    correctionOpen,
    correction,

    barcodeOpen,
    barcodeValue,

    orderStatusFilter,
    orderQuery,

    sheetsDB,
    itemsDB,
    ordersDB,

    selectedSheetId,
    selectedOrderId,

    // computed
    lastUpdatedHuman,
    selectedSheet,
    filteredSheets,
    recentSheets,
    selectedSheetLabel,

    itemsForSelected,
    filteredItems,

    selectedOrder,
    totalCodes,

    entryEvents,
    exitEvents,
    filteredOrders,

    catalogQuery,
    catalogFilter,
    catalogPage,
    catalogPageSize,
    filteredCatalogRows,
    paginatedCatalog,
    catalogPages,

    // methods
    toast,
    noop,
    resetMock,

    prettyTrat,
    sheetTitle,
    sheetById,
    sheetNameById,

    fmt,
    buildRowTitle,
    buildRowParams,

    addToDraft,
    removeDraftLine,
    incDraftQty,
    decDraftQty,
    clearDraft,

    draftCliente,
    draftNote,
    draftLines,
    createOrderFromDraft,

    lineHuman,
    orderTotalCount,
    orderPickedCount,
    orderProgressPct,
    isOrderComplete,
    scanAndDispatch,
    resetPickedForSelectedOrder,
    closeOrderMock,
    resetPickedForOrder,

    statusHuman,
    statusTagClass,

    isEan13,
    openBarcode,
    copyCodebar,

    submitCorrectionMock,
  };
}
