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
  onBeforeUnmount(() => { _ac.abort(); });

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

  async function loadItems() {
    const colId = selectedSheetId.value;
    const col = COLLECTIONS.find(c => c.id === colId);
    if (!col) return;

    loadingItems.value = true;
    try {
      const { data } = await col.service.list({ signal: _ac.signal });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      itemsDB.value = arr.map(r => ({
        ...r,
        existencias: Number(r.stock ?? r.existencias ?? 0),
      }));
      catalogPage.value = 1;
    } catch (e) {
      labToast.danger(`Error al cargar ${col.nombre}`);
    } finally {
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
    
    let title = row.name || `${row.brand || ''} ${row.model || ''} ${row.color || ''}`.trim() || 'Producto';
    
    cartItems.value.push({
      key, row: { ...row }, 
      qty: 1, 
      precio: Number(row.price || row.precioVenta || 0),
      title
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
    if (!cartItems.value.length) { labToast.warning("Carrito vacío"); return; }
    if (!cartCliente.value.trim()) { labToast.warning("Nombre de cliente requerido"); return; }

    loadingSale.value = true;
    const actor = getActor(getUser);
    try {
      const lines = cartItems.value.map((ci) => ({
        codebar: ci.row.sku || ci.row.codebar, qty: ci.qty, precio: Number(ci.precio) || 0, title: ci.title
      }));

      const { data } = await createOrder({
        cliente: cartCliente.value.trim(),
        clienteNombres: cartClienteNombres.value.trim(),
        clienteApellidos: cartClienteApellidos.value.trim(),
        clienteEmpresa: cartClienteEmpresa.value.trim(),
        clienteContacto: cartClienteContacto.value.trim(),
        note: cartNote.value.trim(),
        pago: [...cartPago.value],
        totalMonto: cartTotalMonto.value,
        lines,
        actor,
        category: 'optica'
      });

      const order = data?.data;
      lastVoucher.value = {
        ...order,
        id: String(order._id),
        fecha: order.createdAt,
        lineas: cartItems.value,
        totalPiezas: cartTotal.value,
        actor: actor?.name || "Usuario"
      };
      voucherOpen.value = true;
      clearCart();
      labToast.success(`Venta de óptica registrada`);
      return order;
    } catch (e) {
      labToast.danger("Error al registrar venta");
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

  onMounted(() => { loadItems(); });

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
      buildRowTitle: (row, sheet) => row.name || `${row.brand || ''} ${row.model || ''} ${row.color || ''}`.trim(),
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
    registrarVenta,
    lastVoucher, voucherOpen,
    loadingSale,
    sheetsDB: ref(COLLECTIONS)
  };
}
