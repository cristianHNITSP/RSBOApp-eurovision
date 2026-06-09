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
  const correction = reactive({ orderId: "", qr: "", message: "" });

  const qrOpen = ref(false);
  const qrValue = ref("");

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

  const openQr = (code) => {
    qrValue.value = String(code || "").trim();
    qrOpen.value = true;
  };

  const copyQr = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      labToast.show("Copiado al portapapeles", "is-success", 2000);
    } catch {
      notify("Error al copiar al portapapeles", "is-danger");
    }
  };

  const printQr = (code) => {
    notify(`Imprimiendo etiqueta QR: ${code} (Simulado)`, "is-info");
  };

  const addToDraft = (row) => {
    const sheet = sheets.selectedSheet.value;
    if (!sheet?.id) return;
    const cb = String(row?.qr || "").trim();
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
      qr: cb,
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
          qr: l.qr,
          qty: Number(l.qty || 1),
          sheetId: l.sheetId
        })),
        actor: actorRef()
      };
      const { data } = await createOrderService(payload);
      const order = normalizeOrder(data?.data);
      await Promise.all([orders.loadOrders(), events.loadEvents()]);
      // No auto-selecting. User chooses from the list.
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
    if (order.status === "cerrado" || order.status === "cancelado") {
      notify("No se puede surtir un pedido cerrado o cancelado", "is-warning");
      return;
    }
    // QR interno (RSBO|...): se conserva tal cual, sin sanitizar separadores.
    const cb = String(scanCode.value || "").trim();
    if (!cb) return;

    loadingScan.value = true;
    try {
      const { data } = await scanOrderService(order.id, { qr: cb, qty: 1, actor: actorRef() });
      const updated = normalizeOrder(data?.data);
      
      orders.updateOrderInLocalDB(updated);

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

      orders.updateOrderInLocalDB(updated);

      // If we are only showing open orders, we should clear the selection so loadOrders picks the next one
      if (orders.orderStatusFilter.value === "open") {
        orders.selectedOrderId.value = "";
      }

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
    if (order.status === "cerrado" || order.status === "cancelado") {
      notify("No se puede reiniciar el surtido de un pedido cerrado", "is-warning");
      return;
    }
    loadingReset.value = true;
    try {
      const { data } = await resetOrderService(order.id, actorRef());
      const updated = normalizeOrder(data?.data);
      orders.updateOrderInLocalDB(updated);
      
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
      const { data } = await cancelOrderService(order.id, actorRef());
      const updated = normalizeOrder(data?.data);
      orders.updateOrderInLocalDB(updated);

      if (orders.orderStatusFilter.value === "open") {
        orders.selectedOrderId.value = "";
      }

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
      await requestCorrectionService({ orderId, qr: correction.qr || null, message, actor: actorRef() });
      correctionOpen.value = false;
      correction.message = "";
      await events.loadEvents();
      notify("Solicitud de corrección enviada.", "is-info");

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
      const updated = normalizeOrder(data?.data);
      orders.updateOrderInLocalDB(updated);
      notify("Pedido actualizado.", "is-success");
      return updated;
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
    qrOpen,
    qrValue,
    openQr,
    copyQr,
    printQr,
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
