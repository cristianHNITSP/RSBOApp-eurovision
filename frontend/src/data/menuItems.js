export const menuSections = [
  {
    id: 'principal',
    label: 'PRINCIPAL',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'analiticas', label: 'Analíticas', icon: 'analytics', badge: 'NUEVO', badgeColor: 'orange' },
    ],
  },
  {
    id: 'gestion',
    label: 'GESTIÓN',
    items: [
      { id: 'usuarios', label: 'Usuarios', icon: 'users' },
      { id: 'inventario', label: 'Inventario', icon: 'box', hasSubmenu: true },
      { id: 'ventas', label: 'Ventas', icon: 'cart', hasSubmenu: true },
      { id: 'devoluciones', label: 'Devoluciones', icon: 'return' },
      { id: 'encargos', label: 'Encargos', icon: 'clipboard' },
    ],
  },
  {
    id: 'otros',
    label: 'OTROS',
    items: [
      { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
      { id: 'ayuda', label: 'Ayuda', icon: 'help' },
    ],
  },
];

export const pageTitles = {
  dashboard: 'Panel de Control',
  usuarios: 'Gestión de Usuarios',
  ajustes: 'Configuración',
  analiticas: 'Analíticas',
  inventario: 'Inventario',
  ventas: 'Ventas',
  devoluciones: 'Devoluciones',
  encargos: 'Encargos',
};

export const breadcrumbMap = {
  dashboard: ['Dashboard'],
  usuarios: ['Dashboard', 'Gestión de Usuarios'],
  ajustes: ['Dashboard', 'Configuración', 'Mi Usuario'],
  'ajustes-perfil': ['Dashboard', 'Configuración', 'Mi Usuario'],
  'ajustes-preferencias': ['Dashboard', 'Configuración', 'Preferencias'],
  'ajustes-seguridad': ['Dashboard', 'Configuración', 'Seguridad'],
  analiticas: ['Dashboard', 'Analíticas'],
  inventario: ['Dashboard', 'Inventario'],
  ventas: ['Dashboard', 'Ventas'],
  devoluciones: ['Dashboard', 'Devoluciones'],
  encargos: ['Dashboard', 'Encargos'],
};
