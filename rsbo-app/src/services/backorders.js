/**
 * Wrappers axios para endpoints de Back Orders
 * Define los endpoints para las 3 subcategorías
 */

import { apiClient } from "../api/axios";

const BASE = "/backorders";

/**
 * Endpoints de Bases y Micas
 */
export const basesmicasService = {
  list: (filters = {}) => apiClient.get(`${BASE}/bases-micas`, { params: filters }),
  get: (id) => apiClient.get(`${BASE}/bases-micas/${id}`),
  create: (data) => apiClient.post(`${BASE}/bases-micas`, data),
  update: (id, data) => apiClient.patch(`${BASE}/bases-micas/${id}`, data),
  changeStatus: (id, status, opts) => apiClient.patch(`${BASE}/bases-micas/${id}/status`, { status, ...opts }),
  addPayment: (id, payment) => apiClient.post(`${BASE}/bases-micas/${id}/payments`, payment),
};

/**
 * Endpoints de Lentes de Contacto
 */
export const lentesService = {
  list: (filters = {}) => apiClient.get(`${BASE}/lentes`, { params: filters }),
  get: (id) => apiClient.get(`${BASE}/lentes/${id}`),
  create: (data) => apiClient.post(`${BASE}/lentes`, data),
  update: (id, data) => apiClient.patch(`${BASE}/lentes/${id}`, data),
  changeStatus: (id, status, opts) => apiClient.patch(`${BASE}/lentes/${id}/status`, { status, ...opts }),
  addPayment: (id, payment) => apiClient.post(`${BASE}/lentes/${id}/payments`, payment),
};

/**
 * Endpoints de Óptica
 */
export const opticaService = {
  list: (filters = {}) => apiClient.get(`${BASE}/optica`, { params: filters }),
  get: (id) => apiClient.get(`${BASE}/optica/${id}`),
  create: (data) => apiClient.post(`${BASE}/optica`, data),
  update: (id, data) => apiClient.patch(`${BASE}/optica/${id}`, data),
  changeStatus: (id, status, opts) => apiClient.patch(`${BASE}/optica/${id}/status`, { status, ...opts }),
  addPayment: (id, payment) => apiClient.post(`${BASE}/optica/${id}/payments`, payment),
};

/**
 * Endpoints cross-catálogo
 */
export const backordersService = {
  listAll: (filters = {}) => apiClient.get(`${BASE}`, { params: filters }),
  getStats: () => apiClient.get(`${BASE}/stats`),
};
