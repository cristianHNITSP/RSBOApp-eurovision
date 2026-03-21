"use strict";

/**
 * labNotification.service.js
 *
 * Notificaciones de laboratorio delegadas al notification-service via HTTP interno.
 * Este servicio ya no accede directamente a notification_db.
 */

const notifClient = require("./notifClient");

const TARGET_ROLES = ["eurovision", "supervisor", "laboratorio"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function lineLabel(tipo, params, eye) {
  const p   = params || {};
  const fmt = (v) => (v === null || v === undefined ? "—" : Number(v) >= 0 ? `+${Number(v).toFixed(2)}` : Number(v).toFixed(2));
  switch (tipo) {
    case "BASE":     return `Base ${fmt(p.base)}`;
    case "SPH_CYL":  return `SPH ${fmt(p.sph)} / CYL ${fmt(p.cyl)}`;
    case "SPH_ADD":  return `${eye || ""} SPH ${fmt(p.sph)} / ADD ${fmt(p.add)}`.trim();
    case "BASE_ADD": return `${eye || ""} Base Izq ${fmt(p.base_izq)} / Base Der ${fmt(p.base_der)} / ADD ${fmt(p.add)}`.trim();
    default:         return tipo || "—";
  }
}

/**
 * Crea o actualiza la notificacion diaria de pedidos pendientes.
 * Si no hay pedidos pendientes, elimina la notificacion de hoy.
 */
async function notifyPendingOrders() {
  try {
    const LaboratoryOrder = require("../models/laboratory/LaboratoryOrder");

    const today    = todayStr();
    const groupKey = "pedidos_pendientes";

    const orders = await LaboratoryOrder.find({
      status: { $in: ["pendiente", "parcial"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Sin pedidos pendientes → eliminar notificacion si existe
    if (orders.length === 0) {
      await notifClient.deleteByGroup({ groupKey, date: today });
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

    await notifClient.upsertDaily({
      groupKey,
      date:        today,
      title,
      message:     message.slice(0, 2000),
      metadata,
      type:        "warning",
      priority:    "high",
      targetRoles: TARGET_ROLES,
      isGlobal:    false,
    });

  } catch (e) {
    console.warn("[LAB_NOTIF] notifyPendingOrders error:", e?.message);
  }
}

/**
 * Crea una notificacion individual para un nuevo pedido.
 *
 * @param {object} order - Documento del nuevo pedido (despues de LaboratoryOrder.create)
 */
async function notifyNewOrder(order) {
  try {
    const today = todayStr();

    const lines        = (order.lines || []).map((l) => lineLabel(l.tipo_matriz, l.params, l.eye));
    const previewLines = lines.slice(0, 3);
    const extraCount   = lines.length > 3 ? lines.length - 3 : 0;

    const linesPreview = previewLines.join(" · ") + (extraCount > 0 ? ` y ${extraCount} combinacion${extraCount > 1 ? "es" : ""} mas` : "");
    const message      = `Cliente: ${order.cliente}${order.note ? ` — Nota: ${order.note}` : ""}. Combinaciones: ${linesPreview || "—"}`;

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

    // groupKey null → notificacion individual (no se acumula)
    // Usamos groupKey unico por folio para que no colisione con otras
    await notifClient.upsertDaily({
      groupKey:    `new_order:${order.folio}`,
      date:        today,
      title:       `Nuevo pedido — ${order.folio}`,
      message:     message.slice(0, 2000),
      metadata,
      type:        "info",
      priority:    "medium",
      targetRoles: TARGET_ROLES,
      isGlobal:    false,
    });

  } catch (e) {
    console.warn("[LAB_NOTIF] notifyNewOrder error:", e?.message);
  }
}

/**
 * Crea una notificacion individual para una correccion solicitada.
 *
 * @param {{ folio: string, orderId: string, message: string, actorName: string }} params
 */
async function notifyCorrection({ folio, orderId, message, actorName }) {
  try {
    const today         = todayStr();
    const notifMessage  = `Pedido ${folio}${actorName ? ` — solicitado por ${actorName}` : ""}. Motivo: ${message || "Sin detalle"}`;

    const metadata = {
      type:    "correction",
      orderId: String(orderId),
      folio,
      message: message || null,
      actor:   actorName || null,
    };

    await notifClient.upsertDaily({
      groupKey:    `correction:${folio}:${today}`,
      date:        today,
      title:       `Correccion solicitada — ${folio}`,
      message:     notifMessage.slice(0, 2000),
      metadata,
      type:        "warning",
      priority:    "high",
      targetRoles: TARGET_ROLES,
      isGlobal:    false,
    });

  } catch (e) {
    console.warn("[LAB_NOTIF] notifyCorrection error:", e?.message);
  }
}

module.exports = { notifyPendingOrders, notifyNewOrder, notifyCorrection };
