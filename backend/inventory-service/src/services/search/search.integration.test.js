"use strict";

/**
 * Integración del buscador contra Mongo REAL en una base de PRUEBA aislada
 * (derivada de MONGO_URI), que se elimina al terminar. Valida los providers
 * (sheets/optica) + el orquestador search.service end-to-end.
 */
const mongoose = require("mongoose");
const searchService = require("./search.service");
const InventorySheet = require("../../models/InventorySheet");
const { Armazon } = require("../../models/optica/OpticaProduct");

const BASE_URI = process.env.MONGO_URI || "";
const TEST_URI = BASE_URI.replace(/\/([^/?]+)(\?|$)/, "/search_int_test$2");
const maybe = TEST_URI ? describe : describe.skip;

const sheetDoc = {
  nombre: "ZeissTest Monofocal",
  tipo_matriz: "SPH_CYL",
  baseKey: "tst",
  material: "CR-39",
  precioVenta: 100,
  precioCompra: 50,
  ranges: {
    sph: { start: -16, end: 8, step: 0.25 },
    cyl: { start: -6, end: 0, step: 0.25 },
  },
};

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
  await Promise.all([InventorySheet.deleteMany({}), Armazon.deleteMany({})]);
  await InventorySheet.create(sheetDoc);
  await Armazon.create({ marca: "OakleyTest", modelo: "HolbrookTest", precio: 1200, stock: 5 });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

maybe("search.service.run — providers contra DB real", () => {
  test("query vacía → vacío", async () => {
    expect(await searchService.run("")).toEqual({});
    expect(await searchService.run("   ")).toEqual({});
  });

  test("texto → planilla en grupo 'sheets'", async () => {
    const r = await searchService.run("zeisstest");
    expect(r.sheets?.length).toBeGreaterThan(0);
    expect(r.sheets[0].nombre).toMatch(/ZeissTest/i);
    expect(r.sheets[0].type).toBe("sheet");
  });

  test("óptica → producto en grupo 'optica' con categoria + sku", async () => {
    const r = await searchService.run("oakleytest");
    expect(r.optica?.length).toBeGreaterThan(0);
    expect(r.optica[0].categoria).toBe("armazones");
    expect(r.optica[0].sku).toMatch(/^ARM-/);
    expect(r.optica[0].label).toMatch(/Oakley/i);
  });

  test("fila (1.25) → grupo 'diopters' modo row sobre sph, no 'sheets'", async () => {
    const r = await searchService.run("-2.50");
    expect(r.diopters?.length).toBeGreaterThan(0);
    expect(r.diopters[0].type).toBe("diopter");
    expect(r.diopters[0].mode).toBe("row");
    expect(r.diopters[0].rowField).toBe("sph");
    expect(r.diopters[0].rowVal).toBe(-2.5);
    expect(r.diopters[0].diopter).toBe(-2.5); // compat
    expect(r.sheets).toBeUndefined();
  });

  test("columna (, -4.00) → modo col sobre cyl", async () => {
    const r = await searchService.run(", -4.00");
    expect(r.diopters?.length).toBeGreaterThan(0);
    expect(r.diopters[0].mode).toBe("col");
    expect(r.diopters[0].colField).toBe("cyl");
    expect(r.diopters[0].colVal).toBe(-4);
  });

  test("intersección (-2.50, -4.00) → modo cell con fila+columna", async () => {
    const r = await searchService.run("-2.50, -4.00");
    expect(r.diopters?.length).toBeGreaterThan(0);
    expect(r.diopters[0].mode).toBe("cell");
    expect(r.diopters[0].rowVal).toBe(-2.5);
    expect(r.diopters[0].colVal).toBe(-4);
  });

  test("dioptría fantasma (fuera del step) → no aparece", async () => {
    // sph step 0.25 → -2.10 no es celda real
    const r = await searchService.run("-2.10");
    expect(r.diopters || []).toHaveLength(0);
  });

  test("ruta → grupo 'routes'", async () => {
    const r = await searchService.run("ventas");
    expect(r.routes?.length).toBeGreaterThan(0);
  });
});
