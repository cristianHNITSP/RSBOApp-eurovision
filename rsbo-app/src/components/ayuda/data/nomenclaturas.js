// Datos para la pestaña "Nomenclaturas".

export const SKU_EXAMPLE = 'JAP-TAI-BAS-POL-MON-BLN-A5F2';

export const SKU_BREAKDOWN = [
  { part: 'JAP', desc: 'Proveedor (abreviatura, 3 letras)' },
  { part: 'TAI', desc: 'Marca (abreviatura, 3 letras)' },
  { part: 'BAS', desc: 'Tipo de matriz (ver sección Matrices)' },
  { part: 'POL', desc: 'Material (POL = Policarbonato, CR3 = CR-39)' },
  { part: 'MON', desc: 'Base / clave de la planilla' },
  { part: 'BLN', desc: 'Tratamiento (BLN = Blanco, AR = Antirreflejante)' },
  { part: 'A5F2', desc: 'Código aleatorio (evita duplicados)' },
];

export const FOLIO_LAB = {
  example: 'LAB-20250328-A5F2',
  label: 'Folio de laboratorio',
  parts: [
    { part: 'LAB', desc: 'Prefijo fijo: pedido de laboratorio' },
    { part: '20250328', desc: 'Fecha: AAAA MM DD (28 marzo 2025)' },
    { part: 'A5F2', desc: '4 caracteres aleatorios' },
  ],
};

export const FOLIO_DEV = {
  example: 'DEV-2025-00001',
  label: 'Folio de devolución',
  parts: [
    { part: 'DEV', desc: 'Prefijo fijo: devolución' },
    { part: '2025', desc: 'Año en curso' },
    { part: '00001', desc: 'Consecutivo (5 dígitos, se reinicia cada año)' },
  ],
};

export const EAN13 = {
  example: '2 7 9 0 1 2 3 4 5 6 7 8 9',
  label: 'Ejemplo de código EAN-13',
  parts: [
    { part: '279', desc: 'Prefijo interno fijo (identifica que es un producto RSBO)' },
    { part: '012345678', desc: '9 dígitos generados a partir de la planilla, tipo de matriz y coordenadas ópticas' },
    { part: '9', desc: 'Dígito de control (verificación EAN-13)' },
  ],
};

export const MATRIX_TYPES = [
  { code: 'BASE', tipo: 'Monofocal (base)', coords: 'base' },
  { code: 'SPH_CYL', tipo: 'Monofocal esf. + cil.', coords: 'sph, cyl' },
  { code: 'SPH_ADD', tipo: 'Bifocal', coords: 'sph, add, base_izq, base_der, eye' },
  { code: 'BASE_ADD', tipo: 'Progresivo', coords: 'base_izq, base_der, add, eye' },
  { code: 'SPH_CYL_AXIS', tipo: 'Lente de contacto tórico', coords: 'sph, cyl, axis' },
];

export const TREATMENTS = [
  { code: 'BCO', name: 'Blanco (sin tratamiento)', notes: 'Todos los materiales' },
  { code: 'AR', name: 'Antirreflejante', notes: 'Todos excepto cristal' },
  { code: 'ANTIBLE', name: 'Anti luz azul', notes: 'Con o sin AR' },
  { code: 'FOTO', name: 'Fotocromático', notes: 'Con o sin AR' },
  { code: 'FOTO_ANTIBLE', name: 'Fotocromático + Anti luz azul', notes: 'Con o sin AR' },
  { code: 'TRANSITIONS', name: 'Transitions (fotocromático marca)', notes: 'Variantes: Gris, Café, Verde' },
  { code: 'POLAR', name: 'Polarizado', notes: 'Solo monofocal. Colores: Gris, Café, G15' },
  { code: 'POLAR_ESPEJO', name: 'Polarizado + Espejado', notes: 'Solo monofocal. 15 combinaciones de color' },
  { code: 'CRISTAL_FOTO', name: 'Fotocromático (cristal)', notes: 'Solo material Cristal' },
];

export const STATES_LAB = [
  { state: 'pendiente', dot: 'pendiente', desc: 'Pedido creado, sin atender' },
  { state: 'parcial', dot: 'parcial', desc: 'Algunos productos ya fueron surtidos' },
  { state: 'cerrado', dot: 'cerrado', desc: 'Todos los productos surtidos' },
  { state: 'cancelado', dot: 'cancelado', desc: 'Pedido cancelado (stock devuelto)' },
];

export const STATES_DEV = [
  { state: 'pendiente', dot: 'pendiente', desc: 'Devolución registrada' },
  { state: 'en_revision', dot: 'parcial', desc: 'En revisión' },
  { state: 'aprobada / procesada', dot: 'cerrado', desc: 'Aceptada y procesada' },
  { state: 'rechazada', dot: 'cancelado', desc: 'Devolución rechazada' },
];

export const COORDS = [
  { abrev: 'SPH', meaning: 'Esfera (poder esférico)', range: '-20.00 a +20.00' },
  { abrev: 'CYL', meaning: 'Cilindro (astigmatismo)', range: '-6.00 a 0.00' },
  { abrev: 'ADD', meaning: 'Adición (para lectura)', range: '+0.50 a +4.00' },
  { abrev: 'BASE', meaning: 'Curva base del lente', range: '0.00 a 10.00' },
  { abrev: 'AXIS', meaning: 'Eje del cilindro (grados)', range: '0 a 180' },
  { abrev: 'BI / BD', meaning: 'Base izquierda / Base derecha', range: 'Bifocales y progresivos' },
];

export const MATERIALS_TEXT =
  'CR-39 (plástico estándar) · Policarbonato · 1.56 · 1.61 MR-8 · 1.67 · 1.74 (ultra delgado) · Cristal (vidrio). El índice de refracción más alto = lente más delgado.';
