import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import { 
  armazonesService,
  accesoriosService,
  solucionesService,
  estuchesService,
  lentesService,
  equiposService
} from "@/services/optica";
import { createOrder } from "@/services/laboratorio";
import { createOpticaSale } from "@/services/opticaSales";
import { 
  normTxt, 
  getActor 
} from "./_ventasShared";

const COLLECTIONS = [
  { id: 'armazones', nombre: 'Armazones', service: armazonesService },
  { id: 'accesorios', nombre: 'Accesorios', service: accesoriosService },
  { id: 'soluciones', nombre: 'Soluciones', service: solucionesService },
  { id: 'estuches', nombre: 'Estuches', service: estuchesService },
  { id: 'lentes', nombre: 'Lentes Terminado', service: lentesService },
  { id: 'equipos', nombre: 'Equipos', service: equiposService },
];

/**
 * Strategy for Optica sales (direct sales from collections).
 */
export function useOpticaVentas(getUser) {
  const kind = 'direct';
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
    const colId = payload.collection;

    console.log(`[WS][OPTICA-VENTAS] Event: ${type}`, payload);

    if (type === "INV_CHANGE" && payload.id && typeof payload.newStock === "number") {
      const itemId = String(payload.id);
      let found = false;

      if (colId === selectedSheetId.value) {
        const item = itemsDB.value.find(i => String(i._id || i.id) === itemId);
        if (item) {
          item.existencias = payload.newStock;
          found = true;
        }
      }

      const inCart = cartItems.value.find(ci => String(ci.row._id || ci.row.id) === itemId);
      if (inCart) {
        inCart.row.existencias = payload.newStock;
        if (inCart.qty > payload.newStock) inCart.qty = Math.max(0, payload.newStock);
        found = true;
      }

      if (found) {
        console.log(`[WS][OPTICA-VENTAS] Surgical update success`);
        return;
      }
    }

    if (colId && colId !== selectedSheetId.value) return;

    clearTimeout(_wsRefreshTimer);
    _wsRefreshTimer = setTimeout(() => {
      console.log(`[WS][OPTICA-VENTAS] Fallback reload`);
      loadItems(true);
    }, 1500);
  }

  onBeforeUnmount(() => {
    _ac.abort();
    clearTimeout(_wsRefreshTimer);
    window.removeEventListener("lab:ws", _onLabWs);
  });

  const itemsDB = ref([]);
  const selectedSheetId = ref("armazones"); // Using this as collection id
  const itemQuery = ref("");
  const stockFilter = ref("withStock");
  const catalogPage = ref(1);
  const catalogPageSize = ref(15);

  const cartItems = ref([]);
  const cartCliente = ref("");
  const cartNote = ref("");
  const cartClienteNombres = ref("");
  const cartClienteApellidos = ref("");
  const cartClienteEmpresa = ref("");
  const cartClienteContacto = ref("");
  const cartPago = ref([]);

  const loadingItems = ref(false);
  const loadingSale = ref(false);

  const voucherOpen = ref(false);
  const lastVoucher = ref(null);

  const filteredItems = computed(() => {
    let rows = itemsDB.value;
    if (stockFilter.value === "withStock") rows = rows.filter((r) => r.existencias > 0);
    else if (stockFilter.value === "zero") rows = rows.filter((r) => r.existencias === 0);

    const q = normTxt(itemQuery.value);
    if (q) {
      rows = rows.filter((r) =>
        normTxt(r.brand || "").includes(q) ||
        normTxt(r.model || "").includes(q) ||
        normTxt(r.color || "").includes(q) ||
        normTxt(r.codebar || "").includes(q) ||
        normTxt(r.name || "").includes(q)
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

  const cartTotal = computed(() => cartItems.value.reduce((s, i) => s + i.qty, 0));
  const cartTotalMonto = computed(() =>
    cartItems.value.reduce((sum, ci) => sum + ci.qty * (Number(ci.precio) || 0), 0)
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const buildRowTitle = (row) => {
    const parts = [row.marca, row.modelo, row.color].filter(Boolean);
    return parts.length ? parts.join(" ") : (row.name || "Producto");
  };

  const buildRowParams = (row) => {
    const p = [];
    if (row.material) p.push(row.material);
    if (row.tipo) p.push(row.tipo);
    if (row.genero) p.push(row.genero);
    if (row.talla) p.push(row.talla);
    return p.join(" | ");
  };

  let itemsAc = null;
  async function loadItems(silent = false) {
    const colId = selectedSheetId.value;
    const col = COLLECTIONS.find(c => c.id === colId);
    if (!col) return;

    if (itemsAc) itemsAc.abort();
    itemsAc = new AbortController();

    if (!silent) loadingItems.value = true;
    try {
      const { data } = await col.service.list({ signal: itemsAc.signal });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      itemsDB.value = arr.map(r => ({
        ...r,
        existencias: Number(r.stock ?? r.existencias ?? 0),
        precioVenta: Number(r.precio ?? r.precioVenta ?? 0),
        _normTitle:  normTxt(buildRowTitle(r)),
        _normParams: normTxt(buildRowParams(r)),
        _normCode:   normTxt(r.sku || r.codebar || "")
      }));

      // 🔄 Sincronizar el carrito con los nuevos datos del catálogo
      cartItems.value.forEach(ci => {
        const matching = itemsDB.value.find(i => String(i._id || i.id) === String(ci.row._id || ci.row.id));
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
      labToast.danger(`Error al cargar ${col.nombre}`);
    } finally {
      if (itemsAc?.signal.aborted) return;
      loadingItems.value = false;
    }
  }

  function addToCart(row) {
    const key = `${selectedSheetId.value}::${row._id ?? row.sku ?? row.codebar}`;
    const existing = cartItems.value.find((ci) => ci.key === key);
    if (existing) {
      if (existing.qty < Number(row.existencias ?? 0)) existing.qty++;
      else labToast.warning("Stock insuficiente");
      return;
    }
    if (Number(row.existencias ?? 0) < 1) { labToast.warning("Sin stock"); return; }
    
    const title = [row.marca, row.modelo, row.color].filter(Boolean).join(" ");
    const params = [row.material, row.tipo, row.genero, row.talla].filter(Boolean).join(" | ");
    
    cartItems.value.push({
      key, row: { ...row }, 
      qty: 1, 
      precio: Number(row.precioVenta || 0),
      title: title || row.name || 'Producto',
      params
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
      // 🚀 VENTA DIRECTA: Persistimos la venta y descontamos stock en una sola llamada al backend
      const salePayload = {
        cliente: clienteVal,
        clientePhone: cartNote.value, // Usando nota como teléfono temporalmente si no hay campo específico
        total: cartTotalMonto.value,
        items: cartItems.value.map(ci => ({
          collection: ci.key.split("::")[0],
          documentId: ci.row._id,
          sku: ci.row.sku,
          description: ci.title,
          qty: ci.qty,
          precio: ci.precio
        }))
      };

      const saleResult = await createOpticaSale(salePayload);
      const saleData = saleResult.data;

      lastVoucher.value = {
        ...saleData,
        id: saleData._id,
        fecha: saleData.createdAt,
        lineas: cartItems.value,
        totalPiezas: cartTotal.value,
        actor: actor?.name || "Usuario",
        ventaFolio: saleData.folio
      };
      const fakeOrder = saleData; // Para mantener compatibilidad con el retorno original

      voucherOpen.value = true;
      clearCart();
      labToast.success(`Venta de óptica registrada correctamente`);
      
      // Recargar catálogo para ver el nuevo stock
      loadItems();
      
      return fakeOrder;
    } catch (e) {
      console.error("Error en venta de óptica:", e);
      labToast.danger("Error al registrar venta de óptica");
      throw e;
    } finally {
      loadingSale.value = false;
    }
  }

  watch(selectedSheetId, () => { loadItems(); });
  watch([itemQuery, stockFilter], () => { catalogPage.value = 1; });
  watch([cartClienteNombres, cartClienteApellidos], () => {
    const n = cartClienteNombres.value.trim();
    const a = cartClienteApellidos.value.trim();
    if (n || a) cartCliente.value = [n, a].filter(Boolean).join(" ");
  });

  onMounted(() => {
    loadItems();
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
      selectedSheet: computed(() => COLLECTIONS.find(c => c.id === selectedSheetId.value)),
      selectedSheetId,
      itemQuery,
      stockFilter,
      loadingItems,
      loadingSheets: ref(false),
      sheetSearchResults: ref(COLLECTIONS),
      sheetTitle: (s) => s?.nombre || "—",
      buildRowTitle,
      buildRowParams,
      searchSheets: () => {},
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
    itemQuery, stockFilter, catalogPage, selectedSheetId,
    cartCliente, cartNote, cartClienteNombres, cartClienteApellidos, 
    cartClienteEmpresa, cartClienteContacto, cartPago,
    addToCart, removeFromCart, incCartQty, decCartQty, clearCart,
    registrarVenta, loadItems,
    lastVoucher, voucherOpen,
    loadingSale,
    sheetsDB: ref(COLLECTIONS)
  };
}
