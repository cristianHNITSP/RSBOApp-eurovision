/**
 * Configuración centralizada de categorías y tipos para el módulo de Óptica
 */

export const ARMAZONES_CONFIG = {
  materiales: ["Acetato", "Metal", "TR-90", "Titanio", "Combinado", "Madera", "Otro"],
  tipos: ["Completo", "Ranurado", "Al aire", "Clip-on"],
  generos: ["Hombre", "Mujer", "Unisex", "Niño/a"]
};

export const SOLUCIONES_CONFIG = {
  tipos: ["Solucion multiusos", "Solucion salina", "Gotas lubricantes", "Solucion peroxido", "Limpiador enzimático", "Otro"]
};

export const ACCESORIOS_CONFIG = {
  categorias: ["Paño", "Cadena", "Plaquetas", "Tornillos", "Limpiador", "Almohadillas", "Herramienta", "Otro"]
};

export const ESTUCHES_CONFIG = {
  tipos: ["Rigido", "Semirigido", "Blando", "Funda", "Microfibra", "Plegable", "Deportivo", "Lentes de contacto", "Otro"]
};

export const EQUIPOS_CONFIG = {
  areas: ["Diagnóstico", "Taller", "Gabinete", "Venta", "Administración"],
  estados: ["Operativo", "Mantenimiento", "Fuera de servicio", "Baja"]
};

export const OPTICA_TABS = [
  { key: "armazones",  label: "Armazones",          icon: "glasses" },
  { key: "soluciones", label: "Soluciones y Gotas",  icon: "tint" },
  { key: "accesorios", label: "Accesorios",          icon: "puzzle-piece" },
  { key: "estuches",   label: "Estuches",            icon: "box-open" },
  { key: "equipos",    label: "Equipos",             icon: "tools" },
];
