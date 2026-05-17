export const dashboardStats = [
  {
    icon: 'clipboard',
    value: '24',
    label: 'CATÁLOGOS DE LENTES',
    description: 'Plantillas activas (bases y micas)',
    variant: 'purple',
  },
  {
    icon: 'books',
    value: '1,250',
    label: 'GRADUACIONES DISPONIBLES',
    description: 'Esférica, Cilíndrica, Adición',
    variant: 'blue',
  },
  {
    icon: 'package',
    value: '8,500',
    label: 'LENTES EN ALMACÉN',
    description: 'Bases y micas (stock total)',
    variant: 'green',
  },
  {
    icon: 'warning',
    value: '3',
    label: 'STOCK BAJO EN LENTES',
    description: 'Graduaciones con 0-2 unidades',
    variant: 'orange',
    badge: true,
  },
  {
    icon: 'cart',
    value: '450',
    label: 'PRODUCTOS EN TIENDA',
    description: 'Armazones, soluciones, accesorios, etc.',
    variant: 'cyan',
  },
  {
    icon: 'store',
    value: '1,200',
    label: 'PIEZAS TOTALES TIENDA',
    description: 'Stock acumulado de todos los productos',
    variant: 'cyan',
  },
  {
    icon: 'warning',
    value: '12',
    label: 'AGOTADOS EN TIENDA',
    description: 'Productos con 0 unidades',
    variant: 'red',
    badge: true,
  },
  {
    icon: 'money',
    value: '$85,000',
    label: 'VALOR INVENTARIO TIENDA',
    description: 'Valor estimado total en MXN',
    variant: 'green',
  },
];

export const dashboardTabs = [
  { id: 'resumen', label: 'Resumen', icon: 'chart' },
  { id: 'movimientos', label: 'Movimientos', icon: 'trendUp' },
  { id: 'desempeno', label: 'Mi Desempeño', icon: 'analytics' },
  { id: 'operaciones', label: 'Operaciones', icon: 'settings' },
  { id: 'devoluciones', label: 'Devoluciones', icon: 'return', badge: 2 },
  { id: 'optica', label: 'Óptica', icon: 'glasses' },
];
