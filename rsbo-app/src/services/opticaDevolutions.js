import api from "@/api/axios";

const BASE = "/optica/devolutions";

export async function createOpticaDevolution(payload) {
  const res = await api.post(`${BASE}`, payload);
  return res.data;
}

export async function listOpticaDevolutions(params = {}) {
  const res = await api.get(`${BASE}`, { params });
  return res.data;
}

export async function updateOpticaDevolutionStatus(idOrFolio, status, notes) {
  // El backend de Óptica debe soportar buscar por Folio si no es un ID válido
  const res = await api.patch(`${BASE}/status/${idOrFolio}`, { status, notes });
  return res.data;
}
