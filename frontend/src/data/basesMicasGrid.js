import { themeQuartz, iconSetQuartzLight } from 'ag-grid-community';

/* Theme editorial glass — themeQuartz + iconSetQuartzLight.
   Todos los colores referencian tokens de /tokens/index.css mediante var().
   AG Grid pasa los valores como literales CSS, así que el browser resuelve
   los var() en su use-site y respeta el override de [data-theme="oscuro"]
   automáticamente. Los withParams 'dark' solo cambian referencias cuando
   el token base difiere entre modos (ej. purple-500 → purple-400). */
export const editorialGlassTheme = themeQuartz
  .withPart(iconSetQuartzLight)
  .withParams({
    /* Identidad */
    accentColor: 'var(--color-purple-500)',
    foregroundColor: 'var(--color-gray-900)',
    backgroundColor: 'var(--glass-bg)',
    /* Chrome (toolbar, filter panel) — Dashboard tab-content pattern: white glass, no purple tint */
    chromeBackgroundColor: 'rgba(var(--color-white-rgb), 0.6)',
    /* Bordes — Dashboard pattern: rgba(white, 0.4) */
    borderColor: 'rgba(var(--color-white-rgb), 0.4)',
    borderRadius: 2,
    wrapperBorder: false,
    wrapperBorderRadius: 2,
    rowBorder: false,
    columnBorder: { color: 'rgba(var(--color-purple-400-rgb), 0.07)' },
    sidePanelBorder: true,
    /* Header — clean white glass, no purple tint (Dashboard pattern) */
    headerBackgroundColor: 'rgba(var(--color-white-rgb), 0.65)',
    headerTextColor: 'var(--color-gray-700)',
    headerFontSize: 12,
    headerFontWeight: 700,
    /* Filas — más sutil, menos purple dominante */
    oddRowBackgroundColor: 'rgba(var(--color-purple-50-rgb), 0.18)',
    rowHoverColor: 'rgba(var(--color-purple-500-rgb), 0.07)',
    selectedRowBackgroundColor: 'rgba(var(--color-purple-500-rgb), 0.12)',
    /* Tipografía */
    fontFamily: { googleFont: 'Inter' },
    fontSize: 13,
    iconSize: 16,
    cellHorizontalPadding: 16,
  })
  .withParams(
    {
      /* Solo overrides donde el token base difiere entre claro/oscuro */
      accentColor: 'var(--color-purple-400)',
      chromeBackgroundColor: 'rgba(var(--color-charcoal-900-rgb), 0.85)',
      /* Sidebar dark: rgba(white, 0.05) borders — muy sutil */
      borderColor: 'rgba(var(--color-white-rgb), 0.05)',
      columnBorder: { color: 'rgba(var(--color-white-rgb), 0.03)' },
      headerBackgroundColor: 'rgba(var(--color-charcoal-900-rgb), 0.88)',
      headerTextColor: 'var(--color-gray-500)',
      oddRowBackgroundColor: 'rgba(var(--color-white-rgb), 0.02)',
      /* Sidebar dark hover/active patterns */
      rowHoverColor: 'rgba(var(--color-purple-500-rgb), 0.10)',
      selectedRowBackgroundColor: 'rgba(var(--color-purple-500-rgb), 0.20)',
    },
    'dark',
  );

export const basesMicasColumnDefs = [
  {
    headerName: 'SPH',
    children: [
      {
        headerName: 'SKU',
        field: 'sku',
        maxWidth: 140,
        pinned: 'left',
        tooltipValueGetter: ({ value }) => value,
      },
    ],
  },
  {
    headerName: 'ADD',
    children: [
      {
        headerName: 'Tipo',
        field: 'tipo',
        tooltipField: 'tipo',
      },
      {
        headerName: 'Material',
        field: 'material',
        tooltipField: 'material',
      },
      {
        headerName: 'Curva Base',
        field: 'curvaBase',
        maxWidth: 140,
        tooltipField: 'curvaBase',
      },
      {
        headerName: 'Stock',
        field: 'stock',
        maxWidth: 120,
        tooltipValueGetter: ({ value }) =>
          value < 20 ? `⚠ Stock crítico (${value})` : value < 50 ? `↓ Stock bajo (${value})` : `✓ Stock OK (${value})`,
      },
      {
        headerName: 'Ubicación',
        field: 'ubicacion',
        tooltipField: 'ubicacion',
      },
      {
        headerName: 'Proveedor',
        field: 'proveedor',
        tooltipField: 'proveedor',
      },
    ],
  },
];

export const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 120,
  };


export const basesMicasRowData = [
  {
    sku: 'BM-1001',
    tipo: 'Base 1.50',
    material: 'CR-39',
    curvaBase: '2.00',
    stock: 120,
    ubicacion: 'A-01',
    proveedor: 'VisionLab',
  },
  {
    sku: 'BM-1024',
    tipo: 'Base 1.60',
    material: 'MR-8',
    curvaBase: '4.00',
    stock: 58,
    ubicacion: 'A-07',
    proveedor: 'OptiSupply',
  },
  {
    sku: 'BM-1103',
    tipo: 'Mica Azul',
    material: 'Policarbonato',
    curvaBase: '6.00',
    stock: 32,
    ubicacion: 'B-02',
    proveedor: 'BlueShield',
  },
  {
    sku: 'BM-1209',
    tipo: 'Mica Fotocromatica',
    material: 'Trivex',
    curvaBase: '8.00',
    stock: 20,
    ubicacion: 'B-05',
    proveedor: 'LumenX',
  },
  {
    sku: 'BM-1302',
    tipo: 'Base 1.67',
    material: 'MR-7',
    curvaBase: '4.00',
    stock: 14,
    ubicacion: 'C-01',
    proveedor: 'OptiSupply',
  },
  {
    sku: 'BM-1322',
    tipo: 'Base 1.27',
    material: 'MR-72',
    curvaBase: '9.00',
    stock: 142,
    ubicacion: 'C-22',
    proveedor: 'OptiSupplyEurovision',
  },
  {
    sku: 'BM-1405',
    tipo: 'Base 1.74',
    material: 'Alto Índice',
    curvaBase: '3.00',
    stock: 45,
    ubicacion: 'D-03',
    proveedor: 'VisionLab',
  },
  {
    sku: 'BM-1410',
    tipo: 'Mica Anti-reflejante',
    material: 'CR-39',
    curvaBase: '5.00',
    stock: 210,
    ubicacion: 'A-02',
    proveedor: 'OptiSupply',
  },
  {
    sku: 'BM-1520',
    tipo: 'Base 1.56',
    material: 'Resina',
    curvaBase: '2.50',
    stock: 85,
    ubicacion: 'D-08',
    proveedor: 'Eurovision',
  },
  {
    sku: 'BM-1601',
    tipo: 'Progresiva Regular',
    material: 'Policarbonato',
    curvaBase: '7.00',
    stock: 15,
    ubicacion: 'E-01',
    proveedor: 'ClearVision',
  },
  {
    sku: 'BM-1650',
    tipo: 'Bifocal Flat Top',
    material: 'CR-39',
    curvaBase: '4.50',
    stock: 63,
    ubicacion: 'E-12',
    proveedor: 'LumenX',
  },
];
