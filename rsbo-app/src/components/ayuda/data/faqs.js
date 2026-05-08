import { ICONS } from './icons.js';

export const FAQ_SECTIONS = [
  {
    id: 'inv',
    title: 'Inventario',
    icon: ICONS.inventory,
    items: [
      {
        id: 'inv1',
        openByDefault: true,
        q: '¿Si edito una celda se guarda solo?',
        a: [
          'No. Después de editar las celdas que necesites, debes presionar el botón Guardar cambios.',
          'Si cierras la pestaña o recargas sin guardar, todo vuelve a como estaba.',
        ],
        tags: ['guardar', 'inventario', 'celda'],
      },
      {
        id: 'inv2',
        q: '¿Qué significa Vista Negativa y Vista Positiva?',
        a: [
          'Son dos grupos de graduaciones dentro de la misma planilla. Cambiar entre ellas solo mueve lo que estás viendo, no borra ni crea datos.',
          'Úsalas para ubicarte mejor en el inventario sin necesitar dos planillas separadas.',
        ],
        tags: ['negativa', 'positiva', 'vista'],
      },
      {
        id: 'inv3',
        q: '¿Para qué sirve Generar plantilla?',
        a: [
          'Si una planilla está vacía, este botón crea las filas y columnas con la estructura correcta para ese tipo de producto.',
          'Solo úsalo en planillas nuevas o completamente vacías. Después recarga y captura las existencias reales.',
        ],
        tags: ['plantilla', 'generar', 'nueva'],
      },
      {
        id: 'inv4',
        q: '¿Cómo exporto el inventario a Excel?',
        a: [
          'Abre la planilla que quieres exportar y presiona el botón Exportar.',
          'Se descargará un archivo que puedes abrir en Excel, LibreOffice o Google Sheets.',
        ],
        tags: ['exportar', 'excel'],
      },
    ],
  },
  {
    id: 'ventas',
    title: 'Ventas y pedidos',
    icon: ICONS.cart,
    items: [
      {
        id: 'v1',
        q: '¿Cómo sé si el laboratorio recibió mi pedido?',
        a: [
          'Al crear el pedido, el laboratorio recibe un aviso automático en el sistema.',
          'En la pestaña Historial de ventas puedes ver el estado de cada pedido (Pendiente, En proceso, Surtido completo).',
        ],
        tags: ['pedido', 'laboratorio', 'estado'],
      },
      {
        id: 'v2',
        q: '¿Puedo cancelar un pedido después de enviarlo?',
        a: [
          'Los pedidos enviados al laboratorio los atiende directamente el personal de laboratorio.',
          'Si necesitas cancelar uno, comunícate con el laboratorio o con un supervisor para que lo procesen.',
        ],
        tags: ['cancelar', 'pedido'],
      },
      {
        id: 'v3',
        q: '¿Por qué no puedo agregar un producto al carrito?',
        a: [
          'Solo se pueden agregar productos que tengan existencias disponibles en el inventario.',
          'Si el producto aparece con 0 en stock, no estará disponible hasta que se reabastezca.',
        ],
        tags: ['carrito', 'stock', 'sin existencias'],
      },
    ],
  },
  {
    id: 'lab',
    title: 'Laboratorio',
    icon: ICONS.lab,
    items: [
      {
        id: 'l1',
        q: '¿Cómo sé qué pedidos atender primero?',
        a: [
          'Los pedidos se muestran ordenados por fecha de creación. Los más antiguos aparecen primero.',
          'También puedes usar los filtros por estado (Pendiente, En proceso) para ver solo los que faltan.',
        ],
        tags: ['pedido', 'orden', 'prioridad'],
      },
      {
        id: 'l2',
        q: '¿Qué pasa si escaneo mal un código?',
        a: [
          'Si el código no existe o no corresponde al pedido, el sistema te mostrará un aviso y no realizará ningún descuento.',
          'Verifica el código en el inventario antes de volver a intentarlo.',
        ],
        tags: ['escanear', 'código', 'error'],
      },
      {
        id: 'l3',
        q: '¿Cuándo debo usar Solicitar corrección?',
        a: [
          'Cuando hay un problema con un pedido que necesita revisión del supervisor: producto dañado, datos incorrectos, etc.',
          'El supervisor recibirá un aviso específico. No uses esta opción para cancelar pedidos.',
        ],
        tags: ['corrección', 'supervisor'],
      },
    ],
  },
  {
    id: 'nomen',
    title: 'Nomenclaturas y códigos',
    icon: ICONS.tags,
    items: [
      {
        id: 'nm1',
        q: '¿Cómo leo un SKU de planilla?',
        a: [
          'El SKU se divide en segmentos separados por guiones. De izquierda a derecha: proveedor, marca, tipo de matriz, material, base, tratamiento y un código aleatorio.',
          'Por ejemplo: JAP-TAI-BAS-POL-MON-BLN-A5F2 significa proveedor JAP, marca TAI, tipo BASE, material Policarbonato, base MON, tratamiento Blanco.',
        ],
        tags: ['sku', 'código', 'planilla', 'leer'],
      },
      {
        id: 'nm2',
        q: '¿Qué significan LAB y DEV en los folios?',
        a: [
          'LAB es el prefijo de los pedidos de laboratorio (ej: LAB-20250328-A5F2). Después viene la fecha y un código aleatorio.',
          'DEV es el prefijo de las devoluciones (ej: DEV-2025-00001). Después viene el año y un número consecutivo.',
        ],
        tags: ['folio', 'LAB', 'DEV', 'pedido', 'devolución'],
      },
      {
        id: 'nm3',
        q: '¿Qué significa SPH, CYL, ADD en los productos?',
        a: [
          'SPH (esfera) es el poder óptico principal del lente. CYL (cilindro) corrige el astigmatismo. ADD (adición) es la potencia extra para lectura en bifocales/progresivos.',
          'Estos valores se muestran con signo (+/-) y dos decimales. Por ejemplo: SPH -2.50 · CYL -1.00 · ADD +2.00.',
        ],
        tags: ['SPH', 'CYL', 'ADD', 'coordenadas', 'óptica'],
      },
      {
        id: 'nm4',
        q: '¿Qué significan las claves de tratamiento como BCO, AR, FOTO?',
        a: [
          'BCO = Blanco (sin tratamiento), AR = Antirreflejante, FOTO = Fotocromático (se oscurece con el sol), ANTIBLE = Anti luz azul, POLAR = Polarizado.',
          'Algunos tratamientos tienen variantes de color (Transitions: Gris, Café, Verde) o restricciones de material (CRISTAL_FOTO solo aplica a cristal).',
        ],
        tags: ['tratamiento', 'BCO', 'AR', 'FOTO', 'POLAR'],
      },
      {
        id: 'nm5',
        q: '¿Qué es OD y OI?',
        a: [
          'OD significa Ojo Derecho ("Oculus Dexter") y OI significa Ojo Izquierdo ("Oculus Sinister").',
          'Se usan en bifocales y progresivos donde cada ojo puede tener prescripción diferente. Las planillas monofocales tipo BASE y SPH_CYL no distinguen ojo.',
        ],
        tags: ['OD', 'OI', 'ojo', 'bifocal', 'progresivo'],
      },
    ],
  },
  {
    id: 'notif',
    title: 'Avisos del sistema',
    icon: ICONS.bell,
    items: [
      {
        id: 'n1',
        q: '¿Por qué no me llegan avisos?',
        a: [
          'Los avisos se envían a los roles que corresponden: pedidos de laboratorio van a laboratorio, supervisor y ventas; correcciones solo van al supervisor.',
          'Si tienes el rol correcto y no ves avisos, recarga la página para reconectar.',
        ],
        tags: ['notificación', 'rol', 'no llega'],
      },
      {
        id: 'n2',
        q: '¿Por qué solo hay un aviso aunque haya muchos pedidos?',
        a: [
          'El sistema agrupa pedidos del mismo tipo en un solo aviso con el conteo total.',
          'Por ejemplo: "5 pedidos pendientes de atención" en lugar de 5 avisos separados. Así es más fácil de leer.',
        ],
        tags: ['agrupar', 'pedidos', 'conteo'],
      },
    ],
  },
  {
    id: 'seg',
    title: 'Seguridad y cuenta',
    icon: ICONS.shield,
    items: [
      {
        id: 's1',
        q: '¿Por qué me cerró sesión solo?',
        a: [
          'Tu sesión se renueva automáticamente mientras trabajas. Si dejas el sistema sin uso por mucho tiempo, te pide entrar de nuevo por seguridad.',
          'También puede cerrarse si un administrador revocó tu acceso, o si tú mismo cambiaste tu contraseña.',
        ],
        tags: ['sesión', 'cerrar', 'expirar'],
      },
      {
        id: 's2',
        q: '¿Cómo cierro mi sesión en otro dispositivo?',
        a: [
          'Ve a Configuración → Seguridad → Sesiones activas.',
          'Verás todos los dispositivos donde tienes sesión abierta. Toca el botón de cerrar en el que quieras revocar.',
        ],
        tags: ['sesión', 'dispositivo', 'cerrar remoto'],
      },
      {
        id: 's3',
        q: '¿Qué pasa si cambio mi contraseña?',
        a: [
          'Al cambiar la contraseña, todas tus sesiones en todos los dispositivos se cierran automáticamente.',
          'Tendrás que iniciar sesión de nuevo con tu nueva contraseña.',
        ],
        tags: ['contraseña', 'sesión', 'seguridad'],
      },
    ],
  },
  {
    id: 'users',
    title: 'Usuarios',
    icon: ICONS.users,
    items: [
      {
        id: 'u1',
        q: '¿Cómo creo un usuario nuevo?',
        a: ['Ve a Gestión → Usuarios.', 'Pulsa Nuevo usuario, completa nombre, correo, rol y contraseña.', 'Presiona Crear y el usuario ya puede entrar.'],
        tags: ['usuario', 'crear'],
      },
      {
        id: 'u2',
        q: '¿Qué es la Papelera de usuarios?',
        a: [
          'Enviar un usuario a Papelera lo desactiva sin borrarlo definitivamente.',
          'Puedes restaurarlo en cualquier momento filtrando por Papelera en la lista de usuarios.',
        ],
        tags: ['papelera', 'restaurar', 'usuario'],
      },
      {
        id: 'u3',
        q: '¿Cómo defino qué puede ver cada persona?',
        a: [
          'Cuando creas o editas un usuario, asignas un Rol (por ejemplo: ventas, laboratorio, supervisor).',
          'Cada rol tiene acceso a secciones específicas. Si alguien no puede ver algo, revisa su rol.',
        ],
        tags: ['rol', 'permisos', 'acceso'],
      },
    ],
  },
];
