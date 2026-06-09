/**
 * @fileoverview Datos de configuración para el Sidebar.
 * Define la estructura del menú y grupos.
 */

export const SIDEBAR_MENU = [
  { group: "Principal" },
  { label: "Dashboard", icon: "tachometer-alt", path: "/l/home" },
  { 
    label: "Analíticas", 
    icon: "chart-line", 
    path: "/l/analiticas", 
    badge: "Nuevo", 
    badgeType: "is-success" 
  },
  
  { group: "Gestión" },
  { label: "Usuarios", icon: "users", path: "/l/usuarios" },
  {
    label: "Inventario",
    icon: "box-open",
    children: [
      { label: "Bases y Micas", icon: "glasses", path: "/l/inventario/bases-micas" },
      { label: "Óptica", icon: "eye", path: "/l/inventario/optica" },
      { label: "Lentes de Contacto", icon: "circle", path: "/l/inventario/lentes-contacto" },
    ],
  },
  {
    label: "Ventas",
    icon: "shopping-cart",
    children: [
      { label: "Laboratorio", icon: "flask", path: "/l/ventas/laboratorio", needsBadge: 'lab' },
      { label: "Bases y Micas", icon: "glasses", path: "/l/ventas?tab=bases-micas" },
      { label: "Óptica", icon: "eye", path: "/l/ventas?tab=optica" },
      { label: "Lentes de Contacto", icon: "circle", path: "/l/ventas?tab=lentes-contacto" },
      { label: "Historial", icon: "history", path: "/l/ventas?tab=historial" },
      { label: "Mermas", icon: "trash-can", path: "/l/mermas" },
    ],
  },
  { label: "Devoluciones", icon: "rotate-left", path: "/l/devoluciones" },
  { 
    label: "Encargos", 
    icon: "clipboard-list", 
    path: "/l/encargos",
    roles: ["root", "eurovision", "supervisor", "ventas"]
  },
  
  { group: "Otros" },
  // { label: "Ajustes", icon: "cog", path: "/l/config.panel" }, // (oculto: Preferencias/Seguridad ya viven en el menú de usuario del footer)
  { label: "Ayuda", icon: "question-circle", path: "/l/ayuda?tab=inicio" },
];

export const SIDEBAR_CONFIG = {
  WIDTH_EXPANDED: '240px',
  WIDTH_COLLAPSED: '70px',
  DEFAULT_AVATAR: "https://github.com/octocat.png",
  SUBMENU_WIDTH: '260px'
};
