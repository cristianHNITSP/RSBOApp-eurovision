// rsbo-app/src/composables/lab/useLabMutations.js
import { ref, reactive } from "vue";
import {
  createOrder as createOrderService,
  scanOrder as scanOrderService,
  closeOrder as closeOrderService,
  resetOrder as resetOrderService,
  requestCorrection as requestCorrectionService,
  cancelOrder as cancelOrderService,
  updateOrder as updateOrderService
} from "@/services/laboratorio";
import { normalizeAck } from "@/utils/errorSanitizer";
import { createGroupedNotification } from "@/services/notifications";
import { normalizeOrder, getMicaTypeName, buildRowTitle } from "./useLabMappers";
import { isEan13 } from "@/utils/ean13";
import { labToast } from "@/composables/shared/useLabToast.js";

export function useLabMutations({ getUser, sheets, items, orders, events, notify, mode }) {
  const loadingCreateOrder = ref(false);
  const loadingCloseOrder = ref(false);
  const loadingScan = ref(false);
  const loadingReset = ref(false);
  const loadingSubmitCorrection = ref(false);
  const loadingCancelOrder = ref(false);
  const loadingEditOrder = ref(false);

  const draftCliente = ref("");
  const draftNote = ref("");
  const draftLines = ref([]);
  const scanCode = ref("");

  const correctionOpen = ref(false);
  const correction = reactive({ orderId: "", codebar: "", message: "" });

  const barcodeOpen = ref(false);
  const barcodeValue = ref("");

  const actorRef = () => {
    if (typeof getUser === "function") {
      const u = getUser();
      if (u) {
        const userId = u.id ?? u.userId ?? null;
        const name = u.name ?? u.nombre ?? null;
        if (userId || name) return { userId, name };
      }
    }
    return undefined;
  };

  const openBarcode = (cb) => {
    barcodeValue.value = String(cb || "").trim();
    barcodeOpen.value = true;
  };

  const copyCodebar = async (cb) => {
    try {
      await navigator.clipboard.writeText(cb);
      labToast.show("Copiado al portapapeles", "is-success", 2000);
    } catch {
      notify("Error al copiar al portapapeles", "is-danger");
    }
  };

  const printBarcode = (cb) => {
    notify(`Imprimiendo etiqueta: ${cb} (Simulado)`, "is-info");
  };

  const addToDraft = (row) => {
    const sheet = sheets.selectedSheet.value;
    if (!sheet?.id) return;
    const cb = String(row?.codebar || "").trim();
    if (!cb) return;

    const lineKey = `${sheet.id}__${cb}`;
    const found = draftLines.value.find((x) => x.key === lineKey);
    if (found) {
      found.qty = Math.min(Number(found.qty || 1) + 1, Number(found.stock || 999999));
      notify(`+1 mica: ${found.title}`, "is-info", 2000);
      return;
    }

    const title = buildRowTitle(row, sheet);
    const micaType = getMicaTypeName(sheet.tipo_matriz);
    draftLines.value.push({
      key: lineKey,
      codebar: cb,
      title,
      qty: 1,
      stock: Number(row.existencias || 0),
      sheetId: sheet.id,
      sheetName: sheet.nombre || sheet.name || "—",
      tipoMatriz: sheet.tipo_matriz,
      micaType
    });
    notify(`Agregada: ${title} (${micaType})`, "is-info", 2000);
  };

  async function createOrderFromDraft() {
    if (!draftLines.value.length || !draftCliente.value.trim()) return;
    loadingCreateOrder.value = true;
    try {
      const payload = {
        sheetId: draftLines.value[0]?.sheetId || undefined,
        cliente: String(draftCliente.value || "").trim(),
        note: String(draftNote.value || "").trim(),
        lines: draftLines.value.map((l) => ({
          codebar: l.codebar,
          qty: Number(l.qty || 1),
          sheetId: l.sheetId
        })),
        actor: actorRef()
      };
      const { data } = await createOrderService(payload);
      const order = normalizeOrder(data?.data);
      await Promise.all([orders.loadOrders(), events.loadEvents()]);
      orders.selectedOrderId.value = order.id;
      mode.value = "surtir";
      if (order.sheetId) sheets.selectedSheetId.value = order.sheetId;
      draftLines.value = [];
      draftCliente.value = "";
      draftNote.value = "";
      if (order.sheetId) await items.loadItems(order.sheetId);
      notify(`Pedido ${order.folio || ""} creado para ${order.cliente}`, "is-success");
    } catch (e) {
      const n = normalizeAck(e, { errorFallback: "No se pudo crear el pedido." });
      notify(n?.message, "is-danger", 6000);
    } finally {
      loadingCreateOrder.value = false;
    }
  }

  async function scanAndDispatch() {
    if (loadingScan.value) return;
    const order = orders.selectedOrder.value;
    if (!order?.id) return;
    // Sanitización: Solo dejar caracteres alfanuméricos
    const cb = String(scanCode.value || "").trim().replace(/[^a-zA-Z0-9]/g, "");
    if (!cb) return;

    loadingScan.value = true;
    try {
      const { data } = await scanOrderService(order.id, { codebar: cb, qty: 1, actor: actorRef() });
      const updated = normalizeOrder(data?.data);
      const idx = orders.ordersDB.value.findIndex((x) => x.id === updated.id);
      if (idx >= 0) orders.ordersDB.value[idx] = updated;
      if (updated.sheetId) sheets.selectedSheetId.value = updated.sheetId;
      await Promise.all([items.loadItems(updated.sheetId), events.loadEvents()]);
      scanCode.value = "";
      if (orders.isOrderComplete(updated)) notify(`Pedido ${updated.folio} completado. Listo para cerrar.`, "is-success", 5000);
      else notify(`Salida registrada: ${cb}`, "is-success", 2500);
    } catch (e) {
      const n = normalizeAck(e, { errorFallback: "Código no encontrado en el pedido." });
      notify(n?.message, "is-danger", 5000);
    } finally {
      loadingScan.value = false;
    }
  }

  async function closeSelectedOrder() {
    const order = orders.selectedOrder.value;
    if (!order?.id || order.status === "cerrado") return;
    loadingCloseOrder.value = true;
    try {
      const { data } = await closeOrderService(order.id, actorRef());
      const updated = normalizeOrder(data?.data);
      await Promise.all([orders.loadOrders(), events.loadEvents()]);
      notify(`Pedido ${updated.folio} cerrado correctamente.`, "is-success");
    } catch (e) {
      const n = normalizeAck(e, { errorFallback: "No se pudo cerrar el pedido." });
      notify(n?.message, "is-danger", 5000);
    } finally {
      loadingCloseOrder.value = false;
    }
  }

  async function resetPickedForSelectedOrder() {
    const order = orders.selectedOrder.value;
    if (!order?.id) return;
    loadingReset.value = true;
    try {
      await resetOrderService(order.id, actorRef());
      await Promise.all([orders.loadOrders(), items.loadItems(), events.loadEvents()]);
      notify(`Surtido del pedido ${order.folio} reiniciado.`, "is-info");
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "Error al reiniciar surtido" }).message, "is-danger");
    } finally {
      loadingReset.value = false;
    }
  }

  async function cancelSelectedOrder() {
    const order = orders.selectedOrder.value;
    if (!order?.id) return;
    loadingCancelOrder.value = true;
    try {
      await cancelOrderService(order.id, actorRef());
      await Promise.all([orders.loadOrders(), events.loadEvents()]);
      notify(`Pedido ${order.folio} cancelado.`, "is-info");
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "Error al cancelar pedido" }).message, "is-danger");
    } finally {
      loadingCancelOrder.value = false;
    }
  }

  async function submitCorrection() {
    const orderId = correction.orderId || orders.selectedOrderId.value;
    const message = String(correction.message || "").trim();
    if (!orderId || message.length < 3) return;
    loadingSubmitCorrection.value = true;
    try {
      await requestCorrectionService({ orderId, codebar: correction.codebar || null, message, actor: actorRef() });
      correctionOpen.value = false;
      correction.message = "";
      await events.loadEvents();
      notify("Solicitud de corrección enviada.", "is-info");
      createGroupedNotification({ groupKey: "pending_corrections", title: "Correcciones pendientes", type: "danger", targetRoles: ["supervisor"] }).catch(() => {});
    } catch (e) {
      const n = normalizeAck(e, { errorFallback: "No se pudo enviar la corrección." });
      notify(n?.message, "is-danger", 5000);
    } finally {
      loadingSubmitCorrection.value = false;
    }
  }

  async function editOrder(orderId, patch) {
    loadingEditOrder.value = true;
    try {
      const { data } = await updateOrderService(orderId, { ...patch, actor: actorRef() });
      notify("Pedido actualizado.", "is-success");
      return normalizeOrder(data?.data);
    } catch (e) {
      notify("Error al actualizar pedido", "is-danger");
      throw e;
    } finally {
      loadingEditOrder.value = false;
    }
  }

  async function cancelOrderById(orderId) {
    loadingCancelOrder.value = true;
    try {
      await cancelOrderService(orderId, actorRef());
      notify("Pedido cancelado.", "is-info");
    } catch (e) {
      notify("Error al cancelar pedido", "is-danger");
    } finally {
      loadingCancelOrder.value = false;
    }
  }

  return {
    loadingCreateOrder,
    loadingCloseOrder,
    loadingScan,
    loadingReset,
    loadingSubmitCorrection,
    loadingCancelOrder,
    loadingEditOrder,
    draftCliente,
    draftNote,
    draftLines,
    scanCode,
    correctionOpen,
    correction,
    barcodeOpen,
    barcodeValue,
    isEan13,
    openBarcode,
    copyCodebar,
    printBarcode,
    addToDraft,
    createOrderFromDraft,
    scanAndDispatch,
    closeSelectedOrder,
    resetPickedForSelectedOrder,
    cancelSelectedOrder,
    cancelOrderById,
    submitCorrection,
    editOrder
  };
}
