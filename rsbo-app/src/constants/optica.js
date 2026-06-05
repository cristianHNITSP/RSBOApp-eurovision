/**
 * Configuración mínima de Óptica.
 *
 * Las opciones de select/autocomplete YA NO viven aquí: son data-driven desde el
 * modelo de categoría (OpticaCategory.dictionaries), servidas por /api/optica/categorias.
 *
 * OPTICA_TABS se conserva sólo como fallback de pestañas si /categorias no responde
 * (ver useOpticaSection.js).
 */
export const OPTICA_TABS = [
  { key: "armazones",  label: "Armazones",          icon: "glasses" },
  { key: "soluciones", label: "Soluciones y Gotas",  icon: "tint" },
  { key: "accesorios", label: "Accesorios",          icon: "puzzle-piece" },
  { key: "estuches",   label: "Estuches",            icon: "box-open" },
  { key: "equipos",    label: "Equipos",             icon: "tools" },
];
