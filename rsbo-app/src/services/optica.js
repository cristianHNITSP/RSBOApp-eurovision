// src/services/optica.js
import api from "@/api/axios";

const BASE = "/optica";

const logErr = (tag, err) => {
  console.error(tag, {
    status:  err?.response?.status,
    data:    err?.response?.data,
    message: err?.message,
  });
};

// ═══════════════════════════════════════════════════════════════
//  Helpers genéricos por colección
// ═══════════════════════════════════════════════════════════════

function makeCollectionService(col) {
  const tag = `[OPTICA][${col.toUpperCase()}]`;

  return {
    /** Lista los items activos (no eliminados) */
    list(params = {}) {
      console.groupCollapsed(`${tag}[API] list`, params);
      return api
        .get(`${BASE}/${col}`, { params })
        .then((res) => { console.log(`${tag}[API] list →`, res?.data?.data?.length, "items"); console.groupEnd(); return res; })
        .catch((err) => { logErr(`${tag}[API] list ERROR`, err); console.groupEnd(); throw err; });
    },

    /** Lista items en papelera */
    listTrash() {
      console.groupCollapsed(`${tag}[API] listTrash`);
      return api
        .get(`${BASE}/${col}/trash`)
        .then((res) => { console.log(`${tag}[API] listTrash →`, res?.data?.data?.length, "items"); console.groupEnd(); return res; })
        .catch((err) => { logErr(`${tag}[API] listTrash ERROR`, err); console.groupEnd(); throw err; });
    },

    /** Obtiene un item por id */
    getOne(id) {
      return api.get(`${BASE}/${col}/${id}`).catch((err) => { logErr(`${tag}[API] getOne ERROR`, err); throw err; });
    },

    /** Crea un nuevo item */
    create(payload) {
      console.groupCollapsed(`${tag}[API] create`);
      console.log("payload", payload);
      return api
        .post(`${BASE}/${col}`, payload)
        .then((res) => { console.log(`${tag}[API] create OK →`, res?.data?.data?._id); console.groupEnd(); return res; })
        .catch((err) => { logErr(`${tag}[API] create ERROR`, err); console.groupEnd(); throw err; });
    },

    /** Actualiza un item por id */
    update(id, payload) {
      console.groupCollapsed(`${tag}[API] update ${id}`);
      return api
        .put(`${BASE}/${col}/${id}`, payload)
        .then((res) => { console.log(`${tag}[API] update OK`); console.groupEnd(); return res; })
        .catch((err) => { logErr(`${tag}[API] update ERROR`, err); console.groupEnd(); throw err; });
    },

    /** Actualiza solo el stock */
    updateStock(id, stock, actor = {}) {
      return api
        .patch(`${BASE}/${col}/${id}/stock`, { stock, actor })
        .catch((err) => { logErr(`${tag}[API] updateStock ERROR`, err); throw err; });
    },

    /** Soft-delete: mueve a papelera */
    softDelete(id, actor = {}) {
      console.log(`${tag}[API] softDelete ${id}`);
      return api
        .delete(`${BASE}/${col}/${id}`, { data: { actor } })
        .catch((err) => { logErr(`${tag}[API] softDelete ERROR`, err); throw err; });
    },

    /** Hard-delete: eliminación permanente */
    hardDelete(id, actor = {}) {
      console.log(`${tag}[API] hardDelete ${id}`);
      return api
        .delete(`${BASE}/${col}/${id}/hard`, { data: { actor } })
        .catch((err) => { logErr(`${tag}[API] hardDelete ERROR`, err); throw err; });
    },

    /** Restaura un item de la papelera */
    restore(id, actor = {}) {
      console.log(`${tag}[API] restore ${id}`);
      return api
        .patch(`${BASE}/${col}/${id}/restore`, { actor })
        .catch((err) => { logErr(`${tag}[API] restore ERROR`, err); throw err; });
    },
  };
}

// ═══════════════════════════════════════════════════════════════
//  Servicios específicos por colección
// ═══════════════════════════════════════════════════════════════

export const armazonesService   = makeCollectionService("armazones");
export const lentesService      = makeCollectionService("lentes");
export const solucionesService  = makeCollectionService("soluciones");
export const accesoriosService  = makeCollectionService("accesorios");
export const estuchesService    = makeCollectionService("estuches");
export const equiposService     = {
  ...makeCollectionService("equipos"),
  /** Actualiza solo el estado del equipo */
  updateEstado(id, estado, actor = {}) {
    return api
      .patch(`${BASE}/equipos/${id}/estado`, { estado, actor })
      .catch((err) => { logErr("[OPTICA][EQUIPOS][API] updateEstado ERROR", err); throw err; });
  },
};

// ═══════════════════════════════════════════════════════════════
//  Logs de auditoría
// ═══════════════════════════════════════════════════════════════

export const logsService = {
  /** Lista paginada de logs (recientes primero) */
  list(params = {}) {
    return api.get(`${BASE}/logs`, { params }).catch((err) => { logErr("[OPTICA][LOGS][API] list ERROR", err); throw err; });
  },

  /** Logs agrupados por DD/MM/YYYY */
  grouped(params = {}) {
    return api.get(`${BASE}/logs/grouped`, { params }).catch((err) => { logErr("[OPTICA][LOGS][API] grouped ERROR", err); throw err; });
  },

  /** Logs de una colección específica */
  byCollection(colName, params = {}) {
    return api.get(`${BASE}/logs/collection/${colName}`, { params }).catch((err) => { logErr("[OPTICA][LOGS][API] byCollection ERROR", err); throw err; });
  },
};
