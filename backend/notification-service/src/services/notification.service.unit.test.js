"use strict";

const { decideStockAction, priorityFromScore, CYCLE_MS } = require("./notification.service");

const NOW = Date.now();
const evWith = (hash = "h1") => ({ hash, urgencyScore: 90, critCount: 3, lowCount: 0 });

describe("priorityFromScore", () => {
  test("mapea score → prioridad", () => {
    expect(priorityFromScore(90)).toBe("critical");
    expect(priorityFromScore(60)).toBe("high");
    expect(priorityFromScore(30)).toBe("medium");
    expect(priorityFromScore(10)).toBe("low");
  });
});

describe("decideStockAction — política pura (CERO contadores)", () => {
  test("no existe → create", () => {
    expect(decideStockAction({ existing: null, ev: evWith(), now: NOW, resurface: true, pinned: false }))
      .toEqual({ action: "create" });
  });

  test("vigente > 3 días → regenerate", () => {
    const existing = { createdAt: new Date(NOW - (CYCLE_MS + 1000)), contentHash: "h1" };
    expect(decideStockAction({ existing, ev: evWith("h1"), now: NOW, resurface: false, pinned: false }))
      .toEqual({ action: "regenerate" });
  });

  test("dentro del ciclo, no fijada, con tick de cadencia → revive", () => {
    const existing = { createdAt: new Date(NOW - 1000), contentHash: "h1" };
    expect(decideStockAction({ existing, ev: evWith("h1"), now: NOW, resurface: true, pinned: false }))
      .toEqual({ action: "revive" });
  });

  test("dentro del ciclo, no fijada, sin tick pero cambió contenido → refresh", () => {
    const existing = { createdAt: new Date(NOW - 1000), contentHash: "viejo" };
    expect(decideStockAction({ existing, ev: evWith("nuevo"), now: NOW, resurface: false, pinned: false }))
      .toEqual({ action: "refresh" });
  });

  test("dentro del ciclo, no fijada, sin tick y mismo contenido → skip", () => {
    const existing = { createdAt: new Date(NOW - 1000), contentHash: "h1" };
    expect(decideStockAction({ existing, ev: evWith("h1"), now: NOW, resurface: false, pinned: false }))
      .toEqual({ action: "skip" });
  });

  test("FIJADA: nunca revive (deja de spamear), refresca solo si cambió", () => {
    const base = { createdAt: new Date(NOW - 1000) };
    // mismo contenido + tick de cadencia → igual NO revive (skip)
    expect(decideStockAction({ existing: { ...base, contentHash: "h1" }, ev: evWith("h1"), now: NOW, resurface: true, pinned: true }))
      .toEqual({ action: "skip" });
    // cambió contenido → refresh silencioso (no revive)
    expect(decideStockAction({ existing: { ...base, contentHash: "viejo" }, ev: evWith("nuevo"), now: NOW, resurface: true, pinned: true }))
      .toEqual({ action: "refresh" });
  });

  test("ninguna acción implica contador (set acotado)", () => {
    const acciones = new Set(["create", "regenerate", "revive", "refresh", "skip"]);
    const existing = { createdAt: new Date(NOW - 1000), contentHash: "h1" };
    for (const [resurface, pinned] of [[true, false], [false, false], [true, true], [false, true]]) {
      const { action } = decideStockAction({ existing, ev: evWith("h2"), now: NOW, resurface, pinned });
      expect(acciones.has(action)).toBe(true);
    }
  });
});
