/**
 * Global filters and formatters for the frontend application.
 * These helpers are used to standardize data presentation across components.
 */

/**
 * Formats a numeric value as Mexican Pesos (MXN) currency.
 * @param {number} val - The numeric value to format.
 * @returns {string} The formatted currency string.
 */
export function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} value 
 * @returns {string}
 */
export function capitalize(value) {
  if (!value) return '';
  value = value.toString();
  return value.charAt(0).toUpperCase() + value.slice(1);
}
