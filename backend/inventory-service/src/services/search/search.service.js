"use strict";

const { PROVIDERS } = require("./registry");

const MIN_QUERY = 1;
const MAX_LIMIT = 20;

// type de item → grupo de la respuesta
const GROUP_OF = { route: "routes", sheet: "sheets", diopter: "diopters", optica: "optica" };

/**
 * Ejecuta todos los providers registrados en paralelo y agrupa por tipo.
 * Resiliente: si un provider falla, no tumba la búsqueda completa.
 * @returns {{ routes, sheets, diopters, optica }} (grupos vacíos omitidos)
 */
async function run(qRaw, limitRaw) {
  const q = String(qRaw || "").trim();
  if (q.length < MIN_QUERY) return {};

  const limit = Math.min(parseInt(limitRaw, 10) || 8, MAX_LIMIT);

  const settled = await Promise.allSettled(PROVIDERS.map((p) => p.search({ q, limit })));

  const groups = {};
  settled.forEach((res, i) => {
    if (res.status !== "fulfilled") {
      console.warn(`[search] provider '${PROVIDERS[i].key}' falló:`, res.reason?.message);
      return;
    }
    for (const item of res.value || []) {
      const group = GROUP_OF[item.type];
      if (!group) continue;
      (groups[group] ||= []).push(item);
    }
  });

  return groups;
}

module.exports = { run, MIN_QUERY, MAX_LIMIT };
