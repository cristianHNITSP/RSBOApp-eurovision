import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import {
  armazonesService,
  accesoriosService,
  solucionesService,
  estuchesService,
  equiposService
} from "@/services/optica";
import { createOrder } from "@/services/laboratorio";
import { createOpticaSale } from "@/services/opticaSales";
import {
  normTxt,
  getActor
} from "./_ventasShared";
import { useSalesCatalog } from "./useSalesCatalog";
import { fetchCatalogItems } from "@/services/optica";

const COLLECTIONS = [
  { id: 'armazones', nombre: 'Armazones' },
  { id: 'accesorios', nombre: 'Accesorios' },
  { id: 'soluciones', nombre: 'Soluciones' },
  { id: 'estuches', nombre: 'Estuches' },
  { id: 'equipos', nombre: 'Equipos' },
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

  const catalog = useSalesCatalog({
    category: 'optica',
    fetcher: fetchCatalogItems,
    pageSize: 7
  });

  // Alias para mantener compatibilidad con la UI existente
  const selectedSheetId = catalog.selectedSheetId;
  const itemQuery = catalog.searchQuery;
  const stockFilter = catalog.stockFilter;
  const catalogPage = catalog.currentPage;

  const itemsDB = catalog.items;
  const filteredItems = catalog.items; // Ya vienen filtrados del server
  const paginatedItems = catalog.items; // Ya vienen paginados del server
  const catalogPages = catalog.totalPages;
  const catalogPageSize = catalog.pageSize;
  const loadingItems = catalog.loading;

  const sheetSearchResults = ref(COLLECTIONS);
  const searchSheets = (q) => {
    const query = (q || "").toLowerCase();
    sheetSearchResults.value = COLLECTIONS.filter(c => c.nombre.toLowerCase().includes(query));
  };

  const buildRowTitle = (r) => {
    if (catalog.selectedSheetId.value === 'armazones') return `${r.marca || r.brand || ''} ${r.modelo || r.model || ''}`;
    return r.name || r.nombre || r.description || "Producto de Óptica";
  };

  const cartItems = ref([]);
  const cartCliente = ref("");
  const cartNote = ref("");
  const cartClienteNombres = ref("");
  const cartClienteApellidos = ref("");
  const cartClienteEmpresa = ref("");
  const cartClienteContacto = ref("");
  const cartPago = ref([]);

  const loadingSale = ref(false);
  const voucherOpen = ref(false);
  const lastVoucher = ref(null);

  const cartTotal = computed(() => cartItems.value.reduce((s, i) => s + i.qty, 0));
  const cartTotalMonto = computed(() =>
    cartItems.value.reduce((sum, ci) => sum + ci.qty * (Number(ci.precio) || 0), 0)
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const buildRowParams = (row) => {
    const p = [];
    if (row.material) p.push(row.material);
    if (row.tipo) p.push(row.tipo);
    if (row.genero) p.push(row.genero);
    if (row.talla) p.push(row.talla);
    return p.join(" | ");
  };

  async function loadItems() {
    catalog.fetchItems();
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
      const salePayload = {
        cliente: clienteVal,
        clientePhone: cartNote.value,
        total: cartTotalMonto.value,
        pago: [...cartPago.value],
        items: cartItems.value.map(ci => ({
          collection: ci.key.split("::")[0],
          documentId: ci.row._id,
          sku: ci.row.sku,
          description: ci.title,
          qty: ci.qty,
          precio: ci.precio
        }))
      };

      // 1. Operación Primaria: Registrar en Óptica
      const saleResult = await createOpticaSale(salePayload);
      const saleData = saleResult.data.data || saleResult.data;

      lastVoucher.value = {
        ...saleData,
        id: saleData._id,
        fecha: saleData.createdAt,
        lineas: cartItems.value,
        totalPiezas: cartTotal.value,
        actor: actor?.name || "Usuario",
        ventaFolio: saleData.folio
      };

      voucherOpen.value = true;
      clearCart();
      labToast.success(`Venta de óptica registrada correctamente`);
      return saleData;
    } catch (e) {
      console.error("Error en venta de óptica:", e);
      labToast.danger("Error al registrar venta de óptica");
      throw e;
    } finally {
      loadingSale.value = false;
    }
  }

  watch(selectedSheetId, () => { /* useSalesCatalog handles fetch */ });
  watch([cartClienteNombres, cartClienteApellidos], () => {
    const n = cartClienteNombres.value.trim();
    const a = cartClienteApellidos.value.trim();
    if (n || a) cartCliente.value = [n, a].filter(Boolean).join(" ");
  });

  onMounted(() => {
    selectedSheetId.value = "armazones"; // Trigger initial load
    window.addEventListener("lab:ws", _onLabWs);
  });

  return {
    kind,
    catalog: {
      paginatedItems,
      loadingItems,
      catalogPage,
      catalogPages,
      catalogPageSize,
      itemQuery,
      stockFilter,
      selectedSheetId,
      sheetSearchResults,
      searchSheets,
      sheetTitle: (s) => s?.nombre || "—",
      buildRowTitle,
      filteredItems, 
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
