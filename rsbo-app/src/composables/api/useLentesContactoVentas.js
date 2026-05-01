import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";
import { 
  listContactLensSheets, 
  fetchContactLensItems 
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
  onBeforeUnmount(() => { _ac.abort(); });

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

  async function loadItems() {
    const sid = selectedSheetId.value;
    if (!sid) { itemsDB.value = []; return; }
    loadingItems.value = true;
    try {
      const { data } = await fetchContactLensItems(sid, { 
        limit: 500, 
        withStock: stockFilter.value === "withStock",
        axisMin: selectedAxis.value || undefined,
        axisMax: selectedAxis.value || undefined,
        signal: _ac.signal 
      });
      const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
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
      labToast.danger("Error al cargar lentes de contacto");
    } finally {
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
    if (!cartItems.value.length) { labToast.warning("Carrito vacío"); return; }
    if (!cartCliente.value.trim()) { labToast.warning("Nombre de cliente requerido"); return; }

    loadingSale.value = true;
    const actor = getActor(getUser);
    try {
      // For now, using createOrder (even if it's direct, we might want a record)
      // If we had a specific DirectSale service, we would use it here.
      const lines = cartItems.value.map((ci) => ({
        codebar: ci.row.codebar, qty: ci.qty, sheetId: ci.sheetId, precio: Number(ci.precio) || 0
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
        category: 'lentes-contacto'
      });

      const order = data?.data;
      lastVoucher.value = {
        ...order,
        id: String(order._id),
        fecha: order.createdAt,
        lineas: cartItems.value.map(ci => ({ ...ci, sheetNombre: ci.sheet.nombre })),
        totalPiezas: cartTotal.value,
        actor: actor?.name || "Usuario"
      };
      voucherOpen.value = true;
      clearCart();
      labToast.success(`Venta de LC registrada`);
      
      return order;
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

  onMounted(() => { loadSheets(); });

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
    registrarVenta,
    lastVoucher, voucherOpen,
    loadingSale,
    sheetsDB
  };
}
