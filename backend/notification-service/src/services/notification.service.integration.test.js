"use strict";

/**
 * Integración de upsertStockAlert contra Mongo REAL en una base de datos de
 * PRUEBA aislada (derivada de MONGO_URI), que se elimina al terminar.
 * (No usamos mongodb-memory-server porque su binario no es descargable en este
 * contenedor; el Mongo real ya está disponible para el servicio.)
 */

const mongoose = require("mongoose");
const svc = require("./notification.service");
const Notification = require("../models/Notification");

const BASE_URI = process.env.MONGO_URI || "";
const TEST_URI = BASE_URI.replace(/\/([^/?]+)(\?|$)/, "/notif_int_test$2");

const oid = () => new mongoose.Types.ObjectId();
const groupKey = (s) => `stock_alert:${s}`;

const makeEv = (over = {}) => ({
  sheetId: "sheetA",
  sheetLabel: "Planilla A",
  sheet: { name: "Planilla A", sku: "SKU1", tipoLabel: "Monofocal" },
  tipo_matriz: "BASE",
  cells: [{ level: "CRITICO", existencias: 0, coords: { base: 0.25 } }],
  alertsByAxis: null,
  critCount: 1,
  lowCount: 0,
  urgencyScore: 90,
  hash: "h1",
  ...over,
});

// Si no hay Mongo configurado, no corras (evita falsos negativos en entornos sin DB).
const maybe = TEST_URI ? describe : describe.skip;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Notification.deleteMany({});
});

maybe("upsertStockAlert — ciclo de vida (CERO contadores)", () => {
  test("create: crea una con count=1 y changed=true", async () => {
    const { notification, changed, action } = await svc.upsertStockAlert(makeEv(), { resurface: true });
    expect(action).toBe("create");
    expect(changed).toBe(true);
    expect(notification.count).toBe(1);
    expect(await Notification.countDocuments({ groupKey: groupKey("sheetA") })).toBe(1);
  });

  test("skip: mismo estado sin tick de cadencia → no cambia", async () => {
    await svc.upsertStockAlert(makeEv(), { resurface: true });
    const { changed, action, notification } = await svc.upsertStockAlert(makeEv(), { resurface: false });
    expect(action).toBe("skip");
    expect(changed).toBe(false);
    expect(notification.count).toBe(1);
  });

  test("revive: tras descartar, el tick de cadencia la re-surface (dismissedBy vacío) y count sigue 1", async () => {
    await svc.upsertStockAlert(makeEv(), { resurface: true });
    await Notification.updateOne({ groupKey: groupKey("sheetA") }, { $set: { dismissedBy: [oid()] } });

    const { action, notification } = await svc.upsertStockAlert(makeEv(), { resurface: true });
    expect(action).toBe("revive");
    expect(notification.dismissedBy).toHaveLength(0);
    expect(notification.count).toBe(1); // sin contador
  });

  test("pin: fijada NO revive (conserva descarte y pin), count sigue 1", async () => {
    await svc.upsertStockAlert(makeEv(), { resurface: true });
    const keeper = oid();
    await Notification.updateOne(
      { groupKey: groupKey("sheetA") },
      { $set: { pinnedBy: [keeper], dismissedBy: [oid()] } }
    );

    const { action, notification } = await svc.upsertStockAlert(makeEv(), { resurface: true });
    expect(["skip", "refresh"]).toContain(action);
    expect(notification.dismissedBy.length).toBe(1);          // NO re-surface
    expect(notification.pinnedBy.map(String)).toContain(String(keeper)); // pin intacto
    expect(notification.count).toBe(1);
  });

  test("regenerate: a >3 días borra la vieja y crea una nueva (otro _id), count 1", async () => {
    const first = await svc.upsertStockAlert(makeEv(), { resurface: true });
    const oldId = String(first.notification._id);
    // createdAt es immutable en Mongoose; forzar vía driver nativo para simular >3 días.
    await Notification.collection.updateOne(
      { groupKey: groupKey("sheetA") },
      { $set: { createdAt: new Date(Date.now() - (svc.CYCLE_MS + 60000)) } }
    );

    const { action, notification } = await svc.upsertStockAlert(makeEv(), { resurface: true });
    expect(action).toBe("regenerate");
    expect(String(notification._id)).not.toBe(oldId);
    expect(await Notification.countDocuments({ groupKey: groupKey("sheetA") })).toBe(1);
    expect(notification.count).toBe(1);
  });

  test("clearStockAlert: stock recuperado → elimina la notificación", async () => {
    await svc.upsertStockAlert(makeEv(), { resurface: true });
    const { changed } = await svc.clearStockAlert("sheetA");
    expect(changed).toBe(true);
    expect(await Notification.countDocuments({ groupKey: groupKey("sheetA") })).toBe(0);
  });

  test("invariante: ningún flujo produce count > 1", async () => {
    await svc.upsertStockAlert(makeEv(), { resurface: true });
    for (const r of [true, false, true]) {
      await svc.upsertStockAlert(makeEv({ hash: "h" + Math.random() }), { resurface: r });
    }
    const doc = await Notification.findOne({ groupKey: groupKey("sheetA") });
    expect(doc.count).toBe(1);
  });
});

