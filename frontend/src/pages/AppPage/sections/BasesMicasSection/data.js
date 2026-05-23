const ALL_TEMPLATES = [
  { id: 'tpl-001', title: 'Base 1.74 | Alto Índice | Anti-reflejo',         sku: 'BM-1405-AI-AR',         date: '22/5/2026 10:00 a.m.' },
  { id: 'tpl-002', title: 'Mica Fotocromática | Trivex | Progresiva',       sku: 'BM-1209-TRV-PHO-PRO',   date: '21/5/2026 02:30 p.m.' },
  { id: 'tpl-003', title: 'Mica Anti-reflejo | CR-39 | UV400',              sku: 'BM-1410-CR39-AR-UV',    date: '20/5/2026 09:45 a.m.' },
  { id: 'tpl-004', title: 'Progresivo (Base + ADD) | 1.74 | Anti-lazos',    sku: '00-00-BA-17-PRO-ALA',   date: '19/5/2026 11:10 a.m.' },
  { id: 'tpl-005', title: 'Mica Policarbonato | Bifocal | UV',              sku: 'BM-1502-POL-BIF-UV',    date: '18/5/2026 03:20 p.m.' },
  { id: 'tpl-006', title: 'Base 1.67 | Alto Índice | Hidrofóbico',          sku: 'BM-1305-167-AI-HD',     date: '17/5/2026 08:50 a.m.' },
  { id: 'tpl-007', title: 'Mica Blue Light | CR-39 | Antifatiga',           sku: 'BM-1601-CR39-BL-AF',    date: '16/5/2026 04:15 p.m.' },
  { id: 'tpl-008', title: 'Mica Trivex | Monofocal | Anti-reflejo',         sku: 'BM-1110-TRV-MF-AR',     date: '15/5/2026 10:35 a.m.' },
  { id: 'tpl-009', title: 'Base 1.60 | Alto Índice | Blue Light',           sku: 'BM-1505-160-AI-BL',     date: '14/5/2026 01:55 p.m.' },
  { id: 'tpl-010', title: 'Mica Polarizada | CR-39 | UV400',                sku: 'BM-1820-CR39-POL-UV',   date: '13/5/2026 09:00 a.m.' },
  { id: 'tpl-011', title: 'Progresivo Premium | 1.74 | Anti-reflejo HD',    sku: 'BM-1909-174-PRO-HD',    date: '12/5/2026 11:25 a.m.' },
  { id: 'tpl-012', title: 'Mica Fotocromática | Policarbonato | UV',        sku: 'BM-1715-POL-PHO-UV',    date: '11/5/2026 02:40 p.m.' },
  { id: 'tpl-013', title: 'Mica Anti-reflejo | Trivex | Hidrofóbico',       sku: 'BM-1611-TRV-AR-HD',     date: '10/5/2026 03:50 p.m.' },
  { id: 'tpl-014', title: 'Base 1.50 | Estándar | Anti-reflejo',            sku: 'BM-1001-150-EST-AR',    date: '9/5/2026 08:15 a.m.' },
  { id: 'tpl-015', title: 'Mica Blue Light | Policarbonato | Antifatiga',   sku: 'BM-1718-POL-BL-AF',     date: '8/5/2026 10:20 a.m.' },
  { id: 'tpl-016', title: 'Mica Polarizada | Trivex | Anti-reflejo',        sku: 'BM-1821-TRV-POL-AR',    date: '7/5/2026 04:30 p.m.' },
  { id: 'tpl-017', title: 'Progresivo Estándar | 1.60 | UV400',             sku: 'BM-1906-160-PRO-UV',    date: '6/5/2026 11:00 a.m.' },
  { id: 'tpl-018', title: 'Mica Fotocromática | Bifocal | Anti-reflejo',    sku: 'BM-1310-BIF-PHO-AR',    date: '5/5/2026 01:45 p.m.' },
  { id: 'tpl-019', title: 'Mica CR-39 | Monofocal | Anti-rayado',           sku: 'BM-1015-CR39-MF-AS',    date: '4/5/2026 09:30 a.m.' },
  { id: 'tpl-020', title: 'Base 1.74 | Premium | Blue Light',               sku: 'BM-2010-174-PR-BL',     date: '3/5/2026 02:10 p.m.' },
];

