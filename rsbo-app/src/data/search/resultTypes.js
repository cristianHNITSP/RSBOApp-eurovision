// src/data/search/resultTypes.js
// Registro de TIPOS de resultado del buscador (open/closed).
// Añadir un módulo nuevo = una entrada aquí: define su grupo, su componente de
// ítem, a dónde navega (target) y cómo se guarda en historial (history).
// `group` debe coincidir con la clave del grupo que devuelve el backend.

import SearchRouteItem from "@/components/search/items/SearchRouteItem.vue";
import SearchOpticaItem from "@/components/search/items/SearchOpticaItem.vue";
import SearchSheetItem from "@/components/search/items/SearchSheetItem.vue";
import SearchDiopterItem from "@/components/search/items/SearchDiopterItem.vue";

/** Ruta de la planilla según su categoría. */
function sheetPath(category) {
  return category === "Lentes de contacto"
    ? "/l/inventario/lentes-contacto"
    : "/l/inventario/bases-micas";
}

/** Lado interno (pestaña ±) para enfocar: familia (base/sph) + signo del valor de fila.
 *  En modo 'col' (solo columna) no hay fila → lado positivo por defecto (la columna existe en ambos). */
function diopterSide(i) {
  const family = i.rowField === "base" || String(i.tipo_matriz || "").startsWith("BASE") ? "base" : "sph";
  const neg = i.mode !== "col" && Number(i.rowVal) < 0;
  return `${family}-${neg ? "neg" : "pos"}`;
}

/** Query de deep-link según el modo (row/col/cell). */
function diopterQuery(i) {
  const q = { sheetId: i.id, focusSide: diopterSide(i) };
  if (i.rowVal != null && i.mode !== "col") q.focusRow = String(i.rowVal);
  if (i.colVal != null && i.mode !== "row") q.focusCol = String(i.colVal);
  return q;
}

export const RESULT_TYPES = {
  diopters: {
    type: "diopter",
    order: 1,
    group: "Dioptrías",
    icon: "ruler-combined",
    item: SearchDiopterItem,
    target: (i) => ({ path: sheetPath(i.category), query: diopterQuery(i) }),
    history: (i) => {
      const q = diopterQuery(i);
      const sub = i.mode === "cell" ? `${i.rowVal} × ${i.colVal}` : i.mode === "col" ? `col ${i.colVal}` : `fila ${i.rowVal}`;
      return {
        id: `${i.id}:${i.mode}:${i.rowVal ?? ""}:${i.colVal ?? ""}`, type: "diopter",
        label: i.nombre, sub: `${i.tipoLabel} · ${sub}`,
        routePath: sheetPath(i.category), routeQuery: q,
      };
    },
  },
  optica: {
    type: "optica",
    order: 2,
    group: "Óptica",
    icon: "eye",
    item: SearchOpticaItem,
    target: (i) => ({ path: "/l/inventario/optica", query: { categoria: i.categoria, sku: i.sku } }),
    history: (i) => ({
      id: i.id, type: "optica", label: i.label, sub: i.tipoLabel,
      routePath: "/l/inventario/optica", routeQuery: { categoria: i.categoria, sku: i.sku },
    }),
  },
  sheets: {
    type: "sheet",
    order: 3,
    group: "Planillas",
    icon: "glasses",
    item: SearchSheetItem,
    target: (i) => ({ path: sheetPath(i.category), query: { sheetId: i.id } }),
    history: (i) => ({
      id: i.id, type: "sheet", label: i.nombre, sub: i.tipoLabel,
      routePath: sheetPath(i.category), routeQuery: { sheetId: i.id },
    }),
  },
  routes: {
    type: "route",
    order: 4,
    group: "Páginas",
    icon: "compass",
    item: SearchRouteItem,
    target: (i) => ({ path: i.routePath, query: i.routeQuery || undefined }),
    history: (i) => ({
      id: i.id, type: "route", label: i.label, routePath: i.routePath, routeQuery: i.routeQuery || null,
    }),
  },
};

/** Grupos ordenados para render (los que el backend puede devolver). */
export const RESULT_GROUPS = Object.entries(RESULT_TYPES)
  .map(([key, def]) => ({ key, ...def }))
  .sort((a, b) => a.order - b.order);

/** Mapa type→def (para historial/navegación por tipo de ítem). */
export const TYPE_DEFS = Object.fromEntries(
  Object.values(RESULT_TYPES).map((d) => [d.type, d])
);

/** Iconos por tipo (para filas de historial). */
export const TYPE_ICON = Object.fromEntries(
  Object.values(RESULT_TYPES).map((d) => [d.type, d.icon])
);
