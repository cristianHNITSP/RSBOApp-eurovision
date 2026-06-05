/**
 * @fileoverview Enums y configuración de categorías del módulo Óptica.
 * Esta es la FUENTE DE VERDAD para el routing dinámico (router factory) y el seed
 * de categorías. La colección OpticaCategory es un espejo gestionable de OPTICA_CATEGORIES.
 *
 * `dictionaries` alimenta los selects (kind:"select", lista cerrada validada en la ruta) y
 * el autocompletado (kind:"autocomplete", semilla + valores distinct de la BD; texto libre).
 * Los enums estrictos del discriminator se relajaron: la validación de selects vive aquí.
 */

// Listas canónicas (consolidan los valores que antes divergían entre front y back).
const ENUMS = {
  ARMAZON_MATERIAL: ["Acetato", "Metal", "TR-90", "Titanio", "Combinado", "Madera", "Otro"],
  ARMAZON_TIPO: ["Completo", "Ranurado", "Al aire", "Semi-al-aire", "Clip-on", "Deportivo", "Infantil", "Otro"],
  GENERO: ["Hombre", "Mujer", "Unisex", "Infantil", "Niño/a"],
  SOLUCION_TIPO: ["Solucion multiusos", "Solucion salina", "Gotas lubricantes", "Solucion peroxido", "Limpiador enzimático", "Otro"],
  ACCESORIO_CATEGORIA: ["Paño", "Cadena", "Plaquetas", "Tornillos", "Limpiador", "Almohadillas", "Herramienta", "Otro"],
  ESTUCHE_TIPO: ["Rigido", "Semirigido", "Blando", "Funda", "Microfibra", "Plegable", "Deportivo", "Lentes de contacto", "Otro"],
  EQUIPO_TIPO: ["Diagnóstico", "Medición", "Taller", "Laboratorio", "Gabinete", "Venta", "Administración", "Otro"],
  EQUIPO_ESTADO: ["Operativo", "Mantenimiento", "Fuera de servicio", "Baja"],
  LENTE_TIPO: ["Esferico", "Torico", "Multifocal", "Colorido", "Otro"],
  LENTE_MATERIAL: ["Hidrogel", "Silicona-Hidrogel", "HEMA", "Polímero", "Otro"],
  LENTE_DURACION: ["Diario", "Quincenal", "Mensual", "Anual", "Otro"],
};

// Helpers para construir diccionarios de forma compacta.
const sel = (options) => ({ kind: "select", options });
const ac = (options = []) => ({ kind: "autocomplete", options });

// Tipos válidos para el changelog (claves de categoría)
const COLLECTION_KEYS = ["armazones", "lentes", "soluciones", "accesorios", "estuches", "equipos"];

/**
 * Registro de categorías = tipos de producto.
 * - key         : ruta y clave pública (frontend → /api/optica/<key>)
 * - model       : nombre del discriminator de Mongoose (OpticaProduct.discriminator)
 * - skuPrefix   : prefijo del SKU auto-generado (ej. "ARM" → ARM-000001)
 * - hasStock    : si la categoría maneja stock (equipos = false)
 * - textFields  : campos string a sanitizar (anti-XSS) en create/update
 * - searchFields: campos usados en la búsqueda ?q= y en el buscador global
 * - filterFields: campos permitidos para el filtro server-side
 * - dictionaries: opciones de select/autocomplete por campo (fuente única de verdad)
 * - bodyRules   : reglas express-validator específicas (sin sku: se auto-genera)
 */
