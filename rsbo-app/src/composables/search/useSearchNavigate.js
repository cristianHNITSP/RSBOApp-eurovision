// src/composables/search/useSearchNavigate.js
// Navegación de un resultado de búsqueda. El "foco" (sheet/dioptría/óptica) lo
// resuelve la vista destino al leer la query (?sheetId / ?focusDiopter / ?categoria&sku),
// reutilizando la infraestructura de deep-link existente. Aquí solo: router.push + historial.
import { useRouter } from "vue-router";
import { TYPE_DEFS } from "@/data/search/resultTypes.js";
import { pushSearchHistory } from "@/services/search.service.js";

export function useSearchNavigate() {
  const router = useRouter();

  /** Navega a un resultado (item.data + su typeDef) y lo guarda en historial. */
  function go(typeDef, data) {
    if (!typeDef) return;
    const hist = typeDef.history(data);
    if (hist) pushSearchHistory(hist);
    router.push(normalize(typeDef.target(data)));
  }

  /** Re-navega desde una entrada de historial (ya trae routePath/routeQuery). */
  function goHistory(h) {
    if (!h?.routePath) return;
    pushSearchHistory(h); // refresca su timestamp
    router.push(normalize({ path: h.routePath, query: h.routeQuery || undefined }));
  }

  /** Navega por tipo+data crudos (helper para flatten items). */
  function goByType(type, data) {
    return go(TYPE_DEFS[type], data);
  }

  return { go, goHistory, goByType };
}

function normalize(target) {
  if (!target) return "/";
  if (target.query && Object.keys(target.query).length === 0) return { path: target.path };
  return target;
}