maybe("recuperación de stock — limpia/actualiza y re-alerta", () => {
  const TWO = [
    { level: "CRITICO", existencias: 0, coords: { base: 0.25 } },
    { level: "CRITICO", existencias: 0, coords: { base: 0.50 } },
  ];
  const ONE = [{ level: "CRITICO", existencias: 0, coords: { base: 0.50 } }];

  test("recuperación PARCIAL: una dioptría se llena → refresh y se cae del detalle", async () => {
    await svc.upsertStockAlert(makeEv({ cells: TWO, critCount: 2, hash: "two" }), { resurface: true });
    let doc = await Notification.findOne({ groupKey: groupKey("sheetA") });
    expect(doc.metadata.cells).toHaveLength(2);

    // Se rellena una celda → el productor re-emite con UNA celda (hash distinto).
    const { action } = await svc.upsertStockAlert(makeEv({ cells: ONE, critCount: 1, hash: "one" }), { resurface: false });
    expect(action).toBe("refresh");                 // 1A: el consumidor avisa en refresh
    doc = await Notification.findOne({ groupKey: groupKey("sheetA") });
    expect(doc.metadata.cells).toHaveLength(1);     // la dioptría recuperada ya no figura
  });

  test("recuperación TOTAL → re-caída a 0: clear borra y el siguiente assess RE-CREA (notifica)", async () => {
    await svc.upsertStockAlert(makeEv({ cells: ONE, hash: "x1" }), { resurface: true });
    // recuperación total
    await svc.clearStockAlert("sheetA");
    expect(await Notification.countDocuments({ groupKey: groupKey("sheetA") })).toBe(0);
    // vuelve a 0 → no existe notificación → create (reaparece y notifica)
    const { action, changed } = await svc.upsertStockAlert(makeEv({ cells: ONE, hash: "x2" }), { resurface: false });
    expect(action).toBe("create");
    expect(changed).toBe(true);
    expect(await Notification.countDocuments({ groupKey: groupKey("sheetA") })).toBe(1);
  });
});

maybe("listForUser — proyección de payload (B1) y total condicional (B2)", () => {
  const ROLE = "eurovision";
  const makeNotif = (over = {}) =>
    Notification.create({
      title: "T", message: "M", type: "warning", priority: "high",
      targetRoles: [ROLE], isGlobal: false,
      createdBy: oid(), createdByName: "Sistema",
      contentHash: "hhh", metadata: { type: "stock_alert", cells: [] },
      ...over,
    });

  test("panel (sin dateRange): NO trae contentHash/dismissedBy/pinnedBy y total es undefined", async () => {
    const userId = oid();
    await makeNotif({ pinnedBy: [userId] });
    const { notifications, total } = await svc.listForUser({ roleName: ROLE, userId, limit: 50 });

    expect(total).toBeUndefined();              // B2: el panel no paga countDocuments
    expect(notifications).toHaveLength(1);
    const n = notifications[0];
    expect(n.contentHash).toBeUndefined();      // B1: campos internos fuera
    expect(n.dismissedBy).toBeUndefined();
    expect(n.pinnedBy).toBeUndefined();
    expect(n.isPinned).toBe(true);              // derivado en DB
    expect(typeof n._id).toBe("string");
  });

  test("panel: excluye las descartadas por el usuario", async () => {
    const userId = oid();
    await makeNotif({ dismissedBy: [userId] });
    const { notifications } = await svc.listForUser({ roleName: ROLE, userId, limit: 50 });
    expect(notifications).toHaveLength(0);
  });

  test("isPinned=false cuando el pin es de otro usuario", async () => {
    const userId = oid();
    await makeNotif({ pinnedBy: [oid()] });
    const { notifications } = await svc.listForUser({ roleName: ROLE, userId, limit: 50 });
    expect(notifications[0].isPinned).toBe(false);
  });

  test("historial (con dateRange): total es numérico", async () => {
    const userId = oid();
    await makeNotif();
    await makeNotif();
    const { notifications, total } = await svc.listForUser({
      roleName: ROLE, userId, limit: 50, dateRange: "indefinido",
    });
    expect(typeof total).toBe("number");
    expect(total).toBe(2);
    expect(notifications).toHaveLength(2);
  });
});
