import api from "../api/axios";

const normalizeApiError = (err) => {
  if (err && err.response && err.response.data) return err.response.data;
  if (err && err.request) return { error: "No se pudo conectar al servidor" };
  return { error: (err && err.message) || "Error desconocido" };
};

export const usersService = {
  async me() {
    try {
      const res = await api.get("/users/me");
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async getRoles() {
    try {
      const res = await api.get("/users/roles");
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async listUsers(params) {
    try {
      const res = await api.get("/users", { params });
      return res.data; // { items,total,stats,permissionsCatalog? }
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async createUser(payload) {
    try {
      const res = await api.post("/users", payload);
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async updateUser(id, payload) {
    try {
      const res = await api.put(`/users/${id}`, payload);
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async updatePassword(id, password) {
    try {
      const res = await api.put(`/users/${id}/password`, { password });
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async softDelete(id) {
    try {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async restore(id) {
    try {
      const res = await api.put(`/users/${id}/restore`, {});
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },
};
