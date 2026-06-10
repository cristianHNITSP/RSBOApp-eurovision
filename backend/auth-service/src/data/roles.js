/**
 * @fileoverview Definición de roles y permisos del sistema.
 * Este archivo centraliza la configuración de RBAC (Role-Based Access Control).
 * Al agregar o modificar roles aquí, el sistema se actualizará automáticamente
 * durante el proceso de seeding.
 */

const ROLES = {
  ROOT: 'root',
  EUROVISION: 'eurovision',
  SUPERVISOR: 'supervisor',
  VENTAS: 'ventas',
  LABORATORIO: 'laboratorio'
};

const ROLES_DATA = [
  {
    name: ROLES.ROOT,
    description: 'Administrador del sistema con acceso total e irrestricto',
    permissions: [
      'manage_users',
      'manage_inventory',
      'manage_sales',
      'view_reports',
      'edit_settings',
      'manage_roles',
      'manage_system',
      'view_devolutions',
      'manage_devolutions',
      'export_reports',
      'view_audit_log'
    ],
  },
  {
    name: ROLES.EUROVISION,
    description: 'Encargado de la óptica Eurovisión — gestión completa del negocio',
    permissions: [
      'manage_users',
      'manage_inventory',
      'manage_sales',
      'view_reports',
      'edit_settings',
      'create_order',
      'update_order_status',
      'view_inventory',
      'view_clients',
      'view_devolutions',
      'manage_devolutions',
      'export_reports',
      'view_audit_log'
    ],
  },
  {
    name: ROLES.SUPERVISOR,
    description: 'Supervisor de operaciones — supervisa inventario, ventas y equipo',
    permissions: [
      'manage_inventory',
      'manage_sales',
      'view_reports',
      'create_order',
      'update_order_status',
      'view_inventory',
      'view_clients',
      'view_devolutions',
      'manage_devolutions',
      'export_reports'
    ],
  },
  {
    name: ROLES.VENTAS,
    description: 'Personal de ventas y atención al cliente',
    permissions: [
      'create_order',
      'update_order_status',
      'view_inventory',
      'view_clients',
      'manage_sales',
      'create_devolution'
    ],
  },
  {
    name: ROLES.LABORATORIO,
    description: 'Técnico de laboratorio — taller de pulido y montaje de lentes',
    permissions: [
      'view_orders',
      'update_order_progress',
      'mark_order_completed',
      'view_devolutions'
    ],
  },
];

const VALID_ROLES = Object.values(ROLES);

// Whitelist de permisos = unión de todos los definidos en ROLES_DATA.
// Restringe Role.permissions para que AdminJS/scripts no introduzcan inválidos.
const VALID_PERMISSIONS = Array.from(
  new Set(ROLES_DATA.flatMap((r) => r.permissions))
);

module.exports = {
  ROLES,
  ROLES_DATA,
  VALID_ROLES,
  VALID_PERMISSIONS
};
