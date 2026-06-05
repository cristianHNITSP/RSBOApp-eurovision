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
