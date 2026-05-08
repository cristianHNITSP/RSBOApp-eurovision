import { ICONS } from './icons.js';

// Explicación NO técnica de qué hace el sistema "por dentro".
// Dirigido a personal de óptica/laboratorio. Sin mencionar microservicios,
// bases de datos, sockets, tokens, etc. — solo el efecto observable.
export const BACKEND_BLOCKS = [
  {
    id: 'how_data',
    icon: ICONS.server,
    title: '¿Dónde se guarda mi información?',
    body: [
      'Toda la información del sistema (productos, ventas, usuarios, pedidos, devoluciones) vive en una sola memoria central protegida.',
      'No queda guardada en la computadora donde trabajas: si te cambias de equipo, todo lo que registraste sigue ahí cuando vuelvas a entrar.',
      'Solo se llega a esa memoria con tu usuario y contraseña, y solo puedes ver lo que tu rol permite.',
    ],
  },
  {
    id: 'how_alerts',
    icon: ICONS.bell,
    title: '¿Por qué a veces aparecen avisos solos?',
    body: [
      'El sistema revisa el stock por su cuenta cada hora durante el día y cada cuatro horas durante la noche.',
      'Si alguna pieza baja del mínimo, manda un aviso automático al encargado y al supervisor.',
      'También avisa de inmediato cuando alguien guarda un cambio importante: un pedido nuevo, una devolución registrada, una corrección pedida.',
    ],
  },
  {
    id: 'how_session',
    icon: ICONS.shield,
    title: '¿Por qué a veces tengo que iniciar sesión otra vez?',
    body: [
      'Mientras estás trabajando, tu sesión se renueva sola. No tienes que volver a entrar cada rato.',
      'Pero si dejas el sistema sin uso por mucho tiempo, o cierras la computadora, te pide entrar de nuevo. Es por seguridad.',
      'Si cambias tu contraseña, todas tus sesiones en otros dispositivos se cierran automáticamente.',
    ],
  },
  {
    id: 'how_roles',
    icon: ICONS.users,
    title: '¿Qué significa cada rol?',
    body: [
      'Vendedor / Ventas: registra pedidos, atiende clientes, hace cortes de caja.',
      'Técnico de laboratorio: atiende los pedidos de venta, escanea, surte y cierra.',
      'Encargado de óptica: administra inventario, devoluciones y encargos a proveedores.',
      'Supervisor: ve todo lo anterior y atiende correcciones del laboratorio.',
      'Administrador: además puede crear usuarios, cambiar roles y revisar las sesiones.',
    ],
  },
  {
    id: 'how_realtime',
    icon: ICONS.refresh,
    title: '¿Mis cambios se ven al instante en otra computadora?',
    body: [
      'Sí. Cuando guardas algo importante (un pedido, una venta, una devolución), el sistema avisa al instante a las demás computadoras conectadas.',
      'Por eso el laboratorio ve los pedidos nuevos sin tener que recargar la página.',
      'Si alguna vez no aparece algo, presiona el botón Recargar o Actualizar de la pantalla.',
    ],
  },
  {
    id: 'how_sale',
    icon: ICONS.cart,
    title: '¿Qué pasa cuando registro una venta?',
    body: [
      '1. El producto se descuenta automáticamente del inventario.',
      '2. La venta se guarda con el cliente y el total.',
      '3. Si era para taller, el laboratorio recibe el aviso al instante.',
      '4. Si el stock queda bajo el mínimo, se manda un aviso al encargado.',
      'Todo eso ocurre en segundos, sin que tengas que hacer nada extra.',
    ],
  },
  {
    id: 'how_offline',
    icon: ICONS.warning,
    title: '¿Y si no hay luz o no hay internet?',
    body: [
      'El sistema necesita conexión para funcionar. Si pierdes internet, no podrás guardar cambios.',
      'Recomendación: si la conexión es inestable, anota en papel los movimientos importantes y captúralos en cuanto regrese.',
      'Cuando vuelva la conexión, recarga la página: lo último que hayas guardado seguirá ahí.',
      'Si el problema persiste, contacta a soporte (ver pestaña Referencia).',
    ],
  },
];
