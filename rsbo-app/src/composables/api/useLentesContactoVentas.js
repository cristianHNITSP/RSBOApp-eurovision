import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import {
  listContactLensSheets
} from "@/services/contactlenses";
import { registerInventorySale } from "@/services/inventory";
import { createOrder } from "@/services/laboratorio";
import { useSalesCatalog } from "@/composables/api/useSalesCatalog";
import {
  normTxt,
  buildRowTitle,
  buildRowParams,
  getActor
} from "./_ventasShared";

/**
 * Strategy for Lentes de Contacto sales.
 */
export function useLentesContactoVentas(getUser) {
  const kind = 'direct';
  const _ac = new AbortController();
  let _wsRefreshTimer = null;

  const catalog = useSalesCatalog({ category: 'contact-lenses', pageSize: 7 });

  const WS_REFRESH_TYPES = new Set(["INVENTORY_CHUNK_SAVED", "INV_CHANGE"]);

  function _onLabWs(e) {
    const type = e?.detail?.type;
    if (!WS_REFRESH_TYPES.has(type)) return;
    const payload = e?.detail?.payload || {};
    const sid = payload.sheetId;

    if (type === "INV_CHANGE" && payload.codebar && typeof payload.newStock === "number") {
      const codeStr = String(payload.codebar);
      let found = false;
      if (String(sid || "") === String(catalog.selectedSheetId.value)) {
        const item = catalog.items.value.find(i => String(i.codebar) === codeStr);
        if (item) { item.existencias = payload.newStock; found = true; }
      }
      const inCart = cartItems.value.find(ci => String(ci.row.codebar) === codeStr);
      if (inCart) {
        inCart.row.existencias = payload.newStock;
        if (inCart.qty > payload.newStock) inCart.qty = Math.max(0, payload.newStock);
        found = true;
      }
      if (found) return;
    }
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
  const selectedAxis = ref(180); // 🚀 180° por defecto como pidió el usuario

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
  const voucherOpen = ref(false);
  const lastVoucher = ref(null);

  const selectedSheetId = catalog.selectedSheetId;
  const itemQuery = catalog.searchQuery;
  const stockFilter = catalog.stockFilter;
  const catalogPage = catalog.currentPage;
  const catalogPageSize = catalog.pageSize;
  const itemsDB = catalog.items;
  const totalItems = catalog.totalItems;
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

  const availableAxes = computed(() => {
    const axes = [];
    // 🚀 Lista inversa de 180 a 10 como pidió el usuario
    for (let a = 180; a >= 10; a -= 10) {
      axes.push({ id: a, name: `${a}°` });
    }
    return axes;
  });

  const isToric = computed(() => selectedSheet.value?.tipo_matriz === 'SPH_CYL_AXIS');

  async function loadSheets() {
    loadingSheets.value = true;
    try {
      const { data } = await listContactLensSheets({ signal: _ac.signal });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const mapped = arr.map((s) => ({
        ...s, id: String(s._id ?? s.id ?? ""), nombre: s.nombre ?? s.name ?? "",
      }));
      sheetsDB.value = mapped;
      if (!selectedSheetId.value && mapped.length) selectedSheetId.value = mapped[0].id;
    } catch (e) {
      labToast.danger("Error al cargar planillas de LC");
    } finally {
      loadingSheets.value = false;
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
      const salePayload = {
        cliente: clienteVal,
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
          category: 'contact-lenses',
          // ✅ Parámetros clínicos numéricos individuales (igual que LaboratoryOrder.lines[].params)
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
      await registerInventorySale(salePayload);

      const fakeOrder = {
        _id: `SALE-${Date.now()}`,
        folio: `VTA-LC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        cliente: clienteVal, totalMonto: cartTotalMonto.value,
        createdAt: new Date(), status: 'completado'
      };

      lastVoucher.value = {
        ...fakeOrder, id: fakeOrder._id, fecha: fakeOrder.createdAt,
        lineas: cartItems.value.map(ci => ({ ...ci, sheetNombre: ci.sheet.nombre })),
        totalPiezas: cartTotal.value, actor: actor?.name || "Usuario",
        ventaFolio: fakeOrder.folio
      };
      voucherOpen.value = true; clearCart();
      labToast.success(`Venta de LC registrada`);
      return fakeOrder;
    } catch (e) {
      labToast.danger("Error al registrar venta"); throw e;
    } finally {
      loadingSale.value = false;
    }
  }

  // ── Watchers ──────────────────────────────────────────────────────────────
  watch(selectedAxis, (val) => {
    const axisVal = (val && typeof val === 'object') ? val.id : val;
    catalog.extraFilters.value = { ...catalog.extraFilters.value, axis: axisVal };
  });

  watch(selectedSheetId, () => {
    // 🚀 Al cambiar de planilla, si es tórico, resetear a 180
    if (isToric.value) selectedAxis.value = 180;
    else selectedAxis.value = null;
    
    catalog.extraFilters.value = { axis: selectedAxis.value };
    catalog.fetchItems();
  });
  watch([itemQuery, stockFilter], () => { catalogPage.value = 1; });

  onMounted(() => {
    loadSheets();
    window.addEventListener("lab:ws", _onLabWs);
  });

  return {
    kind,
    catalog: {
      paginatedItems, filteredItems,
      catalogPage, catalogPages, catalogPageSize,
      selectedSheet, selectedSheetId,
      itemQuery, stockFilter,
      loadingItems, loadingSheets,
      sheetSearchResults,
      sheetTitle: (s) => s?.nombre || "—",
      buildRowTitle,
      searchSheets: (q) => { sheetSearchQuery.value = q; },
      reload: () => catalog.fetchItems(),
      isToric, selectedAxis, availableAxes
    },
    cart: {
      items: cartItems, cliente: cartCliente, note: cartNote,
      nombres: cartClienteNombres, apellidos: cartClienteApellidos,
      pago: cartPago, total: cartTotal, totalMonto: cartTotalMonto,
      loadingSale
    },
    selectedSheetId, itemQuery, stockFilter, catalogPage,
    cartCliente, cartNote, cartClienteNombres, cartClienteApellidos,
    addToCart, removeFromCart, incCartQty, decCartQty, clearCart,
    registrarVenta, lastVoucher, voucherOpen, loadingSale, sheetsDB
  };
}
