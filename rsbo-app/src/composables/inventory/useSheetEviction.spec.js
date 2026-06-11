import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Lifecycle de Vue: registramos el listener de inmediato y guardamos su cleanup
// para desmontarlo entre tests (evita listeners acumulados en window).
const { danger, cleanups } = vi.hoisted(() => ({ danger: vi.fn(), cleanups: [] }));
vi.mock("vue", () => ({ onMounted: (cb) => cb(), onBeforeUnmount: (cb) => cleanups.push(cb) }));
vi.mock("@/composables/shared/useLabToast.js", () => ({ labToast: { danger } }));

import { useSheetEviction } from "./useSheetEviction.js";

function setup({ isCL = false } = {}) {
  const pager = { sheets: [{ id: "A" }, { id: "B" }, { id: "C" }] };
  const closeTab = vi.fn();
  const ws = { closeTab, activeId: { value: "B" } };
  const activeSheet = { value: "A" };
  const { evict } = useSheetEviction({ pager, ws, activeSheet, isCL });
  return { pager, ws, activeSheet, evict };
}

function emitDeleted(payload) {
  window.dispatchEvent(new CustomEvent("lab:ws", { detail: { type: "SHEET_DELETED", payload } }));
}

beforeEach(() => danger.mockClear());
afterEach(() => { cleanups.forEach((c) => c()); cleanups.length = 0; }); // desmonta listeners

describe("useSheetEviction", () => {
  test("evict() quita de la barra, cierra la pestaña, reubica la activa y avisa", () => {
    const { pager, ws, activeSheet, evict } = setup();
    const did = evict("A", "Planilla A");
    expect(did).toBe(true);
    expect(pager.sheets.map((s) => s.id)).toEqual(["B", "C"]); // fuera de la barra
    expect(ws.closeTab).toHaveBeenCalledWith("A");             // pestaña cerrada
    expect(activeSheet.value).toBe("B");                       // reubicada (ws.activeId)
    expect(danger).toHaveBeenCalledTimes(1);
    expect(danger.mock.calls[0][0]).toContain("Planilla A");
  });

  test("idempotente: el mismo id no evicta dos veces", () => {
    const { evict } = setup();
    expect(evict("C", "C")).toBe(true);
    expect(evict("C", "C")).toBe(false);
    expect(danger).toHaveBeenCalledTimes(1);
  });

  test("WS SHEET_DELETED de la misma sección evicta", () => {
    const { pager } = setup({ isCL: false });
    emitDeleted({ sheetId: "B", name: "Planilla B", isCL: false });
    expect(pager.sheets.map((s) => s.id)).toEqual(["A", "C"]);
    expect(danger).toHaveBeenCalledTimes(1);
  });

  test("WS de OTRA sección (isCL distinto) se ignora", () => {
    const { pager } = setup({ isCL: false });
    emitDeleted({ sheetId: "B", name: "Planilla B", isCL: true }); // CL, esta vista es micas
    expect(pager.sheets.map((s) => s.id)).toEqual(["A", "B", "C"]); // intacta
    expect(danger).not.toHaveBeenCalled();
  });

  test("evict de una planilla que NO está abierta: no rompe (closeTab no-op) pero avisa", () => {
    const { pager, ws, evict } = setup();
    expect(evict("ZZZ", "Fantasma")).toBe(true); // no está en la barra
    expect(pager.sheets).toHaveLength(3);        // barra intacta
    expect(ws.closeTab).toHaveBeenCalledWith("ZZZ");
    expect(danger).toHaveBeenCalledTimes(1);
  });
});
