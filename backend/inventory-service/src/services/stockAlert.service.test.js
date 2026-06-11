"use strict";

const svc = require("./stockAlert.service");

describe("classifyStock — tiers por distancia al neutro", () => {
  test("cerca del neutro (tier amplio): crit<=3, bajo<=6, neutro<=10", () => {
    expect(svc.classifyStock(0, 0.5)).toBe("CRITICO");
    expect(svc.classifyStock(3, 0.5)).toBe("CRITICO");
    expect(svc.classifyStock(4, 0.5)).toBe("BAJO");
    expect(svc.classifyStock(6, 0.5)).toBe("BAJO");
    expect(svc.classifyStock(10, 0.5)).toBe("NEUTRO");
    expect(svc.classifyStock(11, 0.5)).toBe("BUENO");
  });

  test("lejos del neutro tolera menos stock (tier estricto): crit0, bajo1, neutro2", () => {
    expect(svc.classifyStock(0, 10)).toBe("CRITICO");
    expect(svc.classifyStock(1, 10)).toBe("BAJO");
    expect(svc.classifyStock(2, 10)).toBe("NEUTRO");
    expect(svc.classifyStock(3, 10)).toBe("BUENO");
  });
});

describe("recuperación de stock (rellenado → deja de alertar)", () => {
  test("una celda rellenada ya no es CRÍTICO/BAJO (sale de la alerta)", () => {
    // Cerca del neutro: tras rellenar a 20 → BUENO (no entra en allAlertCells).
    expect(svc.classifyStock(0, 0.5)).toBe("CRITICO");   // antes (vacía)
    expect(svc.classifyStock(20, 0.5)).toBe("BUENO");    // después (rellenada)
    // Lejos del neutro (tier estricto): bueno > 2.
    expect(svc.classifyStock(0, 10)).toBe("CRITICO");
    expect(svc.classifyStock(5, 10)).toBe("BUENO");
  });
  test("re-caída a 0 vuelve a ser CRÍTICO (la alerta debe reaparecer)", () => {
    expect(svc.classifyStock(0, 0.5)).toBe("CRITICO");
  });
});

describe("computeDistance — por tipo de matriz", () => {
  test("BASE = |base|", () => {
    expect(svc.computeDistance("BASE", "2d00")).toBeCloseTo(2);
    expect(svc.computeDistance("BASE", "m3d50")).toBeCloseTo(3.5);
  });
  test("SPH_CYL = |sph| + |cyl|", () => {
    expect(svc.computeDistance("SPH_CYL", "1d00|m2d00")).toBeCloseTo(3);
  });
  test("BASE_ADD = |base_izq| + |base_der|", () => {
    expect(svc.computeDistance("BASE_ADD", "1d50|m1d50|2d00")).toBeCloseTo(3);
  });
});

describe("urgency — más lejos del neutro = menos urgente", () => {
  test("CRÍTICO decrece con la distancia y se acota a 100", () => {
    const near = svc.urgency("CRITICO", 0);
    const far = svc.urgency("CRITICO", 8);
    expect(near).toBeGreaterThan(far);
    expect(near).toBeLessThanOrEqual(100);
    expect(far).toBeGreaterThan(0);
  });
  test("BAJO < CRÍTICO a igual distancia", () => {
    expect(svc.urgency("BAJO", 0)).toBeLessThan(svc.urgency("CRITICO", 0));
  });
  test("niveles sin alerta → 0", () => {
    expect(svc.urgency("NEUTRO", 0)).toBe(0);
    expect(svc.urgency("BUENO", 0)).toBe(0);
  });
});

describe("cellCoords — coordenadas estructuradas (sin formato)", () => {
  test("SPH_CYL_AXIS expone sph/cyl/axis", () => {
    const c = svc.cellCoords("SPH_CYL_AXIS", "1d00|m2d00|90d00");
    expect(c.sph).toBeCloseTo(1);
    expect(c.cyl).toBeCloseTo(-2);
    expect(c.axis).toBe(90);
  });
  test("BASE_ADD expone base_izq/base_der/add + eye", () => {
    const c = svc.cellCoords("BASE_ADD", "1d00|1d50|2d00", "OD");
    expect(c.base_izq).toBeCloseTo(1);
    expect(c.base_der).toBeCloseTo(1.5);
    expect(c.add).toBeCloseTo(2);
    expect(c.eye).toBe("OD");
  });
});

describe("identidad de planilla", () => {
  test("sheetLabel prioriza el nombre", () => {
    expect(svc.sheetLabel({ nombre: "Mi Planilla", baseKey: "torico" })).toBe("Mi Planilla");
    expect(svc.sheetLabel({ baseKey: "torico", material: "Hidrogel" })).toBe("torico · Hidrogel");
  });
  test("sheetInfo arma identidad completa + tipoLabel legible", () => {
    const info = svc.sheetInfo({
      nombre: "X", sku: "ABC", tipo_matriz: "SPH_CYL_AXIS",
      proveedor: { name: "Prov" }, marca: { name: "Marca" }, baseKey: "torico",
    });
    expect(info).toMatchObject({ name: "X", sku: "ABC", proveedor: "Prov", marca: "Marca", tipoLabel: "Tórico" });
  });
});
