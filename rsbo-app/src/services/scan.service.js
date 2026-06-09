// src/services/scan.service.js
// Resuelve un QR interno (RSBO|...) a su hoja + dioptría, probando ambas familias.
import api from "@/api/axios";

const FAMILIES = ["/inventory", "/contactlenses"];

/**
 * Resuelve un código QR a `{ family, sheet, tipo, coords, key, eye, existencias, segment }`.
 * Prueba inventario y, si no existe (404), lentes de contacto.
 * @param {string} code  string QR escaneado/tecleado
 * @returns {Promise<object|null>}  payload normalizado o `null` si no se encuentra
 */
export async function resolveQr(code) {
  const qr = encodeURIComponent(String(code || "").trim());
  if (!qr) return null;

  for (const base of FAMILIES) {
    try {
      const { data } = await api.get(`${base}/resolve/${qr}`);
      if (data?.ok && data.data) return data.data;
    } catch (err) {
      // 400/404 → seguimos probando la otra familia; otros errores se propagan.
      const status = err?.response?.status;
      if (status !== 404 && status !== 400) throw err;
    }
  }
  return null;
}
