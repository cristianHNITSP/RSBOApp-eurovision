/**
 * labNotification.service.js
 *
 * Notificaciones diarias de pedidos pendientes de laboratorio.
 * Agrupa TODOS los pedidos pendientes/parciales en UNA sola notificación por día.
 */

"use strict";

const mongoose = require("mongoose");
const { getNotifModel } = require("./notifDb");

const SYSTEM_OID   = new mongoose.Types.ObjectId("000000000000000000000001");
const TARGET_ROLES = ["eurovision", "supervisor", "laboratorio"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function lineLabel(tipo, params, eye) {
  const p = params || {};
  const fmt = (v) => (v === null || v === undefined ? "—" : Number(v) >= 0 ? `+${Number(v).toFixed(2)}` : Number(v).toFixed(2));
  switch (tipo) {
    case "BASE":
      return `Base ${fmt(p.base)}`;
    case "SPH_CYL":
      return `SPH ${fmt(p.sph)} / CYL ${fmt(p.cyl)}`;
    case "SPH_ADD":
      return `${eye || ""} SPH ${fmt(p.sph)} / ADD ${fmt(p.add)}`.trim();
    case "BASE_ADD":
      return `${eye || ""} Base Izq ${fmt(p.base_izq)} / Base Der ${fmt(p.base_der)} / ADD ${fmt(p.add)}`.trim();
    default:
      return tipo || "—";
  }
}

/**
 * Crea o actualiza la notificación diaria de pedidos pendientes.
 * Consulta TODOS los pedidos con status pendiente o parcial y
 * construye una notificación rica con metadata expandible.
 *
 * Si no hay pedidos pendientes, elimina la notificación de hoy si existe.
 */
async function notifyPendingOrders() {
  try {
    const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");
    const Notification    = await getNotifModel();

    const today    = todayStr();
    const groupKey = "pedidos_pendientes";

    const orders = await LaboratoryOrder.find({
      status: { $in: ["pendiente", "parcial"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Sin pedidos pendientes → eliminar notificación si existe
    if (orders.length === 0) {
      await Notification.deleteOne({ groupKey, date: today });
      return;
    }

    // Construir metadata con detalles completos de cada pedido
    const ordersDetail = orders.map((order) => {
      const lines = (order.lines || []).map((l) => ({
        lineId:  l.lineId,
        codebar: l.codebar,
        label:   lineLabel(l.tipo_matriz, l.params, l.eye),
        qty:     Number(l.qty || 0),
        picked:  Number(l.picked || 0),
        eye:     l.eye || null,
      }));

      const totalQty    = lines.reduce((s, l) => s + l.qty, 0);
      const totalPicked = lines.reduce((s, l) => s + Math.min(l.picked, l.qty), 0);

      return {
        orderId:   String(order._id),
        folio:     order.folio,
        cliente:   order.cliente,
        note:      order.note || null,
        status:    order.status,
        createdAt: order.createdAt,
        progress:  { picked: totalPicked, total: totalQty },
        lines,
      };
    });

    const pendienteCount = orders.filter((o) => o.status === "pendiente").length;
    const parcialCount   = orders.filter((o) => o.status === "parcial").length;

    const partes = [];
    if (pendienteCount > 0) partes.push(`${pendienteCount} por iniciar`);
    if (parcialCount   > 0) partes.push(`${parcialCount} en proceso`);

    const title   = `Pedidos pendientes — ${orders.length} pedido${orders.length > 1 ? "s" : ""}`;
    const message = `Hay ${orders.length} pedido${orders.length > 1 ? "s" : ""} pendiente${orders.length > 1 ? "s" : ""} de surtir (${partes.join(", ")}). Revisa el detalle para ver todos los pedidos y sus combinaciones.`;

    const metadata = {
      type:    "pending_orders",
      date:    today,
      orders:  ordersDetail,
      summary: { total: orders.length, pendiente: pendienteCount, parcial: parcialCount },
    };

    const existing = await Notification.findOne({ groupKey, date: today });

    if (existing) {
      existing.title    = title;
      existing.message  = message.slice(0, 2000);
      existing.metadata = metadata;
      existing.count    = (existing.count || 1) + 1;
      existing.readBy   = [];
      existing.markModified("metadata");
      await existing.save();
    } else {
      await Notification.create({
        groupKey,
        date:          today,
        title,
        message:       message.slice(0, 2000),
        metadata,
        type:          "warning",
        priority:      "high",
        targetRoles:   TARGET_ROLES,
        isGlobal:      false,
        createdBy:     SYSTEM_OID,
        createdByName: "Sistema",
        count:         1,
      });
    }

    // WS broadcast para actualizar el panel de notificaciones
    try {
      require("../ws").broadcast("NOTIFICATION_NEW", {
        type:  "pending_orders",
        count: orders.length,
      });
    } catch { /* WS opcional */ }

  } catch (e) {
    console.warn("[LAB_NOTIF] notifyPendingOrders error:", e?.message);
  }
}

/**
 * Crea una notificación individual para un nuevo pedido.
 * Complementa la notificación central diaria de pedidos pendientes.
 * Esta notificación es independiente: el usuario puede marcarla leída sin
 * afectar la notificación central agrupada.
 *
 * @param {object} order - Documento del nuevo pedido (después de LaboratoryOrder.create)
 */
async function notifyNewOrder(order) {
  try {
    const Notification = await getNotifModel();
    const today = todayStr();

    const lines = (order.lines || []).map((l) => lineLabel(l.tipo_matriz, l.params, l.eye));
    const previewLines = lines.slice(0, 3);
    const extraCount   = lines.length > 3 ? lines.length - 3 : 0;

    const linesPreview = previewLines.join(" · ") + (extraCount > 0 ? ` y ${extraCount} combinación${extraCount > 1 ? "es" : ""} más` : "");

    const message = `Cliente: ${order.cliente}${order.note ? ` — Nota: ${order.note}` : ""}. Combinaciones: ${linesPreview || "—"}`;

    const metadata = {
      type:    "new_order",
      orderId: String(order._id),
      folio:   order.folio,
      cliente: order.cliente,
      note:    order.note || null,
      status:  order.status,
      lines:   (order.lines || []).map((l) => ({
        label:  lineLabel(l.tipo_matriz, l.params, l.eye),
        qty:    Number(l.qty || 0),
        picked: Number(l.picked || 0),
        eye:    l.eye || null,
      })),
    };

    await Notification.create({
      groupKey:      null,
      date:          today,
      title:         `Nuevo pedido — ${order.folio}`,
      message:       message.slice(0, 2000),
      metadata,
      type:          "info",
      priority:      "medium",
      targetRoles:   TARGET_ROLES,
      isGlobal:      false,
      createdBy:     SYSTEM_OID,
      createdByName: "Sistema",
      count:         1,
    });

    try {
      require("../ws").broadcast("NOTIFICATION_NEW", { source: "new_order", folio: order.folio });
    } catch { /* WS opcional */ }

  } catch (e) {
    console.warn("[LAB_NOTIF] notifyNewOrder error:", e?.message);
  }
}

/**
 * Crea una notificación individual para una corrección solicitada.
 *
 * @param {object} params
 * @param {string} params.folio
 * @param {string} params.orderId
 * @param {string} params.message
 * @param {string} params.actorName
 */
async function notifyCorrection({ folio, orderId, message, actorName }) {
  try {
    const Notification = await getNotifModel();
    const today        = todayStr();

    const notifMessage = `Pedido ${folio}${actorName ? ` — solicitado por ${actorName}` : ""}. Motivo: ${message || "Sin detalle"}`;

    const metadata = {
      type:    "correction",
      orderId: String(orderId),
      folio,
      message: message || null,
      actor:   actorName || null,
    };

    await Notification.create({
      groupKey:      null,
      date:          today,
      title:         `Corrección solicitada — ${folio}`,
      message:       notifMessage.slice(0, 2000),
      metadata,
      type:          "warning",
      priority:      "high",
      targetRoles:   TARGET_ROLES,
      isGlobal:      false,
      createdBy:     SYSTEM_OID,
      createdByName: "Sistema",
      count:         1,
    });

    try {
      require("../ws").broadcast("NOTIFICATION_NEW", { source: "correction", folio });
    } catch { /* WS opcional */ }

  } catch (e) {
    console.warn("[LAB_NOTIF] notifyCorrection error:", e?.message);
  }
}

module.exports = { notifyPendingOrders, notifyNewOrder, notifyCorrection };
