"use strict";

/**
 * Pruebas de CONCURRENCIA contra Mongo real (DB de prueba aislada).
 * Validan los parches de atomicidad de FASE C:
 *   - createOrAccumulate → $inc atómico (sin lost-update en el contador)
 *   - togglePin / dismiss → $addToSet (sin duplicados bajo carrera)
 *   - upsertDaily → índice único {groupKey,date} + manejo E11000 (sin documentos duplicados)
 */

const mongoose = require("mongoose");
const svc = require("./notification.service");
const Notification = require("../models/Notification");

const BASE_URI = process.env.MONGO_URI || "";
const TEST_URI = BASE_URI.replace(/\/([^/?]+)(\?|$)/, "/notif_conc_test$2");
const oid = () => new mongoose.Types.ObjectId();
const maybe = TEST_URI ? describe : describe.skip;

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  // Garantiza que el índice único parcial {groupKey,date} esté construido.
  await Notification.init();
  await Notification.syncIndexes();
});

afterEach(async () => {
  await Notification.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

maybe("Atomicidad bajo concurrencia", () => {
  test("createOrAccumulate: 50 acumulaciones concurrentes → count exacto (1 + 50)", async () => {
    const groupKey = "conc:accum";
    // Semilla: un documento existente para forzar el camino de $inc en todos.
    await Notification.create({
      groupKey, title: "seed", message: "seed", count: 1,
      isGlobal: true, createdBy: oid(),
    });

    const N = 50;
    await Promise.all(
      Array.from({ length: N }, () =>
        svc.createOrAccumulate({
          groupKey,
          title: "acc",
          messageTemplate: (c) => `n=${c}`,
          isGlobal: true,
          createdBy: oid(),
        })
      )
    );

    const doc = await Notification.findOne({ groupKey }).lean();
    expect(doc).toBeTruthy();
    expect(doc.count).toBe(1 + N); // sin lost-update
  });

  test("togglePin: 40 usuarios distintos en paralelo → 40 pins, sin duplicados", async () => {
    const n = await Notification.create({
      title: "pin", message: "pin", isGlobal: true, createdBy: oid(),
    });
    const users = Array.from({ length: 40 }, () => oid());

    await Promise.all(
      users.map((u) =>
        svc.togglePin({ notificationId: n._id, roleName: "eurovision", userId: u })
      )
    );

    const doc = await Notification.findById(n._id).lean();
    const ids = (doc.pinnedBy || []).map(String);
    expect(ids.length).toBe(40);
    expect(new Set(ids).size).toBe(40); // sin duplicados
  });

  test("dismiss: mismo usuario en paralelo → idempotente (1 sola entrada)", async () => {
    const n = await Notification.create({
      title: "dis", message: "dis", isGlobal: true, createdBy: oid(),
    });
    const user = oid();

    await Promise.all(
      Array.from({ length: 25 }, () =>
        svc.dismiss({ notificationId: n._id, roleName: "eurovision", userId: user })
      )
    );

    const doc = await Notification.findById(n._id).lean();
    const ids = (doc.dismissedBy || []).map(String);
    expect(ids.filter((x) => x === String(user)).length).toBe(1); // $addToSet idempotente
  });

  test("upsertDaily: 30 upserts concurrentes mismo {groupKey,date} → 1 solo documento", async () => {
    const groupKey = "conc:daily";
    const date = "2099-01-01";
    const N = 30;

    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) =>
        svc.upsertDaily({
          groupKey, date,
          title: `t${i}`,
          message: `m${i}`, // contenido distinto → no se saltan por contentHash
          createdBy: oid(),
        })
      )
    );

    // Ninguna debe terminar en error no controlado (E11000 se reintenta como update).
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected).toHaveLength(0);

    const count = await Notification.countDocuments({ groupKey, date });
    expect(count).toBe(1); // índice único parcial impide duplicados
  });
});
