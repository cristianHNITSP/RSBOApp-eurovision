// src/services/usersService.js
import api, { sendRequest, normalizeApiError } from "../api/axios";

export const usersService = {
  async me() {
    try {
      const res = await sendRequest({ method: "GET", url: "/users/me" });
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async getRoles() {
    try {
      const res = await sendRequest({ method: "GET", url: "/users/roles" });
      return res.data;
    } catch (err) {
      return Promise.reject(normalizeApiError(err));
    }
  },

  async listUsers(params) {
    try {
      const res = await sendRequest({ method: "GET", url: "/users", params });
      return res.data;
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
      // ✅ DELETE sin body
      const res = await api.request({
        method: "DELETE",
        url: `/users/${id}`,
        data: undefined,
        // ✅ evita que algún interceptor/entorno meta JSON vacío
        headers: { "Content-Type": "text/plain" },
      });
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
