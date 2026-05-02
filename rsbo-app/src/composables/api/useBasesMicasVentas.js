import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import { listSheets as invListSheets, fetchItems as invFetchItems } from "@/services/inventory";
import { createOrder } from "@/services/laboratorio";
import { createGroupedNotification } from "@/services/notifications";
import { 
  normTxt, 
  fv, 
  buildRowTitle, 
  buildRowParams, 
  getActor, 
  PAGO_LABELS 
} from "./_ventasShared";

/**
 * Composable for Bases and Micas sales (orders that go to the laboratory).
 * Implements the VentasStrategy contract.
 */
export function useBasesMicasVentas(getUser) {
  const kind = 'lab';
  const _ac = new AbortController();
  let _wsRefreshTimer = null;
  const WS_STOCK_TYPES = new Set([
    "LAB_ORDER_SCAN",
    "LAB_ORDER_CLOSE",
    "LAB_ORDER_CANCEL",
    "LAB_ORDER_RESET",
    "INVENTORY_CHUNK_SAVED",
    "INV_CHANGE",
  ]);

  function _onLabWs(e) {
    const type = e?.detail?.type;
    if (!WS_STOCK_TYPES.has(type)) return;

    const payload = e?.detail?.payload || {};

    // 1. Intentar actualización SILENCIOSA si es un INV_CHANGE con datos suficientes
    if (type === "INV_CHANGE" && payload.codebar && typeof payload.newStock === "number") {
      const codeStr = String(payload.codebar);
      
      // Actualizar en el catálogo
      const item = itemsDB.value.find(i => String(i.codebar) === codeStr);
      if (item) item.existencias = payload.newStock;

      // Actualizar en el CARRITO
      const inCart = cartItems.value.find(ci => String(ci.row.codebar) === codeStr);
      if (inCart) {
        inCart.row.existencias = payload.newStock;
        // 🛡️ CAPEO AUTOMÁTICO: Si la cantidad en carrito supera el nuevo stock, bajarla al máximo disponible
        if (inCart.qty > payload.newStock) {
          inCart.qty = Math.max(0, payload.newStock);
        }
      }

      // Si lo encontramos en catálogo o carrito, podemos dar por terminada la actualización quirúrgica
      if (item || inCart) return;
    }

    // 2. Fallback: recarga completa con debounce para otros casos
    const sheetIds = payload.sheetIds;
    if (Array.isArray(sheetIds) && sheetIds.length > 0 && !sheetIds.includes(selectedSheetId.value)) return;
    if (payload.sheetId && String(payload.sheetId) !== String(selectedSheetId.value)) return;

    clearTimeout(_wsRefreshTimer);
    _wsRefreshTimer = setTimeout(() => loadItems(true), 1500);
  }

  onBeforeUnmount(() => {
    _ac.abort();
    clearTimeout(_wsRefreshTimer);
    window.removeEventListener("lab:ws", _onLabWs);
  });

  // ── DB state ──────────────────────────────────────────────────────────────
  const sheetsDB = ref([]);
  const itemsDB  = ref([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const selectedSheetId = ref("");
  const itemQuery       = ref("");
  const stockFilter     = ref("withStock");
  const catalogPage     = ref(1);
  const catalogPageSize = ref(15);

  const cartItems            = ref([]);
  const cartCliente          = ref("");
  const cartNote             = ref("");
  const cartClienteNombres   = ref("");
  const cartClienteApellidos = ref("");
  const cartClienteEmpresa   = ref("");
  const cartClienteContacto  = ref("");
  const cartPago             = ref([]);

  const loadingSheets      = ref(false);
  const loadingItems       = ref(false);
  const loadingSale        = ref(false);
  const sheetSearchLoading = ref(false);
  const sheetSearchQuery   = ref("");

  const voucherOpen  = ref(false);
  const lastVoucher  = ref(null);

  // ── Computed ──────────────────────────────────────────────────────────────

  const selectedSheet = computed(() =>
    sheetsDB.value.find((s) => String(s.id) === String(selectedSheetId.value)) || null
  );

  const filteredItems = computed(() => {
    let rows = itemsDB.value;
    if (stockFilter.value === "withStock") rows = rows.filter((r) => r.existencias > 0);
    else if (stockFilter.value === "zero") rows = rows.filter((r) => r.existencias === 0);

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

  const sheetSearchResults = computed(() => {
    const q = normTxt(sheetSearchQuery.value);
    if (!q) return sheetsDB.value;
    return sheetsDB.value.filter(s =>
      normTxt(s.nombre).includes(q) ||
      normTxt(s.sku).includes(q) ||
      normTxt(s.material).includes(q)
    );
  });

  // ── Actions ───────────────────────────────────────────────────────────────

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
      mapped.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      sheetsDB.value = mapped;
      if (!selectedSheetId.value && mapped.length) selectedSheetId.value = mapped[0].id;
    } catch (e) {
      labToast.danger("No se pudieron cargar las planillas");
    } finally {
      loadingSheets.value = false;
    }
  }

  let itemsAc = null;
  async function loadItems(silent = false) {
    const sid = selectedSheetId.value;
    if (!sid) { itemsDB.value = []; return; }
    
    // Abortar petición previa si existe
    if (itemsAc) itemsAc.abort();
    itemsAc = new AbortController();
    
    if (!silent) loadingItems.value = true;
    try {
      const { data } = await invFetchItems(sid, { limit: 500, signal: itemsAc.signal });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const sheet = sheetsDB.value.find((s) => String(s.id) === String(sid)) || null;
      itemsDB.value = arr.map((r) => ({
        ...r,
        existencias: Number(r.existencias ?? 0),
        precioVenta: Number(sheet?.precioVenta || 0),
        _normTitle:  normTxt(buildRowTitle(r, sheet)),
        _normParams: normTxt(buildRowParams(r, sheet)),
        _normCode:   normTxt(r.codebar || "")
      }));
      
      // 🔄 Sincronizar el carrito con los nuevos datos del catálogo
      cartItems.value.forEach(ci => {
        const matching = itemsDB.value.find(i => String(i.codebar) === String(ci.row.codebar));
        if (matching) {
          ci.row.existencias = matching.existencias;
          // 🛡️ CAPEO AUTOMÁTICO
          if (ci.qty > matching.existencias) {
            ci.qty = Math.max(0, matching.existencias);
          }
        }
      });

      catalogPage.value = 1;
    } catch (e) {
      if (e.name === "AbortError") return;
      labToast.danger("Error al cargar productos");
    } finally {
      if (itemsAc?.signal.aborted) return;
      loadingItems.value = false;
    }
  }

  function addToCart(row) {
    const sheet = selectedSheet.value;
    if (!sheet) return;
    const key = `${sheet.id}::${row._id ?? row.codebar ?? buildRowParams(row, sheet)}`;
    const existing = cartItems.value.find((ci) => ci.key === key);
    if (existing) {
      if (existing.qty < Number(row.existencias ?? 0)) existing.qty++;
      else labToast.warning("Stock insuficiente");
      return;
    }
    if (Number(row.existencias ?? 0) < 1) { labToast.warning("Sin stock"); return; }
    cartItems.value.push({
      key, row: { ...row }, sheetId: sheet.id, sheet: { ...sheet },
      qty: 1, precio: Number(sheet.precioVenta || 0),
      title: buildRowTitle(row, sheet), params: buildRowParams(row, sheet)
    });
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
    cartItems.value = [];
    cartCliente.value = "";
    cartNote.value = "";
    cartClienteNombres.value = "";
    cartClienteApellidos.value = "";
    cartClienteEmpresa.value = "";
    cartClienteContacto.value = "";
    cartPago.value = [];
  }

  async function registrarVenta() {
    if (loadingSale.value) return;
    if (!cartItems.value.length) { labToast.warning("Carrito vacío"); return; }
    
    const clienteVal = String(cartCliente.value || "").trim();
    if (!clienteVal) { labToast.warning("Nombre de cliente requerido"); return; }

    loadingSale.value = true;
    const actor = getActor(getUser);
    try {
      const lines = cartItems.value.map((ci) => ({
        codebar: ci.row.codebar, qty: ci.qty, sheetId: ci.sheetId, precio: Number(ci.precio) || 0
      }));
      const pagoArr = Array.isArray(cartPago.value) ? cartPago.value : [];
      const pagoDisplay = pagoArr.map((p) => PAGO_LABELS[p] || p).join(" / ") || "—";

      const { data } = await createOrder({
        sheetId: selectedSheetId.value,
        cliente: cartCliente.value.trim(),
        clienteDisplay: cartClienteDisplay.value,
        clienteNombres: cartClienteNombres.value.trim(),
        clienteApellidos: cartClienteApellidos.value.trim(),
        clienteEmpresa: cartClienteEmpresa.value.trim(),
        clienteContacto: cartClienteContacto.value.trim(),
        note: cartNote.value.trim(),
        pago: [...cartPago.value],
        totalMonto: cartTotalMonto.value,
        lines,
        actor
      });

      const order = data?.data;
      lastVoucher.value = {
        ...order,
        id: String(order._id),
        fecha: order.createdAt,
        lineas: cartItems.value.map(ci => ({ ...ci, sheetNombre: ci.sheet.nombre })),
        totalPiezas: cartTotal.value,
        pagoDisplay,
        actor: actor?.name || "Usuario"
      };
      voucherOpen.value = true;
      clearCart();
      labToast.success(`Pedido ${order?.folio || ""} enviado`);

      createGroupedNotification({
        groupKey: "pending_orders",
        title: "Pedidos pendientes",
        messageTemplate: "{count} pedido(s) pendiente(s) de atención",
        type: "warning", priority: "medium",
        targetRoles: ["laboratorio", "supervisor", "ventas"],
      }).catch(() => {});
      
      return order;
    } catch (e) {
      labToast.danger(e?.response?.data?.message || "Error al crear pedido");
      throw e;
    } finally {
      loadingSale.value = false;
    }
  }

  // ── Watchers ──────────────────────────────────────────────────────────────
  watch(selectedSheetId, () => { loadItems(); });
  watch([itemQuery, stockFilter], () => { catalogPage.value = 1; });
  watch([cartClienteNombres, cartClienteApellidos], () => {
    const n = cartClienteNombres.value.trim();
    const a = cartClienteApellidos.value.trim();
    if (n || a) cartCliente.value = [n, a].filter(Boolean).join(" ");
  });

  onMounted(() => {
    loadSheets();
    window.addEventListener("lab:ws", _onLabWs);
  });

  // ── Expose grouped for Strategy contract ──────────────────────────────────
  return {
    kind,
    catalog: {
      items: itemsDB,
      filteredItems,
      paginatedItems,
      catalogPage,
      catalogPages,
      catalogPageSize,
      selectedSheet,
      selectedSheetId,
      itemQuery,
      stockFilter,
      loadingItems,
      loadingSheets,
      sheetSearchResults,
      sheetTitle: (s) => s?.nombre || "—",
      buildRowTitle,
      searchSheets: (q) => { sheetSearchQuery.value = q; },
      reload: loadItems
    },
    cart: {
      items: cartItems,
      cliente: cartCliente,
      note: cartNote,
      nombres: cartClienteNombres,
      apellidos: cartClienteApellidos,
      empresa: cartClienteEmpresa,
      contacto: cartClienteContacto,
      pago: cartPago,
      total: cartTotal,
      totalMonto: cartTotalMonto,
      loadingSale
    },
    // Expose flat for v-model compatibility in Dashboard
    selectedSheetId, itemQuery, stockFilter, catalogPage,
    cartCliente, cartNote, cartClienteNombres, cartClienteApellidos, 
    cartClienteEmpresa, cartClienteContacto, cartPago,
    
    addToCart, removeFromCart, incCartQty, decCartQty, clearCart,
    registrarVenta, loadItems,
    lastVoucher, voucherOpen,
    loadingSale,
    sheetsDB // for some internal uses
  };
}
