"use strict";

const { normalize, escapeRegex, isNumber, inRange, parseDiopterQuery } = require("./text.util");
const { routesProvider } = require("./providers/routes.provider");

describe("text.util", () => {
  test("normalize: minúsculas + sin tildes", () => {
    expect(normalize("Óptica")).toBe("optica");
    expect(normalize("ANÁLISIS")).toBe("analisis");
    expect(normalize(null)).toBe("");
  });

  test("escapeRegex: escapa metacaracteres", () => {
    expect(escapeRegex("2.50")).toBe("2\\.50");
    expect(escapeRegex("a+b")).toBe("a\\+b");
    expect(escapeRegex("(x)")).toBe("\\(x\\)");
  });

  test("isNumber: detecta dioptrías", () => {
    expect(isNumber("-2.50")).toBe(true);
    expect(isNumber("+3")).toBe(true);
    expect(isNumber("0")).toBe(true);
    expect(isNumber("zeiss")).toBe(false);
    expect(isNumber("2.5x")).toBe(false);
  });

  test("inRange: cubre rango ascendente y descendente", () => {
    const cond = inRange("ranges.sph", -2.5);
    expect(cond.$or).toHaveLength(2);
    expect(cond.$or[0].$and[0]["ranges.sph.start"]).toEqual({ $lte: -2.5 });
    expect(cond.$or[0].$and[1]["ranges.sph.end"]).toEqual({ $gte: -2.5 });
  });

  test("parseDiopterQuery: 3 modos por sintaxis explícita", () => {
    expect(parseDiopterQuery("1.25")).toEqual({ mode: "row", row: 1.25 });
    expect(parseDiopterQuery("-2.50")).toEqual({ mode: "row", row: -2.5 });
    expect(parseDiopterQuery(", 4.00")).toEqual({ mode: "col", col: 4 });
    expect(parseDiopterQuery("1.25, 4.00")).toEqual({ mode: "cell", row: 1.25, col: 4 });
    expect(parseDiopterQuery("-1.25,-2")).toEqual({ mode: "cell", row: -1.25, col: -2 });
    // texto / vacío → null (búsqueda normal)
    expect(parseDiopterQuery("zeiss")).toBeNull();
    expect(parseDiopterQuery("2.5x")).toBeNull();
    expect(parseDiopterQuery("")).toBeNull();
  });
});

describe("routesProvider (puro, data estática)", () => {
  test("matchea por keyword normalizada", async () => {
    const out = await routesProvider.search({ q: "ventas" });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.type === "route")).toBe(true);
    expect(out.some((r) => r.routePath.startsWith("/l/ventas"))).toBe(true);
  });

  test("matchea con tildes/acentos indistintamente", async () => {
    const out = await routesProvider.search({ q: "optica" });
    expect(out.some((r) => /optica/i.test(r.routePath))).toBe(true);
  });

  test("sin match → vacío", async () => {
    const out = await routesProvider.search({ q: "zzzznoexiste" });
    expect(out).toEqual([]);
  });
});
