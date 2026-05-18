import { themeQuartz, iconSetQuartzLight } from 'ag-grid-community';

export const editorialGlassTheme = themeQuartz
  .withPart(iconSetQuartzLight)
  .withParams({
    accentColor: 'var(--color-purple-500)',
    foregroundColor: 'var(--color-gray-900)',
    backgroundColor: 'var(--glass-bg)',
    chromeBackgroundColor: 'rgba(var(--color-white-rgb), 0.6)',
    borderColor: 'rgba(var(--color-white-rgb), 0.4)',
    borderRadius: 2,
    wrapperBorder: false,
    wrapperBorderRadius: 2,
    rowBorder: false,
    columnBorder: { color: 'rgba(var(--color-purple-400-rgb), 0.07)' },
    sidePanelBorder: true,
    headerBackgroundColor: 'rgba(var(--color-white-rgb), 0.65)',
    headerTextColor: 'var(--color-gray-700)',
    headerFontSize: 12,
    headerFontWeight: 700,
    oddRowBackgroundColor: 'rgba(var(--color-purple-50-rgb), 0.18)',
    rowHoverColor: 'rgba(var(--color-purple-500-rgb), 0.07)',
    selectedRowBackgroundColor: 'rgba(var(--color-purple-500-rgb), 0.12)',
    fontFamily: { googleFont: 'Inter' },
    fontSize: 13,
    iconSize: 16,
    cellHorizontalPadding: 16,
  })
  .withParams(
    {
      accentColor: 'var(--color-purple-400)',
      chromeBackgroundColor: 'rgba(var(--color-charcoal-900-rgb), 0.85)',
      borderColor: 'rgba(var(--color-white-rgb), 0.05)',
      columnBorder: { color: 'rgba(var(--color-white-rgb), 0.03)' },
      headerBackgroundColor: 'rgba(var(--color-charcoal-900-rgb), 0.88)',
      headerTextColor: 'var(--color-gray-500)',
      oddRowBackgroundColor: 'rgba(var(--color-white-rgb), 0.02)',
      rowHoverColor: 'rgba(var(--color-purple-500-rgb), 0.10)',
      selectedRowBackgroundColor: 'rgba(var(--color-purple-500-rgb), 0.20)',
    },
    'dark',
  );

export const opticaColumnDefs = [
  { headerName: 'SKU', field: 'sku', maxWidth: 140 },
  { headerName: 'Categoría', field: 'categoria' },
  { headerName: 'Marca', field: 'marca' },
  { headerName: 'Modelo', field: 'modelo' },
  { headerName: 'Color/Detalle', field: 'detalle' },
  { headerName: 'Stock', field: 'stock', maxWidth: 120 },
  { headerName: 'Ubicación', field: 'ubicacion' },
];

export const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 120,
};

export const opticaRowData = [
  { sku: 'OPT-A001', categoria: 'armazones', marca: 'Ray-Ban', modelo: 'Wayfarer', detalle: 'Negro Mate', stock: 45, ubicacion: 'Vitrina 1' },
  { sku: 'OPT-A002', categoria: 'armazones', marca: 'Oakley', modelo: 'Clubmaster', detalle: 'Carey', stock: 32, ubicacion: 'Vitrina 2' },
  { sku: 'OPT-A003', categoria: 'armazones', marca: 'Vogue', modelo: 'Cat Eye', detalle: 'Rojo', stock: 28, ubicacion: 'Vitrina 3' },
  { sku: 'OPT-A004', categoria: 'armazones', marca: 'Carrera', modelo: 'Aviador', detalle: 'Dorado', stock: 15, ubicacion: 'Vitrina 1' },
  { sku: 'OPT-E001', categoria: 'equipos', marca: 'Topcon', modelo: 'Autorefractómetro', detalle: 'KR-800', stock: 2, ubicacion: 'Consultorio A' },
  { sku: 'OPT-E002', categoria: 'equipos', marca: 'Lensom', modelo: 'Lensómetro', detalle: 'Digital', stock: 3, ubicacion: 'Consultorio B' },
  { sku: 'OPT-S001', categoria: 'estuches', marca: 'Genérico', modelo: 'Rígido', detalle: 'Azul', stock: 150, ubicacion: 'Almacén B' },
  { sku: 'OPT-S002', categoria: 'estuches', marca: 'Premium', modelo: 'Piel Sintética', detalle: 'Café', stock: 80, ubicacion: 'Almacén B' },
];