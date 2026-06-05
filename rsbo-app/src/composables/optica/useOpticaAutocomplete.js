import { reactive } from "vue";
import { categoriasService } from "@/services/optica.js";

/**
 * useOpticaAutocomplete — sugerencias para campos de texto libre del form de óptica.
 *
 * Por cada (categoría, campo) de tipo "autocomplete" del diccionario:
 *   - siembra con las opciones del diccionario,
 *   - las fusiona con los valores `distinct` reales de la BD (cacheado),
 *   - normaliza acentos y filtra por lo que el usuario va escribiendo.
 *
 * Espejo de useVendorAutocomplete (tabsmanager) pero para el módulo óptica.
 */
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s) =>
  String(s || "").normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();

export function useOpticaAutocomplete() {
  // cache: clave `${categoria}:${field}` → array de opciones fusionadas
  const cache = reactive({});

  // Refetch en curso por clave, para no lanzar consultas duplicadas en paralelo.
  const inflight = {};

  /**
   * Carga/refresca los autocompletes de una categoría desde su diccionario.
   * Se llama en CADA apertura del form: muestra lo ya cacheado de inmediato y
   * re-consulta el distinct en segundo plano, de modo que los valores recién
   * creados/editados aparezcan sin recargar la página.
   */
  async function prime(categoria, dictionaries = {}) {
    for (const [field, d] of Object.entries(dictionaries)) {
      if (d?.kind !== "autocomplete") continue;
      const ck = `${categoria}:${field}`;
      // Semilla sólo la 1ª vez (no pisa lo que ya hubiera mientras refresca).
      if (!cache[ck]) cache[ck] = [...(d.options || [])];
      if (inflight[ck]) continue;
      inflight[ck] = categoriasService
        .distinct(categoria, field)
        .then(({ data }) => {
          const merged = new Map();
          [...(d.options || []), ...(data?.data || [])].forEach((v) => {
            const k = norm(v);
            if (k && !merged.has(k)) merged.set(k, String(v).trim());
          });
          cache[ck] = Array.from(merged.values()).sort((a, b) => a.localeCompare(b, "es"));
        })
        .catch(() => { /* mantiene lo cacheado */ })
        .finally(() => { delete inflight[ck]; });
    }
  }

  /** Opciones filtradas por lo que el usuario escribe (máx 30). */
  function filtered(categoria, field, query) {
    const base = cache[`${categoria}:${field}`] || [];
    const q = norm(query);
    if (!q) return base.slice(0, 30);
    return base.filter((o) => norm(o).includes(q)).slice(0, 30);
  }

  return { prime, filtered };
}
