export const ROLE_LABELS = {
  root:        'Root',
  eurovision:  'Eurovisión',
  supervisor:  'Supervisor',
  ventas:      'Ventas',
  laboratorio: 'Laboratorio',
}

export const ROLE_TAG_TYPES = {
  root:        'is-dark',
  eurovision:  'is-primary',
  supervisor:  'is-info',
  ventas:      'is-success',
  laboratorio: 'is-warning',
}

export function formatRoleLabel(name) {
  if (!name || name === 'sin-rol') return 'Sin rol'
  return ROLE_LABELS[String(name).toLowerCase()] ||
    (name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '))
}

export function roleTagType(roleName) {
  return ROLE_TAG_TYPES[String(roleName || '').toLowerCase()] || 'is-light'
}
