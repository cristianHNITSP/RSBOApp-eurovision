import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import { 
  listContactLensSheets, 
  fetchContactLensItems,
  registerContactLensSale
} from "@/services/contactlenses";
import { createOrder } from "@/services/laboratorio"; // Assuming LC orders also go to lab or are registered here
import { 
  normTxt, 
  buildRowTitle, 
  buildRowParams, 
  getActor 
} from "./_ventasShared";

/**
 * Strategy for Lentes de Contacto sales.
 * Uses sheets/matrices similar to Bases y Micas.
 */
export function useLentesContactoVentas(getUser) {
  const kind = 'direct'; // User specified direct, but we'll see
  const _ac = new AbortController();
  let _wsRefreshTimer = null;

  const WS_REFRESH_TYPES = new Set([
    "INVENTORY_CHUNK_SAVED",
    "INV_CHANGE",
  ]);

  function _onLabWs(e) {
    const type = e?.detail?.type;
    if (!WS_REFRESH_TYPES.has(type)) return;
    
    const payload = e?.detail?.payload || {};
    const sid = payload.sheetId;

    console.log(`[WS][LC-VENTAS] Event: ${type}`, payload);

    if (type === "INV_CHANGE" && payload.codebar && typeof payload.newStock === "number") {
      const codeStr = String(payload.codebar);
      let found = false;

      if (String(sid || "") === String(selectedSheetId.value)) {
        const item = itemsDB.value.find(i => String(i.codebar) === codeStr);
        if (item) {
          item.existencias = payload.newStock;
          found = true;
        }
      }

      const inCart = cartItems.value.find(ci => String(ci.row.codebar) === codeStr);
      if (inCart) {
        inCart.row.existencias = payload.newStock;
        if (inCart.qty > payload.newStock) inCart.qty = Math.max(0, payload.newStock);
        found = true;
      }

      if (found) {
        console.log(`[WS][LC-VENTAS] Surgical update success`);
        return;
      }
    }

    if (sid && String(sid) !== String(selectedSheetId.value)) return;

    clearTimeout(_wsRefreshTimer);
    _wsRefreshTimer = setTimeout(() => {
      console.log(`[WS][LC-VENTAS] Fallback reload`);
      loadItems(true);
    }, 1500);
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
  const selectedAxis    = ref(null); // New state for filtering by axis

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

  const sheetSearchResults = computed(() => {
    const q = normTxt(sheetSearchQuery.value);
    if (!q) return sheetsDB.value;
    return sheetsDB.value.filter(s =>
      normTxt(s.nombre).includes(q) ||
      normTxt(s.sku).includes(q) ||
      normTxt(s.material).includes(q)
    );
  });

  const availableAxes = computed(() => {
    // Standard toric axes are 10-180 in steps of 10.
    const axes = [];
    for (let a = 10; a <= 180; a += 10) {
      axes.push({ id: a, name: `${a}°` });
    }
    return axes;
  });

  const isToric = computed(() => selectedSheet.value?.tipo_matriz === 'SPH_CYL_AXIS');

  // ── Actions ───────────────────────────────────────────────────────────────

  async function loadSheets() {
    loadingSheets.value = true;
    try {
      const { data } = await listContactLensSheets({ signal: _ac.signal });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const mapped = arr.map((s) => ({
        ...s,
        id:          String(s._id ?? s.id ?? ""),
        nombre:      s.nombre ?? s.name ?? "",
      }));
      sheetsDB.value = mapped;
      if (!selectedSheetId.value && mapped.length) selectedSheetId.value = mapped[0].id;
    } catch (e) {
      labToast.danger("Error al cargar planillas de LC");
    } finally {
      loadingSheets.value = false;
    }
  }

  let itemsAc = null;
  async function loadItems(silent = false) {
    const sid = selectedSheetId.value;
    if (!sid) { itemsDB.value = []; return; }

    if (itemsAc) itemsAc.abort();
    itemsAc = new AbortController();

    if (!silent) loadingItems.value = true;
    try {
      const { data } = await fetchContactLensItems(sid, { 
        limit: 500, 
        withStock: stockFilter.value === "withStock",
        axisMin: selectedAxis.value || undefined,
        axisMax: selectedAxis.value || undefined,
        signal: itemsAc.signal 
      });
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
      if (e.name === 'AbortError') return;
      labToast.danger("Error al cargar lentes de contacto");
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
      // 🚀 VENTA DIRECTA: Iteramos por los productos y descontamos stock de inmediato
      const results = [];
      for (const ci of cartItems.value) {
        const { data } = await registerContactLensSale(ci.sheetId, {
          codebar: ci.row.codebar,
          qty: ci.qty,
          actor
        });
        results.push(data);
      }

      // Mock de "order" para el voucher (ya que no hay LaboratoryOrder real)
      const fakeOrder = {
        _id: `SALE-${Date.now()}`,
        folio: `VTA-LC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
        cliente: clienteVal,
        totalMonto: cartTotalMonto.value,
        createdAt: new Date(),
        status: 'completado'
      };

      lastVoucher.value = {
        ...fakeOrder,
        id: fakeOrder._id,
        fecha: fakeOrder.createdAt,
        lineas: cartItems.value.map(ci => ({ ...ci, sheetNombre: ci.sheet.nombre })),
        totalPiezas: cartTotal.value,
        actor: actor?.name || "Usuario"
      };
      voucherOpen.value = true;
      clearCart();
      labToast.success(`Venta de LC registrada`);
      
      return fakeOrder;
    } catch (e) {
      labToast.danger("Error al registrar venta");
      throw e;
    } finally {
      loadingSale.value = false;
    }
  }

  // ── Watchers ──────────────────────────────────────────────────────────────
  watch(selectedSheetId, () => { 
    selectedAxis.value = null; // Reset axis when sheet changes
    loadItems(); 
  });
  watch(selectedAxis, () => { loadItems(); });
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
      reload: loadItems,
      isToric,
      selectedAxis,
      availableAxes
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
    selectedSheetId, itemQuery, stockFilter, catalogPage,
    cartCliente, cartNote, cartClienteNombres, cartClienteApellidos, 
    cartClienteEmpresa, cartClienteContacto, cartPago,
    addToCart, removeFromCart, incCartQty, decCartQty, clearCart,
    registrarVenta, loadItems,
    lastVoucher, voucherOpen,
    loadingSale,
    sheetsDB
  };
}
