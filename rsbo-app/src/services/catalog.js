// src/services/catalog.js
import api from '@/api/axios';

const BASE = '/catalog';

/**
 * Obtiene el catálogo completo: { bases: [...], treatments: [...] }
 * @returns {Promise<{ data: { ok: boolean, data: { bases: CatalogBase[], treatments: CatalogTreatment[] } } }>}
 */
export const fetchCatalog = () =>
  api.get(BASE);

/** Actualiza una base existente por su key (requiere rol admin) */
export const updateCatalogBase = (key, updates) =>
  api.put(`${BASE}/bases/${key}`, updates);

/** Actualiza un tratamiento existente por su key (requiere rol admin) */
export const updateCatalogTreatment = (key, updates) =>
  api.put(`${BASE}/treatments/${key}`, updates);

/** Crea una nueva base (requiere rol admin) */
export const createCatalogBase = (data) =>
  api.post(`${BASE}/bases`, data);

/** Crea un nuevo tratamiento (requiere rol admin) */
export const createCatalogTreatment = (data) =>
  api.post(`${BASE}/treatments`, data);

/** Desactiva una base (soft delete, requiere rol admin) */
export const deleteCatalogBase = (key) =>
  api.delete(`${BASE}/bases/${key}`);

/** Desactiva un tratamiento (soft delete, requiere rol admin) */
export const deleteCatalogTreatment = (key) =>
  api.delete(`${BASE}/treatments/${key}`);
