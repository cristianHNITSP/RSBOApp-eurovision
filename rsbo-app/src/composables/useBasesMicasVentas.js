// src/composables/useBasesMicasVentas.js
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { labToast } from "@/composables/useLabToast.js";
import { listSheets as invListSheets, fetchItems as invFetchItems } from "@/services/inventory";
import { createOrder, listOrders } from "@/services/laboratorio";
import { createGroupedNotification } from "@/services/notifications";
import { fmtDate, fmtDateShort } from "@/utils/formatters";
import { labStatusHuman, labStatusClass } from "@/utils/statusHelpers";

// re-exportamos para que los consumidores que importen desde aquí sigan funcionando
export { fmtDate, fmtDateShort, labStatusHuman, labStatusClass };

// ============================================================================
// HELPERS
// ============================================================================

const normTxt = (s) =>
  String(s || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const eyeLabel = (e) => {
  if (!e) return "";
  const s = String(e).toUpperCase();
  if (s === "OD" || s === "R") return "Ojo Derecho";
  if (s === "OI" || s === "OS" || s === "L") return "Ojo Izquierdo";
  return e;
};

const fv = (v) => Number(v ?? 0).toFixed(2);

// Para BASE_ADD: OD usa base_der, OI usa base_izq
const baseForEye = (row) =>
  String(row.eye || "").toUpperCase() === "OD"
    ? Number(row.base_der ?? 0)
    : Number(row.base_izq ?? 0);

export const buildRowTitle = (row, sheet) => {
  const t = sheet?.tipo_matriz;
  if (t === "BASE")    return `Base ${fv(row.base)}`;
  if (t === "SPH_CYL") return `Esfera ${fv(row.sph)} · Cilindro ${fv(row.cyl)}`;
  if (t === "SPH_ADD")  return `${eyeLabel(row.eye)} · Esfera ${fv(row.sph)} · Adición ${fv(row.add)}`;
  if (t === "BASE_ADD") return `${eyeLabel(row.eye)} · Base ${fv(baseForEye(row))} · Adición ${fv(row.add)}`;
  return "Producto";
};

export const buildRowParams = (row, sheet) => {
  const t = sheet?.tipo_matriz;
  if (t === "BASE")    return `base=${fv(row.base)}`;
  if (t === "SPH_CYL") return `sph=${fv(row.sph)} · cyl=${fv(row.cyl)}`;
  if (t === "SPH_ADD")  return `sph=${fv(row.sph)} · add=${fv(row.add)}`;
  if (t === "BASE_ADD") return `base=${fv(baseForEye(row))} · add=${fv(row.add)}`;
  return "—";
};


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
    const eye = line.eye || '';
    const base = String(eye).toUpperCase() === 'OD' ? Number(p.base_der ?? 0) : Number(p.base_izq ?? 0);
    if (t === 'BASE')     return `Base ${fv(p.base)}`;
    if (t === 'SPH_CYL')  return `Esfera ${fv(p.sph)} · Cilindro ${fv(p.cyl)}`;
    if (t === 'SPH_ADD')  return `${eyeLabel(eye)} · Esfera ${fv(p.sph)} · Adición ${fv(p.add)}`;
    if (t === 'BASE_ADD') return `${eyeLabel(eye)} · Base ${fv(base)} · Adición ${fv(p.add)}`;
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

  // ── Cliente cache (useLocalStorage — reactivo, con serialización automática) ──
  const _clientCache = useLocalStorage("rsbo_client_cache_v1", {});
  function _saveClientToCache(nombre, data) {
    _clientCache.value[nombre.toLowerCase()] = { ...data, savedAt: Date.now() };
  }
  function _getClientFromCache(nombre) {
    return _clientCache.value[nombre.toLowerCase()] || null;
  }

  // ── AbortController — cancela requests pendientes al desmontar ────────────
  let _ac = new AbortController();
  onBeforeUnmount(() => { _ac.abort(); });

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
      rows = rows.filter((r) => r.existencias > 0);
    else if (stockFilter.value === "zero")
      rows = rows.filter((r) => r.existencias === 0);

    const q = normTxt(itemQuery.value);
    if (q) {
      rows = rows.filter((r) =>
        (r._normTitle || "").includes(q) ||
        (r._normParams || "").includes(q) ||
        (r._normCode || "").includes(q)
      );
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
      const { data } = await invListSheets({ signal: _ac.signal });
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
      const { data } = await invFetchItems(sid, { limit: 500, signal: _ac.signal });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      // Pre-normalizamos los campos de búsqueda para no recalcularlos en cada computed
      const sheet = sheetsDB.value.find((s) => String(s.id) === String(sid)) || null;
      itemsDB.value = arr.map((r) => ({
        ...r,
        existencias: Number(r.existencias ?? 0),
        _normTitle:  normTxt(buildRowTitle(r, sheet)),
        _normParams: normTxt(buildRowParams(r, sheet)),
        _normCode:   normTxt(r.codebar || "")
      }));
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
        sheetId: ci.sheetId,
        precio:  Number(ci.precio) || 0
      }));

      const PAGO_LABELS = { trans: "TRANS", efec: "EFEC", credito: "CRÉDITO", tarjeta: "TARJETA C|D" };
      const pagoDisplay = cartPago.value.map((p) => PAGO_LABELS[p] || p).join(" / ") || "—";

      const { data } = await createOrder({
        cliente:          cartCliente.value.trim(),
        clienteDisplay:   cartClienteDisplay.value,
        clienteNombres:   cartClienteNombres.value.trim(),
        clienteApellidos: cartClienteApellidos.value.trim(),
        clienteEmpresa:   cartClienteEmpresa.value.trim(),
        clienteContacto:  cartClienteContacto.value.trim(),
        note:             cartNote.value.trim(),
        pago:             [...cartPago.value],
        totalMonto:       cartTotalMonto.value,
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

      // Guardar datos del cliente en caché local para futuras ventas
      _saveClientToCache(cartCliente.value.trim(), {
        nombres:   cartClienteNombres.value.trim(),
        apellidos: cartClienteApellidos.value.trim(),
        empresa:   cartClienteEmpresa.value.trim(),
        contacto:  cartClienteContacto.value.trim(),
      });

      const voucher = {
        id:               order?._id ? String(order._id) : `VTA-${Date.now()}`,
        ventaFolio:       order?.ventaFolio || null,
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

      const PAGO_LABELS = { trans: "TRANS", efec: "EFEC", credito: "CRÉDITO", tarjeta: "TARJETA C|D" };
      const statuses = {};
      salesHistory.value = orders.map((order) => {
        const id = String(order._id);
        statuses[id] = { status: order.status, folio: order.folio, closedAt: order.closedAt || null };
        const totalPiezas = (order.lines || []).reduce((s, l) => s + (l.qty || 0), 0);
        const pago = Array.isArray(order.pago) ? order.pago : [];
        const pagoDisplay = pago.map((p) => PAGO_LABELS[p] || p).join(" / ") || "—";
        return {
          id,
          labOrderId:       id,
          ventaFolio:       order.ventaFolio || null,
          labFolio:         order.folio,
          labStatus:        order.status,
          fecha:            order.createdAt,
          cliente:          order.cliente,
          clienteDisplay:   order.clienteDisplay   || order.cliente,
          clienteNombres:   order.clienteNombres   || '',
          clienteApellidos: order.clienteApellidos || '',
          clienteEmpresa:   order.clienteEmpresa   || '',
          clienteContacto:  order.clienteContacto  || '',
          note:             order.note || '',
          pago,
          pagoDisplay,
          totalMonto:       order.totalMonto || 0,
          lineas: (order.lines || []).map((l) => ({
            title:       buildLineTitleFromApi(l),
            params:      '',
            codebar:     l.codebar || '',
            qty:         l.qty || 0,
            precio:      l.precio || 0,
            sheetNombre: l.sheetNombre || '',
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

  // Auto-rellenar datos complementarios desde caché cuando el usuario escribe
  // un nombre que coincide exactamente con un cliente guardado anteriormente.
  // Solo aplica si los campos todavía están vacíos para no pisar ediciones manuales.
  watch(cartCliente, (nombre) => {
    if (!nombre) return;
    const cached = _getClientFromCache(nombre.trim());
    if (!cached) return;
    if (!cartClienteNombres.value)   cartClienteNombres.value   = cached.nombres   || "";
    if (!cartClienteApellidos.value) cartClienteApellidos.value = cached.apellidos || "";
    if (!cartClienteEmpresa.value)   cartClienteEmpresa.value   = cached.empresa   || "";
    if (!cartClienteContacto.value)  cartClienteContacto.value  = cached.contacto  || "";
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
