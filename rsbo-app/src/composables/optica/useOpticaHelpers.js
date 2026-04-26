/**
 * useOpticaHelpers.js
 * Funciones puras de formateo y mapeo para el módulo de Óptica.
 */

/**
 * Formatea un número como moneda MXN.
 */
export const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  });

/**
 * Formatea una fecha a DD/MM/AAAA.
 */
export const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt)
    ? String(d).split("T")[0]
    : dt.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

/**
 * Retorna la clase de color para un estado.
 */
export const estadoTag = (e) =>
  ({
    Disponible: "is-success",
    "Bajo stock": "is-warning",
    Agotado: "is-danger",
    Operativo: "is-success",
    Mantenimiento: "is-warning",
    "Fuera de servicio": "is-danger",
    Baja: "is-dark",
  }[e] || "is-info");

/**
 * Retorna la clase de color para un tipo de solución.
 */
export const tipoSolTag = (t) =>
  ({
    "Solucion multiusos": "is-primary",
    "Solucion salina": "is-info",
    "Gotas lubricantes": "is-success",
    "Solucion peroxido": "is-warning",
  }[t] || "is-light");

/**
 * Retorna clase de texto si la fecha de caducidad está próxima o vencida.
 */
export const caducidadClass = (f) => {
  if (!f) return "";
  const df = (new Date(f) - new Date()) / 86400000;
  return df <= 0 ? "has-text-danger" : df <= 180 ? "has-text-warning" : "";
};

/**
 * Determina el estado de un armazón basado en su stock o estado manual.
 */
export const armazonEstado = (r) => {
  if (r.estado) return r.estado;
  if (!r.stock) return "Agotado";
  if (r.stock <= 3) return "Bajo stock";
  return "Disponible";
};

/**
 * Retorna el label amigable para una sección técnica.
 */
export const labelFor = (s) =>
  ({
    armazones: "Armazones",
    soluciones: "Soluciones y Gotas",
    accesorios: "Accesorios",
    estuches: "Estuches",
    equipos: "Equipos",
  }[s] || s);

/**
 * Retorna la clase de fila si el elemento está en papelera.
 */
export const rowClass = (row) => (row.isDeleted ? "row--deleted" : "");
