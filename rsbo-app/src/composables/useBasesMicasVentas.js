// src/composables/useBasesMicasVentas.js
import { ref, computed, watch, onMounted } from "vue";
import { labToast } from "@/composables/useLabToast.js";
import { listSheets as invListSheets, fetchItems as invFetchItems } from "@/services/inventory";
import { createOrder, getOrder } from "@/services/laboratorio";

// ============================================================================
// HELPERS
// ============================================================================

const normTxt = (s) =>
  String(s || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const buildRowTitle = (row, sheet) => {
  const t = sheet?.tipo_matriz;
  if (t === "BASE") return `BASE ${Number(row.base ?? 0).toFixed(2)}`;
  if (t === "SPH_CYL")
    return `SPH ${Number(row.sph ?? 0).toFixed(2)} · CYL ${Number(row.cyl ?? 0).toFixed(2)}`;
  if (t === "SPH_ADD")
    return `${row.eye || ""} · SPH ${Number(row.sph ?? 0).toFixed(2)} · ADD ${Number(row.add ?? 0).toFixed(2)}`;
  if (t === "BASE_ADD")
    return `${row.eye || ""} · BI ${Number(row.base_izq ?? 0).toFixed(2)} · BD ${Number(row.base_der ?? 0).toFixed(2)} · ADD ${Number(row.add ?? 0).toFixed(2)}`;
  return "Producto";
};

export const buildRowParams = (row, sheet) => {
  const t = sheet?.tipo_matriz;
  if (t === "BASE") return `base=${Number(row.base ?? 0).toFixed(2)}`;
  if (t === "SPH_CYL")
    return `sph=${Number(row.sph ?? 0).toFixed(2)} · cyl=${Number(row.cyl ?? 0).toFixed(2)}`;
  if (t === "SPH_ADD")
    return `sph=${Number(row.sph ?? 0).toFixed(2)} · add=${Number(row.add ?? 0).toFixed(2)}`;
  if (t === "BASE_ADD")
    return `bi=${Number(row.base_izq ?? 0).toFixed(2)} · bd=${Number(row.base_der ?? 0).toFixed(2)} · add=${Number(row.add ?? 0).toFixed(2)}`;
  return "—";
};

function actorRef() {
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
}

export function fmtDate(v) {
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
}

export const labStatusHuman = (s) =>
  ({ pendiente: "Pendiente", parcial: "En proceso", cerrado: "Surtido completo", cancelado: "Cancelado" }[s] ||
  s ||
  "—");

export const labStatusClass = (s) =>
  ({
    pendiente: "is-warning",
    parcial: "is-info",
    cerrado: "is-success",
    cancelado: "is-danger"
  }[s] || "is-light");

// ============================================================================
// COMPOSABLE
// ============================================================================

export function useBasesMicasVentas() {
  // ── DB state ──────────────────────────────────────────────────────────────
  const sheetsDB   = ref([]);
  const itemsDB    = ref([]);
  const salesHistory = ref([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const activeTab       = ref("venta");
  const selectedSheetId = ref("");
  const itemQuery       = ref("");
  const stockFilter     = ref("withStock");
  const catalogPage     = ref(1);
  const catalogPageSize = ref(15);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const cartItems   = ref([]);
  const cartCliente = ref("");
  const cartNote    = ref("");

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadingSheets      = ref(false);
  const loadingItems       = ref(false);
  const loadingSale        = ref(false);
  const loadingLabStatuses = ref(false);

  // ── Voucher & Lab statuses ─────────────────────────────────────────────────
  const voucherOpen  = ref(false);
  const lastVoucher  = ref(null);
  // { [labOrderId]: { status, folio, closedAt } }
  const labStatuses  = ref({});

  // ── Computed ──────────────────────────────────────────────────────────────

  const selectedSheet = computed(() =>
    sheetsDB.value.find((s) => String(s.id) === String(selectedSheetId.value)) || null
  );

  const filteredItems = computed(() => {
    let rows = itemsDB.value;

    if (stockFilter.value === "withStock")
      rows = rows.filter((r) => Number(r.existencias ?? 0) > 0);
    else if (stockFilter.value === "zero")
      rows = rows.filter((r) => Number(r.existencias ?? 0) === 0);

    const q = normTxt(itemQuery.value);
    if (q) {
      rows = rows.filter((r) => {
        const title  = normTxt(buildRowTitle(r, selectedSheet.value));
        const params = normTxt(buildRowParams(r, selectedSheet.value));
        const code   = normTxt(r.codebar || "");
        return title.includes(q) || params.includes(q) || code.includes(q);
      });
    }
    return rows;
  });

  const catalogPages = computed(() =>
    Math.max(1, Math.ceil(filteredItems.value.length / catalogPageSize.value))
  );

  const paginatedItems = computed(() => {
    const page = Math.min(catalogPage.value, catalogPages.value);
    const per  = catalogPageSize.value;
    return filteredItems.value.slice((page - 1) * per, page * per);
  });

  const cartTotal = computed(() =>
    cartItems.value.reduce((sum, ci) => sum + ci.qty, 0)
  );

  // ── Sheet helpers ─────────────────────────────────────────────────────────

  const sheetTitle = (s) => {
    if (!s) return "—";
    const name = s.nombre || s.name || "Planilla";
    const sku  = s.sku ? ` · ${s.sku}` : "";
    return `${name}${sku}`;
  };

  // ── Load sheets ───────────────────────────────────────────────────────────

  async function loadSheets() {
    loadingSheets.value = true;
    try {
      const { data } = await invListSheets({});
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const mapped = arr.map((s) => ({
        ...s,
        id:          String(s._id ?? s.id ?? ""),
        nombre:      s.nombre ?? s.name ?? "",
        tratamientos: Array.isArray(s.tratamientos) ? s.tratamientos : []
      }));
      mapped.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      sheetsDB.value = mapped;
      if (!selectedSheetId.value && mapped.length) selectedSheetId.value = mapped[0].id;
    } catch (e) {
      console.error("[BM-VENTAS] loadSheets", e?.response?.data || e);
      labToast.danger("No se pudieron cargar las planillas");
    } finally {
      loadingSheets.value = false;
    }
  }

  // ── Load items ────────────────────────────────────────────────────────────

  async function loadItems() {
    const sid = selectedSheetId.value;
    if (!sid) { itemsDB.value = []; return; }
    loadingItems.value = true;
    try {
      const { data } = await invFetchItems(sid, { limit: 5000 });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      itemsDB.value = arr.map((r) => ({ ...r, existencias: Number(r.existencias ?? 0) }));
      catalogPage.value = 1;
    } catch (e) {
      console.error("[BM-VENTAS] loadItems", e?.response?.data || e);
      labToast.danger("Error al cargar productos del inventario");
    } finally {
      loadingItems.value = false;
    }
  }

  // ── Cart actions ──────────────────────────────────────────────────────────

  function addToCart(row) {
    const sheet = selectedSheet.value;
    if (!sheet) return;

    const key = `${sheet.id}::${row._id ?? row.codebar ?? buildRowParams(row, sheet)}`;
    const existing = cartItems.value.find((ci) => ci.key === key);

    if (existing) {
      const currentStock = Number(row.existencias ?? 0);
      if (existing.qty < currentStock) {
        existing.qty++;
        labToast.info("Cantidad actualizada");
      } else {
        labToast.warning("Stock insuficiente");
      }
      return;
    }

    if (Number(row.existencias ?? 0) < 1) {
      labToast.warning("Sin stock disponible");
      return;
    }

    cartItems.value.push({
      key,
      row:   { ...row },
      sheetId: sheet.id,
      sheet: { ...sheet },
      qty:   1,
      title:  buildRowTitle(row, sheet),
      params: buildRowParams(row, sheet)
    });
    labToast.success("Agregado al carrito");
  }

  function removeFromCart(key) {
    const idx = cartItems.value.findIndex((ci) => ci.key === key);
    if (idx >= 0) cartItems.value.splice(idx, 1);
  }

  function incCartQty(ci) {
    if (ci.qty < Number(ci.row.existencias ?? 0)) ci.qty++;
    else labToast.warning("Stock insuficiente");
  }

  function decCartQty(ci) {
    if (ci.qty > 1) ci.qty--;
    else removeFromCart(ci.key);
  }

  function clearCart() {
    cartItems.value  = [];
    cartCliente.value = "";
    cartNote.value   = "";
  }

  // ── Registrar venta → crea pedido de laboratorio ──────────────────────────

  async function registrarVenta() {
    if (!cartItems.value.length) { labToast.warning("El carrito está vacío"); return; }
    if (!cartCliente.value.trim()) { labToast.warning("Ingresa el nombre del cliente"); return; }

    // Validar que todos los items tengan código de barras (requerido por el lab)
    const sinCodigo = cartItems.value.filter((ci) => !ci.row.codebar);
    if (sinCodigo.length > 0) {
      labToast.warning(
        `${sinCodigo.length} producto(s) sin código de barras. Asigna códigos en el inventario antes de enviar al laboratorio.`
      );
      return;
    }

    loadingSale.value = true;
    const actor = actorRef();

    try {
      const lines = cartItems.value.map((ci) => ({
        codebar: ci.row.codebar,
        qty:     ci.qty,
        sheetId: ci.sheetId
      }));

      const { data } = await createOrder({
        cliente: cartCliente.value.trim(),
        note:    cartNote.value.trim(),
        lines,
        actor
      });

      const order = data?.data;

      // Build voucher record (local)
      const saleLines = cartItems.value.map((ci) => ({
        title:      ci.title,
        params:     ci.params,
        codebar:    ci.row.codebar || "",
        qty:        ci.qty,
        sheetNombre: ci.sheet.nombre || ci.sheet.name || ""
      }));

      const voucher = {
        id:          `VTA-${Date.now()}`,
        labOrderId:  order?._id ? String(order._id) : null,
        labFolio:    order?.folio || null,
        labStatus:   "pendiente",
        fecha:       new Date().toISOString(),
        cliente:     cartCliente.value.trim(),
        note:        cartNote.value.trim(),
        lineas:      saleLines,
        totalPiezas: cartTotal.value,
        actor:       actor?.name || "Usuario"
      };

      // Persist to localStorage
      const history = (() => {
        try { return JSON.parse(localStorage.getItem("rsbo_bm_sales") || "[]"); }
        catch { return []; }
      })();
      history.unshift(voucher);
      localStorage.setItem("rsbo_bm_sales", JSON.stringify(history.slice(0, 100)));
      salesHistory.value = history.slice(0, 100);

      lastVoucher.value = voucher;
      voucherOpen.value = true;
      clearCart();

      labToast.success(`Pedido ${order?.folio || ""} enviado al laboratorio`);
    } catch (e) {
      console.error("[BM-VENTAS] registrarVenta", e?.response?.data || e);
      // Surface backend validation errors (e.g. SIN_STOCK, NO_ENCONTRADO_EN_MATRIZ)
      const backendErrors = e?.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length) {
        const msgs = backendErrors.map((er) => {
          if (er.error === "SIN_STOCK") return `Sin stock: ${er.codebar}`;
          if (er.error === "NO_ENCONTRADO_EN_MATRIZ") return `Código no encontrado: ${er.codebar}`;
          return `${er.codebar}: ${er.error}`;
        });
        labToast.danger(msgs.join(" · "));
      } else {
        labToast.danger(e?.response?.data?.message || "Error al crear el pedido de laboratorio");
      }
    } finally {
      loadingSale.value = false;
    }
  }

  // ── Lab status checking ────────────────────────────────────────────────────

  async function checkVoucherStatus(voucher) {
    if (!voucher?.labOrderId) return;
    try {
      const { data } = await getOrder(voucher.labOrderId);
      const order = data?.data;
      if (order) {
        labStatuses.value = {
          ...labStatuses.value,
          [voucher.labOrderId]: {
            status:   order.status,
            folio:    order.folio,
            closedAt: order.closedAt || null
          }
        };
      }
    } catch (e) {
      console.error("[BM-VENTAS] checkVoucherStatus", e);
    }
  }

  async function loadLabStatuses() {
    const withOrder = salesHistory.value.filter((v) => v.labOrderId);
    if (!withOrder.length) return;

    loadingLabStatuses.value = true;
    try {
      const results = await Promise.allSettled(
        withOrder.slice(0, 30).map((v) => getOrder(v.labOrderId))
      );
      const statuses = { ...labStatuses.value };
      for (const r of results) {
        if (r.status === "fulfilled" && r.value?.data?.data) {
          const o = r.value.data.data;
          statuses[String(o._id)] = { status: o.status, folio: o.folio, closedAt: o.closedAt || null };
        }
      }
      labStatuses.value = statuses;
    } catch (e) {
      console.error("[BM-VENTAS] loadLabStatuses", e);
    } finally {
      loadingLabStatuses.value = false;
    }
  }

  // ── Load history ──────────────────────────────────────────────────────────

  function loadHistory() {
    try {
      salesHistory.value = JSON.parse(localStorage.getItem("rsbo_bm_sales") || "[]");
    } catch {
      salesHistory.value = [];
    }
  }

  // ── Watchers ──────────────────────────────────────────────────────────────

  watch(selectedSheetId, () => {
    itemsDB.value   = [];
    catalogPage.value = 1;
    loadItems();
  });

  watch([itemQuery, stockFilter], () => {
    catalogPage.value = 1;
  });

  // Load lab statuses when switching to historial tab
  watch(activeTab, (tab) => {
    if (tab === "historial") loadLabStatuses();
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  onMounted(async () => {
    loadHistory();
    await loadSheets();
  });

  // ── Expose ────────────────────────────────────────────────────────────────

  return {
    // state
    sheetsDB, itemsDB, salesHistory,
    activeTab,
    selectedSheetId,
    itemQuery, stockFilter,
    catalogPage, catalogPageSize,
    cartItems, cartCliente, cartNote,
    loadingSheets, loadingItems, loadingSale, loadingLabStatuses,
    voucherOpen, lastVoucher,
    labStatuses,
    // computed
    selectedSheet, filteredItems, paginatedItems, catalogPages, cartTotal,
    // helpers
    buildRowTitle, buildRowParams, sheetTitle, fmtDate,
    labStatusHuman, labStatusClass,
    // actions
    loadSheets, loadItems,
    addToCart, removeFromCart, incCartQty, decCartQty, clearCart,
    registrarVenta, loadHistory,
    checkVoucherStatus, loadLabStatuses
  };
}