const OPTICA_CATEGORIES = [
  {
    key: "armazones",
    model: "Armazon",
    label: "Armazones",
    icon: "glasses",
    order: 1,
    skuPrefix: "ARM",
    hasStock: true,
    textFields: ["sku", "marca", "modelo", "color", "talla", "serie", "notas"],
    searchFields: ["sku", "marca", "modelo"],
    filterFields: ["material", "tipo", "genero"],
    dictionaries: {
      material: sel(ENUMS.ARMAZON_MATERIAL),
      tipo: sel(ENUMS.ARMAZON_TIPO),
      genero: sel(ENUMS.GENERO),
      marca: ac(),
      modelo: ac(),
      color: ac(),
      talla: ac(),
      serie: ac(),
    },
    bodyRules: [
      { field: "marca", type: "string", required: true, msg: "Marca requerida" },
      { field: "modelo", type: "string", required: true, msg: "Modelo requerido" },
      { field: "precio", type: "float", required: true, msg: "Precio inválido" },
      { field: "stock", type: "int", required: true, msg: "Stock inválido" },
    ],
  },
  {
    key: "lentes",
    model: "LenteContacto",
    label: "Lentes de contacto",
    icon: "eye",
    order: 2,
    skuPrefix: "LEN",
    hasStock: true,
    textFields: ["sku", "marca", "nombre", "graduacion", "notas"],
    searchFields: ["sku", "marca", "nombre"],
    filterFields: ["tipo", "material", "duracion"],
    dictionaries: {
      tipo: sel(ENUMS.LENTE_TIPO),
      material: sel(ENUMS.LENTE_MATERIAL),
      duracion: sel(ENUMS.LENTE_DURACION),
      marca: ac(),
      nombre: ac(),
      graduacion: ac(),
    },
    bodyRules: [
      { field: "marca", type: "string", required: true, msg: "Marca requerida" },
      { field: "nombre", type: "string", required: true, msg: "Nombre requerido" },
      { field: "precio", type: "float", required: true, msg: "Precio inválido" },
      { field: "stock", type: "int", required: true, msg: "Stock inválido" },
    ],
  },
  {
    key: "soluciones",
    model: "Solucion",
    label: "Soluciones y Gotas",
    icon: "tint",
    order: 3,
    skuPrefix: "SOL",
    hasStock: true,
    textFields: ["sku", "nombre", "marca", "notas"],
    searchFields: ["sku", "nombre", "marca"],
    filterFields: ["tipo"],
    dictionaries: {
      tipo: sel(ENUMS.SOLUCION_TIPO),
      marca: ac(),
      nombre: ac(),
    },
    bodyRules: [
      { field: "nombre", type: "string", required: true, msg: "Nombre requerido" },
      { field: "marca", type: "string", required: true, msg: "Marca requerida" },
      { field: "volumen", type: "float", required: true, msg: "Volumen inválido" },
      { field: "precio", type: "float", required: true, msg: "Precio inválido" },
      { field: "stock", type: "int", required: true, msg: "Stock inválido" },
    ],
  },
  {
    key: "accesorios",
    model: "Accesorio",
    label: "Accesorios",
    icon: "puzzle-piece",
    order: 4,
    skuPrefix: "ACC",
    hasStock: true,
    textFields: ["sku", "nombre", "marca", "compatible", "notas"],
    searchFields: ["sku", "nombre", "categoria"],
    filterFields: ["categoria"],
    dictionaries: {
      categoria: sel(ENUMS.ACCESORIO_CATEGORIA),
      marca: ac(),
      nombre: ac(),
      compatible: ac(),
    },
    bodyRules: [
      { field: "nombre", type: "string", required: true, msg: "Nombre requerido" },
      { field: "precio", type: "float", required: true, msg: "Precio inválido" },
      { field: "stock", type: "int", required: true, msg: "Stock inválido" },
    ],
  },
  {
    key: "estuches",
    model: "Estuche",
    label: "Estuches",
    icon: "box-open",
    order: 5,
    skuPrefix: "EST",
    hasStock: true,
    textFields: ["sku", "nombre", "material", "color", "compatible", "notas"],
    searchFields: ["sku", "nombre", "tipo"],
    filterFields: ["tipo"],
    dictionaries: {
      tipo: sel(ENUMS.ESTUCHE_TIPO),
      nombre: ac(),
      material: ac(),
      color: ac(),
      compatible: ac(),
    },
    bodyRules: [
      { field: "nombre", type: "string", required: true, msg: "Nombre requerido" },
      { field: "precio", type: "float", required: true, msg: "Precio inválido" },
      { field: "stock", type: "int", required: true, msg: "Stock inválido" },
    ],
  },
  {
    key: "equipos",
    model: "Equipo",
    label: "Equipos",
    icon: "tools",
    order: 6,
    skuPrefix: "EQP",
    hasStock: false,
    textFields: ["sku", "nombre", "marca", "modelo", "serie", "ubicacion", "notas"],
    searchFields: ["sku", "nombre", "marca", "serie"],
    filterFields: ["tipo", "estado"],
    dictionaries: {
      tipo: sel(ENUMS.EQUIPO_TIPO),
      estado: sel(ENUMS.EQUIPO_ESTADO),
      marca: ac(),
      modelo: ac(),
      serie: ac(),
      ubicacion: ac(),
      nombre: ac(),
    },
    bodyRules: [
      { field: "nombre", type: "string", required: true, msg: "Nombre requerido" },
      { field: "marca", type: "string", required: true, msg: "Marca requerida" },
    ],
  },
];

const CATEGORY_BY_KEY = Object.fromEntries(OPTICA_CATEGORIES.map((c) => [c.key, c]));

// Mapa nombre-de-discriminator → prefijo de SKU (para el hook de generación).
const SKU_PREFIX_BY_MODEL = Object.fromEntries(
  OPTICA_CATEGORIES.map((c) => [c.model, c.skuPrefix])
);

module.exports = {
  ENUMS,
  COLLECTION_KEYS,
  OPTICA_CATEGORIES,
  CATEGORY_BY_KEY,
  SKU_PREFIX_BY_MODEL,
};