const ultimasCreadas = ALL_TEMPLATES.slice(0, 6);

const ultimasAbiertas = [
  { id: 'abi-001', title: 'Progresivo Premium | 1.74 | Anti-reflejo HD',    sku: 'BM-1909-174-PRO-HD',    date: '22/5/2026 04:20 p.m.' },
  { id: 'abi-002', title: 'Mica Anti-reflejo | CR-39 | UV400',              sku: 'BM-1410-CR39-AR-UV',    date: '22/5/2026 11:30 a.m.' },
  { id: 'abi-003', title: 'Mica Blue Light | Policarbonato | Antifatiga',   sku: 'BM-1718-POL-BL-AF',     date: '21/5/2026 06:45 p.m.' },
  { id: 'abi-004', title: 'Mica Blue Light | CR-39 | Antifatiga',           sku: 'BM-1601-CR39-BL-AF',    date: '21/5/2026 09:15 a.m.' },
  { id: 'abi-005', title: 'Mica CR-39 | Monofocal | Anti-rayado',           sku: 'BM-1015-CR39-MF-AS',    date: '20/5/2026 05:00 p.m.' },
  { id: 'abi-006', title: 'Base 1.60 | Alto Índice | Blue Light',           sku: 'BM-1505-160-AI-BL',     date: '20/5/2026 12:25 p.m.' },
];

export const TEMPLATE_DATA = {
  todas:    ALL_TEMPLATES,
  creadas:  ultimasCreadas,
  abiertas: ultimasAbiertas,
};

export const TEMPLATE_TABS = [
  { key: 'todas',    label: 'Todas' },
  { key: 'creadas',  label: 'Últimas creadas' },
  { key: 'abiertas', label: 'Últimas abiertas' },
];

export const TEMPLATE_FORM_SECTIONS = [
  {
    title: 'Información de la plantilla',
    fields: [
      {
        id:          'proveedor',
        label:       'Proveedor',
        type:        'text',
        placeholder: 'Ej. Proveedor S.A.',
        required:    false,
      },
      {
        id:          'marca',
        label:       'Marca',
        type:        'text',
        placeholder: 'Ej. Marca S.A.',
        required:    false,
      },

      {
        id:          'precioVenta',
        label:       'Precio de venta',
        type:        'number',
        placeholder: '0.00',
        required:    true,
      },
      {
        id:          'precioCompra',
        label:       'Precio de compra',
        type:        'number',
        placeholder: '0.00',
        required:    true,
      },
      {
        id:          'Lote',
        label:       'Lote',
        type:        'text',
        placeholder: 'Ej. LOTE-001',
        required:    false,
      },
            {
        id:          'nombre',
        label:       'Nombre',
        type:        'text',
        placeholder: 'Ej. Base 1.74 Alto Índice Anti-reflejo',
        required:    true,
        size:        'full',
      },
    ],
  },
];

export const DELETED_TEMPLATE_DATA = [
  { id: 'del-001', title: 'Base CR-39 | Bifocal',          sku: 'BM-1100-CR39-BIF', date: '15/4/2026 08:20 a.m.' },
  { id: 'del-002', title: 'Mica Policarbonato | Blanca',   sku: 'BM-1300-POL-BLA',  date: '12/4/2026 05:15 p.m.' },
];

export const ROW_SELECTION            = { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true };
export const PAGINATION_SIZE_SELECTOR = [10, 20, 50];
export const PANEL_TRANSITION         = { duration: 0.28, ease: [0.22, 1, 0.36, 1] };