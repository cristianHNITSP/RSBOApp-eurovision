import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import { listSheets as invListSheets, registerInventorySale } from "@/services/inventory";
import { createOrder } from "@/services/laboratorio";
import { useSalesCatalog } from "@/composables/api/useSalesCatalog";
import {
  normTxt,
  buildRowTitle,
  buildRowParams,
  getActor,
  PAGO_LABELS
} from "./_ventasShared";

/**
 * Strategy for Bases and Micas sales.
 */
export function useBasesMicasVentas(getUser) {
  const kind = 'lab';
  const _ac = new AbortController();
  let _wsRefreshTimer = null;
  
  const catalog = useSalesCatalog({ category: 'inventory', pageSize: 7 });

  const WS_STOCK_TYPES = new Set([
    "LAB_ORDER_SCAN", "LAB_ORDER_CLOSE", "LAB_ORDER_CANCEL", "LAB_ORDER_RESET",
    "INVENTORY_CHUNK_SAVED", "INV_CHANGE",
  ]);

  function _onLabWs(e) {
    const type = e?.detail?.type;
    if (!WS_STOCK_TYPES.has(type)) return;
    const payload = e?.detail?.payload || {};

    if (type === "INV_CHANGE" && payload.codebar && typeof payload.newStock === "number") {
      const codeStr = String(payload.codebar);
      const item = catalog.items.value.find(i => String(i.codebar) === codeStr);
      if (item) item.existencias = payload.newStock;
      const inCart = cartItems.value.find(ci => String(ci.row.codebar) === codeStr);
      if (inCart) {
        inCart.row.existencias = payload.newStock;
        if (inCart.qty > payload.newStock) inCart.qty = Math.max(0, payload.newStock);
      }
      if (item || inCart) return;
    }

    const sid = payload.sheetId;
    if (sid && String(sid) !== String(catalog.selectedSheetId.value)) return;

    clearTimeout(_wsRefreshTimer);
    _wsRefreshTimer = setTimeout(() => catalog.fetchItems(), 1500);
  }

  onBeforeUnmount(() => {
    _ac.abort();
    clearTimeout(_wsRefreshTimer);
    window.removeEventListener("lab:ws", _onLabWs);
  });

  const sheetsDB = ref([]);
  const cartItems = ref([]);
  const cartCliente = ref("");
  const cartNote = ref("");
  const cartClienteNombres = ref("");
  const cartClienteApellidos = ref("");
  const cartClienteEmpresa = ref("");
  const cartClienteContacto = ref("");
  const cartPago = ref([]);
  const loadingSheets = ref(false);
  const loadingSale = ref(false);
  const sheetSearchQuery = ref("");
  const doDirectSale = ref(false);
  const doLabOrder = ref(true);
  const voucherOpen = ref(false);
  const lastVoucher = ref(null);

  const selectedSheetId = catalog.selectedSheetId;
  const itemQuery = catalog.searchQuery;
  const stockFilter = catalog.stockFilter;
  const catalogPage = catalog.currentPage;
  const catalogPageSize = catalog.pageSize;
  const itemsDB = catalog.items;
  const catalogPages = catalog.totalPages;
  const loadingItems = catalog.loading;

  const selectedSheet = computed(() =>
    sheetsDB.value.find((s) => String(s.id) === String(selectedSheetId.value)) || null
  );

  const filteredItems = computed(() => itemsDB.value);
  const paginatedItems = computed(() => itemsDB.value);

  const cartTotal = computed(() => cartItems.value.reduce((sum, ci) => sum + ci.qty, 0));
  const cartTotalMonto = computed(() =>
    cartItems.value.reduce((sum, ci) => sum + ci.qty * (Number(ci.precio) || 0), 0)
  );

  const sheetSearchResults = computed(() => {
    const q = normTxt(sheetSearchQuery.value);
    if (!q) return sheetsDB.value;
    return sheetsDB.value.filter(s =>
      normTxt(s.nombre).includes(q) || normTxt(s.sku).includes(q) || normTxt(s.material).includes(q)
    );
  });

  async function loadSheets() {
    loadingSheets.value = true;
    try {
      const { data } = await invListSheets({ signal: _ac.signal });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const mapped = arr.map((s) => ({
        ...s, id: String(s._id ?? s.id ?? ""), nombre: s.nombre ?? s.name ?? "",
        tratamientos: Array.isArray(s.tratamientos) ? s.tratamientos : []
      }));
      mapped.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      sheetsDB.value = mapped;
      if (!selectedSheetId.value && mapped.length) selectedSheetId.value = mapped[0].id;
    } catch (e) {
      if (e.name === 'AbortError') return;
      labToast.danger("No se pudieron cargar las planillas");
    } finally {
      loadingSheets.value = false;
    }
  }

  function addToCart(row) {
    const sheet = selectedSheet.value;
    if (!sheet) return;
    const key = `${sheet.id}::${row._k ?? row.sku ?? buildRowParams(row, sheet)}`;
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
    cartItems.value = []; cartCliente.value = ""; cartNote.value = "";
    cartClienteNombres.value = ""; cartClienteApellidos.value = "";
    cartClienteEmpresa.value = ""; cartClienteContacto.value = ""; cartPago.value = [];
  }

  async function registrarVenta() {
    if (loadingSale.value) return;
    if (!cartItems.value.length) { labToast.warning("Carrito vacío"); return; }
    const clienteVal = String(cartCliente.value || "").trim();
    if (!clienteVal) { labToast.warning("Nombre de cliente requerido"); return; }

    loadingSale.value = true;
    const actor = getActor(getUser);
    try {
      let order = null;
      if (doLabOrder.value) {
        const lines = cartItems.value.map((ci) => ({
          codebar: ci.row.codebar, qty: ci.qty, sheetId: ci.sheetId, precio: Number(ci.precio) || 0,
          matrixKey: ci.row.matrixKey, eye: ci.row.eye
        }));
        const { data } = await createOrder({
          sheetId: selectedSheetId.value, cliente: cartCliente.value.trim(),
          clienteDisplay: [cartClienteNombres.value, cartClienteApellidos.value].filter(Boolean).join(" "),
          clienteNombres: cartClienteNombres.value.trim(), clienteApellidos: cartClienteApellidos.value.trim(),
          pago: [...cartPago.value], totalMonto: cartTotalMonto.value, lines, actor
        });
        order = data?.data;
      } else {
        // Venta Directa de Inventario (Bases/Micas sin pasar por laboratorio)
        const salePayload = {
          cliente: cartCliente.value.trim(),
          clientePhone: cartClienteContacto.value.trim() || cartNote.value.trim(),
          total: cartTotalMonto.value,
          pago: [...cartPago.value],
          items: cartItems.value.map(ci => ({
            sheet: ci.sheetId,
            matrixKey: ci.row.matrixKey,
            eye: ci.row.eye || null,
            qty: ci.qty,
            sku: ci.row.sku || ci.row.codebar,
            codebar: ci.row.codebar,
            precio: ci.precio,
            description: ci.title,
            category: 'inventory',
            params: {
              sph:      ci.row.sph      ?? null,
              cyl:      ci.row.cyl      ?? null,
              axis:     ci.row.axis     ?? null,
              add:      ci.row.add      ?? null,
              base:     ci.row.base     ?? null,
              base_izq: ci.row.base_izq ?? null,
              base_der: ci.row.base_der ?? null,
            }
          }))
        };
        const { data } = await registerInventorySale(salePayload);
        order = data?.data;
      }

      const pagoDisplay = Array.isArray(cartPago.value) ? cartPago.value.map(p => PAGO_LABELS[p] || p).join("/") : "—";
      lastVoucher.value = {
        ...(order || {}), id: order?._id || `SALE-${Date.now()}`, fecha: order?.createdAt || new Date(),
        lineas: cartItems.value.map(ci => ({ ...ci, sheetNombre: ci.sheet.nombre })),
        totalPiezas: cartTotal.value, actor: actor?.name || "Usuario",
        ventaFolio: order?.folio || `VTA-${Date.now()}`, labStatus: order?.status || 'completado'
      };
      voucherOpen.value = true; clearCart();
      labToast.success(order ? `Pedido ${order.folio} registrado` : "Venta registrada");
      return order;
    } catch (e) {
      labToast.danger("Error al registrar"); throw e;
    } finally {
      loadingSale.value = false;
    }
  }

  watch([cartClienteNombres, cartClienteApellidos], () => {
    const n = cartClienteNombres.value.trim();
    const a = cartClienteApellidos.value.trim();
    if (n || a) cartCliente.value = [n, a].filter(Boolean).join(" ");
  });

  onMounted(() => {
    loadSheets();
    window.addEventListener("lab:ws", _onLabWs);
  });

  return {
    kind,
    catalog: {
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
      reload: () => catalog.fetchItems()
    },
    cart: {
      items: cartItems, cliente: cartCliente, note: cartNote,
      nombres: cartClienteNombres, apellidos: cartClienteApellidos,
      pago: cartPago, total: cartTotal, totalMonto: cartTotalMonto,
      loadingSale, doDirectSale, doLabOrder
    },
    selectedSheetId, itemQuery, stockFilter, catalogPage,
    addToCart, removeFromCart, incCartQty, decCartQty, clearCart,
    registrarVenta, lastVoucher, voucherOpen, loadingSale, sheetsDB
  };
}
