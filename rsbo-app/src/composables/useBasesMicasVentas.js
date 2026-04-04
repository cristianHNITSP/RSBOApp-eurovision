// src/composables/useBasesMicasVentas.js
import { ref, computed, watch, onMounted } from "vue";
import { labToast } from "@/composables/useLabToast.js";
import { listSheets as invListSheets, fetchItems as invFetchItems } from "@/services/inventory";
import { createOrder, listOrders } from "@/services/laboratorio";
import { createGroupedNotification } from "@/services/notifications";

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

export function fmtDateShort(v) {
  if (!v) return "DD/MM/AAAA";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "DD/MM/AAAA";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
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

export function useBasesMicasVentas(getUser) {
  // ── Actor helper (closure over getUser prop) ──────────────────────────────
  function actorRef() {
    if (typeof getUser === "function") {
      const u = getUser();
      if (u) {
        const userId = u.id ?? u.userId ?? null;
        const name   = u.name ?? u.nombre ?? null;
        if (userId || name) return { userId, name };
      }
    }
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("auth_user") || "";
      if (!raw) return undefined;
      const u = JSON.parse(raw);
      const userId = u?.id || u?.userId || null;
      const name   = u?.name || u?.nombre || null;
      return userId || name ? { userId, name } : undefined;
    } catch { return undefined; }
  }

  // Reconstruye el título de una línea a partir de los datos almacenados en el pedido
  function buildLineTitleFromApi(line) {
    const t = line.tipo_matriz;
    const p = line.params || {};
    if (t === 'BASE')     return `BASE ${Number(p.base ?? 0).toFixed(2)}`;
    if (t === 'SPH_CYL')  return `SPH ${Number(p.sph ?? 0).toFixed(2)} · CYL ${Number(p.cyl ?? 0).toFixed(2)}`;
    if (t === 'SPH_ADD')  return `${line.eye || ''} · SPH ${Number(p.sph ?? 0).toFixed(2)} · ADD ${Number(p.add ?? 0).toFixed(2)}`;
    if (t === 'BASE_ADD') return `${line.eye || ''} · BI ${Number(p.base_izq ?? 0).toFixed(2)} · BD ${Number(p.base_der ?? 0).toFixed(2)} · ADD ${Number(p.add ?? 0).toFixed(2)}`;
    return line.codebar || 'Producto';
  }

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

  // ── Cliente cache (localStorage) ─────────────────────────────────────────
  const CLIENT_CACHE_KEY = "rsbo_client_cache_v1";
  function _readCache() {
    try { return JSON.parse(localStorage.getItem(CLIENT_CACHE_KEY) || "{}"); }
    catch { return {}; }
  }
  function _saveClientToCache(nombre, data) {
    try {
      const cache = _readCache();
      cache[nombre.toLowerCase()] = { ...data, savedAt: Date.now() };
      localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(cache));
    } catch {}
  }
  function _getClientFromCache(nombre) {
    try { return _readCache()[nombre.toLowerCase()] || null; }
    catch { return null; }
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  const cartItems            = ref([]);
  const cartCliente          = ref("");
  const cartNote             = ref("");
  const cartClienteNombres   = ref("");
  const cartClienteApellidos = ref("");
  const cartClienteEmpresa   = ref("");
  const cartClienteContacto  = ref("");
  const cartPago             = ref([]);

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

  const cartTotalMonto = computed(() =>
    cartItems.value.reduce((sum, ci) => sum + ci.qty * (Number(ci.precio) || 0), 0)
  );

  const cartClienteDisplay = computed(() => {
    const nombres   = cartClienteNombres.value.trim();
    const apellidos = cartClienteApellidos.value.trim();
    return [nombres, apellidos].filter(Boolean).join(" ") || cartCliente.value.trim();
  });

  // ── Clientes recurrentes (extraídos del historial) ─────────────────────
  const recentClientes = computed(() => {
    const map = new Map();
    for (const sale of salesHistory.value) {
      const name = (sale.cliente || "").trim();
      if (!name) continue;
      const existing = map.get(name);
      if (!existing || new Date(sale.fecha) > new Date(existing.fecha)) {
        map.set(name, { nombre: name, nota: sale.note || "", fecha: sale.fecha, pedidos: (existing?.pedidos || 0) + 1 });
      } else {
        existing.pedidos++;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.pedidos - a.pedidos);
  });

  const clienteSuggestions = computed(() => {
    const q = normTxt(cartCliente.value);
    if (!q) return recentClientes.value;
    return recentClientes.value.filter((c) => normTxt(c.nombre).includes(q));
  });

  function selectCliente(cliente) {
    if (!cliente) return;
    cartCliente.value = cliente.nombre;
    if (cliente.nota && !cartNote.value) cartNote.value = cliente.nota;
    const cached = _getClientFromCache(cliente.nombre);
    if (cached) {
      cartClienteNombres.value   = cached.nombres   || "";
      cartClienteApellidos.value = cached.apellidos || "";
      cartClienteEmpresa.value   = cached.empresa   || "";
      cartClienteContacto.value  = cached.contacto  || "";
    }
  }

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
      row:    { ...row },
      sheetId: sheet.id,
      sheet:  { ...sheet },
      qty:    1,
      precio: Number(sheet.precioVenta || 0),
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
    cartItems.value            = [];
    cartCliente.value          = "";
    cartNote.value             = "";
    cartClienteNombres.value   = "";
    cartClienteApellidos.value = "";
    cartClienteEmpresa.value   = "";
    cartClienteContacto.value  = "";
    cartPago.value             = [];
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
        title:       ci.title,
        params:      ci.params,
        codebar:     ci.row.codebar || "",
        qty:         ci.qty,
        precio:      Number(ci.precio) || 0,
        sheetNombre: ci.sheet.nombre || ci.sheet.name || ""
      }));

      const PAGO_LABELS = { trans: "TRANS", efec: "EFEC", credito: "CRÉDITO", tarjeta: "TARJETA C|D" };
      const pagoDisplay = cartPago.value.map((p) => PAGO_LABELS[p] || p).join(" / ") || "—";

      // Guardar datos del cliente en caché local para futuras ventas
      _saveClientToCache(cartCliente.value.trim(), {
        nombres:   cartClienteNombres.value.trim(),
        apellidos: cartClienteApellidos.value.trim(),
        empresa:   cartClienteEmpresa.value.trim(),
        contacto:  cartClienteContacto.value.trim(),
      });

      const voucher = {
        id:               `VTA-${Date.now()}`,
        labOrderId:       order?._id ? String(order._id) : null,
        labFolio:         order?.folio || null,
        labStatus:        "pendiente",
        fecha:            new Date().toISOString(),
        cliente:          cartCliente.value.trim(),
        clienteDisplay:   cartClienteDisplay.value,
        clienteNombres:   cartClienteNombres.value.trim(),
        clienteApellidos: cartClienteApellidos.value.trim(),
        clienteEmpresa:   cartClienteEmpresa.value.trim(),
        clienteContacto:  cartClienteContacto.value.trim(),
        pago:             [...cartPago.value],
        pagoDisplay,
        note:             cartNote.value.trim(),
        lineas:           saleLines,
        totalPiezas:      cartTotal.value,
        totalMonto:       cartTotalMonto.value,
        actor:            actor?.name || "Usuario"
      };

      lastVoucher.value = voucher;
      voucherOpen.value = true;
      clearCart();

      labToast.success(`Pedido ${order?.folio || ""} enviado al laboratorio`);

      // Notificar solo a laboratorio, supervisor y ventas
      createGroupedNotification({
        groupKey:        "pending_orders",
        title:           "Pedidos pendientes",
        messageTemplate: "{count} pedido(s) pendiente(s) de atención en laboratorio",
        type:            "warning",
        priority:        "medium",
        targetRoles:     ["laboratorio", "supervisor", "ventas"],
      }).catch(() => {});

      // Refrescar historial desde la BD
      loadHistory().catch(() => {});
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

  // ── Load history desde la BD ──────────────────────────────────────────────

  async function loadHistory() {
    loadingLabStatuses.value = true;
    try {
      const { data } = await listOrders({ limit: 200, status: 'all' });
      const orders = Array.isArray(data?.data) ? data.data : [];

      const statuses = {};
      salesHistory.value = orders.map((order) => {
        const id = String(order._id);
        statuses[id] = { status: order.status, folio: order.folio, closedAt: order.closedAt || null };
        const totalPiezas = (order.lines || []).reduce((s, l) => s + (l.qty || 0), 0);
        return {
          id,
          labOrderId:  id,
          labFolio:    order.folio,
          labStatus:   order.status,
          fecha:       order.createdAt,
          cliente:     order.cliente,
          note:        order.note || '',
          lineas:      (order.lines || []).map((l) => ({
            title:       buildLineTitleFromApi(l),
            params:      '',
            codebar:     l.codebar || '',
            qty:         l.qty || 0,
            sheetNombre: '',
          })),
          totalPiezas,
          actor: order.createdBy?.name || 'Sistema',
        };
      });
      labStatuses.value = statuses;
    } catch (e) {
      console.error('[BM-VENTAS] loadHistory', e);
      labToast.danger('Error al cargar el historial de pedidos');
    } finally {
      loadingLabStatuses.value = false;
    }
  }

  async function loadLabStatuses() { return loadHistory(); }

  async function checkVoucherStatus(_voucher) { return loadHistory(); }

  // ── Watchers ──────────────────────────────────────────────────────────────

  watch(selectedSheetId, () => {
    itemsDB.value   = [];
    catalogPage.value = 1;
    loadItems();
  });

  watch([itemQuery, stockFilter], () => {
    catalogPage.value = 1;
  });

  // Auto-fill cartCliente when nombres/apellidos are filled
  watch([cartClienteNombres, cartClienteApellidos], () => {
    const n = cartClienteNombres.value.trim();
    const a = cartClienteApellidos.value.trim();
    if (n || a) cartCliente.value = [n, a].filter(Boolean).join(" ");
  });

  // Load lab statuses when switching to historial tab
  watch(activeTab, (tab) => {
    if (tab === "historial") loadLabStatuses();
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  onMounted(async () => {
    await Promise.all([loadSheets(), loadHistory()]);
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
    cartClienteNombres, cartClienteApellidos,
    cartClienteEmpresa, cartClienteContacto, cartPago,
    loadingSheets, loadingItems, loadingSale, loadingLabStatuses,
    voucherOpen, lastVoucher,
    labStatuses,
    // computed
    selectedSheet, filteredItems, paginatedItems, catalogPages, cartTotal,
    cartTotalMonto, cartClienteDisplay,
    recentClientes, clienteSuggestions,
    // helpers
    buildRowTitle, buildRowParams, sheetTitle, fmtDate,
    labStatusHuman, labStatusClass,
    // actions
    loadSheets, loadItems,
    addToCart, removeFromCart, incCartQty, decCartQty, clearCart, selectCliente,
    registrarVenta, loadHistory,
    checkVoucherStatus, loadLabStatuses
  };
}
