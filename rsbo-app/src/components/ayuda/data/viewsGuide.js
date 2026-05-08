import { ICONS } from './icons.js';

// Una entrada por cada pantalla del sistema. Texto en español plano,
// dirigido a personal de óptica y laboratorio (sin tecnicismos).
export const VIEWS_GUIDE = [
  {
    area: 'Acceso',
    items: [
      {
        id: 'view_landing',
        name: 'Pantalla de inicio de sesión',
        icon: ICONS.key,
        purpose: 'Aquí entras al sistema con tu usuario y contraseña.',
        actions: [
          'Escribir tu usuario',
          'Escribir tu contraseña',
          'Marcar "recordar usuario" si quieres que te lo guarde',
        ],
      },
    ],
  },
  {
    area: 'Tablero',
    items: [
      {
        id: 'view_dashboard',
        name: 'Tablero principal',
        icon: ICONS.home,
        purpose:
          'Tu pantalla de bienvenida. De un vistazo ves el resumen del día: ventas, stock que se está acabando y pedidos por atender.',
        actions: [
          'Ver el resumen de ventas del día',
          'Ver qué productos están en stock crítico',
          'Abrir cualquier área desde los accesos rápidos',
          'Buscar movimientos recientes',
        ],
      },
      {
        id: 'view_analiticas',
        name: 'Analíticas',
        icon: ICONS.list,
        purpose:
          'Reportes y gráficas para entender cómo va el negocio: tendencias de ventas, rotación del inventario, devoluciones y desempeño.',
        actions: ['Filtrar por período (día, semana, mes)', 'Comparar entre tiendas', 'Exportar la gráfica'],
      },
    ],
  },
  {
    area: 'Inventario',
    items: [
      {
        id: 'view_bases',
        name: 'Bases y Micas',
        icon: ICONS.inventory,
        purpose:
          'Tu inventario de bases monofocales, bifocales, progresivas y tóricas. Aquí ajustas cuántas piezas tienes de cada graduación.',
        actions: [
          'Buscar por código de planilla',
          'Editar cantidad en cada celda',
          'Cambiar entre Vista Negativa y Positiva',
          'Exportar a Excel',
          'Crear una planilla nueva',
        ],
      },
      {
        id: 'view_lentes',
        name: 'Lentes de Contacto',
        icon: ICONS.eye,
        purpose: 'El stock de lentes de contacto, organizado por marca y graduación (incluye tóricos con eje).',
        actions: ['Buscar por marca o potencia', 'Filtrar por eje en lentes tóricas', 'Actualizar el stock'],
      },
      {
        id: 'view_optica',
        name: 'Óptica',
        icon: ICONS.glasses,
        purpose:
          'Inventario de armazones, soluciones, accesorios, estuches y equipos. Todo lo que no son lentes oftálmicos.',
        actions: ['Registrar artículos nuevos', 'Editar cantidades', 'Buscar por colección o SKU'],
      },
    ],
  },
  {
    area: 'Ventas y Laboratorio',
    items: [
      {
        id: 'view_ventas',
        name: 'Ventas',
        icon: ICONS.cart,
        purpose:
          'Tu caja registradora. Buscas productos del catálogo, los agregas al carrito, capturas datos del cliente y cobras.',
        actions: [
          'Buscar productos',
          'Agregar al carrito y ajustar cantidad',
          'Capturar nombre del cliente',
          'Enviar el pedido al laboratorio',
          'Hacer corte de caja al cierre del día',
        ],
      },
      {
        id: 'view_lab',
        name: 'Laboratorio',
        icon: ICONS.lab,
        purpose:
          'El centro de trabajo del taller. Aquí ves los pedidos por producir, escaneas códigos de barras, despachas y registras correcciones.',
        actions: [
          'Ver pedidos pendientes',
          'Escanear código de barras del producto',
          'Cerrar pedido cuando esté surtido',
          'Solicitar corrección al supervisor',
          'Consultar el catálogo y la bandeja de eventos',
        ],
      },
    ],
  },
  {
    area: 'Logística',
    items: [
      {
        id: 'view_devoluciones',
        name: 'Devoluciones',
        icon: ICONS.restore,
        purpose:
          'Cuando un cliente regresa un producto, lo registras aquí, anotas el motivo y das seguimiento hasta cerrarlo.',
        actions: [
          'Crear una devolución nueva',
          'Indicar motivo y condición del artículo',
          'Cambiar estado (pendiente → en revisión → aprobada/rechazada)',
          'Buscar por folio',
        ],
      },
      {
        id: 'view_mermas',
        name: 'Mermas',
        icon: ICONS.warning,
        purpose:
          'Registras piezas rotas, perdidas o defectuosas, indicando de dónde viene la pérdida (taller, venta, devolución, inventario).',
        actions: ['Registrar una merma', 'Filtrar por origen y fecha', 'Ver totales y estadísticas por categoría'],
      },
      {
        id: 'view_backorders',
        name: 'Encargos pendientes',
        icon: ICONS.clock,
        purpose:
          'Lo que está encargado al proveedor y aún no llega: armazones, lentes de contacto y bases/micas para taller.',
        actions: [
          'Crear un encargo especial',
          'Actualizar estado (pendiente → confirmado → recibido)',
          'Filtrar por categoría',
        ],
      },
    ],
  },
  {
    area: 'Cuenta y Gestión',
    items: [
      {
        id: 'view_config',
        name: 'Configuración',
        icon: ICONS.config,
        purpose:
          'Tu cuenta: cambiar tu contraseña, foto de perfil, tema claro/oscuro, opciones de accesibilidad y cerrar sesiones en otros dispositivos.',
        actions: [
          'Editar nombre, teléfono y avatar',
          'Cambiar contraseña',
          'Activar modo oscuro o tamaño de letra grande',
          'Cerrar una sesión abierta en otro lugar',
        ],
      },
      {
        id: 'view_usuarios',
        name: 'Usuarios (Gestión)',
        icon: ICONS.users,
        purpose:
          'Solo para encargados y administradores: dar de alta empleados, cambiarles permisos y desactivarlos cuando dejan de trabajar.',
        actions: [
          'Crear un usuario nuevo',
          'Asignar rol (vendedor, laboratorio, supervisor, admin)',
          'Restablecer contraseña',
          'Enviar a Papelera y restaurar',
        ],
      },
      {
        id: 'view_ventas_admin',
        name: 'Ventas (Gestión)',
        icon: ICONS.history,
        purpose: 'Vista administrativa de todas las ventas históricas, con detalle de cada transacción.',
        actions: ['Buscar venta', 'Filtrar por rango de fechas', 'Ver detalle de la transacción'],
      },
    ],
  },
  {
    area: 'Notificaciones y Ayuda',
    items: [
      {
        id: 'view_notif',
        name: 'Notificaciones',
        icon: ICONS.bell,
        purpose: 'El historial completo de avisos del sistema: pedidos, alertas de stock, correcciones, etc.',
        actions: ['Marcar como leída', 'Fijar las importantes', 'Descartar las que ya no necesitas'],
      },
      {
        id: 'view_ayuda',
        name: 'Ayuda',
        icon: ICONS.help,
        purpose: 'Esta guía. Tu manual de uso paso a paso, con búsqueda y atajos.',
        actions: ['Buscar un tema', 'Saltar a la sección con un clic'],
      },
    ],
  },
];
