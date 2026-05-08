export const HELP_TABS = [
  { key: 'inicio', label: 'Inicio', icon: 'home' },
  { key: 'pantallas', label: 'Pantallas', icon: 'desktop' },
  { key: 'inventario', label: 'Inventario', icon: 'layer-group' },
  { key: 'ventas', label: 'Ventas & Lab', icon: 'flask' },
  { key: 'nomenclaturas', label: 'Nomenclaturas', icon: 'tags' },
  { key: 'cuenta', label: 'Mi cuenta', icon: 'cog' },
  { key: 'sistema', label: '¿Cómo funciona?', icon: 'server' },
  { key: 'referencia', label: 'Referencia', icon: 'question-circle' },
];

export const VALID_TABS = HELP_TABS.map((t) => t.key);

export const TAB_LABELS = HELP_TABS.reduce((acc, t) => {
  acc[t.key] = t.label;
  return acc;
}, {});

// Anchor id → tab key
export const SECTION_TAB = {
  sec_inicio: 'inicio',
  sec_notificaciones: 'inicio',
  sec_pantallas: 'pantallas',
  sec_inventario: 'inventario',
  sec_ventas: 'ventas',
  sec_laboratorio: 'ventas',
  sec_config: 'cuenta',
  sec_usuarios: 'cuenta',
  sec_sku: 'nomenclaturas',
  sec_folios: 'nomenclaturas',
  sec_codebar: 'nomenclaturas',
  sec_matrices: 'nomenclaturas',
  sec_tratamientos: 'nomenclaturas',
  sec_estados: 'nomenclaturas',
  sec_coordenadas: 'nomenclaturas',
  sec_sistema: 'sistema',
  sec_atajos: 'referencia',
  sec_solucion: 'referencia',
  sec_faq: 'referencia',
  sec_soporte: 'referencia',
};
