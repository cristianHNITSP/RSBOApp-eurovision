// src/services/preferencesService.js
import api from "../api/axios";

/**
 * Get user workspace preferences (pinned and recent tabs)
 */
export const getPreferences = async (context = "inventory") => {
  try {
    const res = await api.get("/workspace/preferences", { 
      params: { context },
      withCredentials: true 
    });
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error getting preferences:", error);
    throw error;
  }
};

/**
 * Update pinned templates
 * @param {Array} pinnedTemplates 
 */
export const updatePinnedTemplates = async (pinnedTemplates, context = "inventory") => {
  try {
    const res = await api.put(
      "/workspace/preferences/pinned",
      { pinned_templates: pinnedTemplates, context },
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error updating pinned templates:", error);
    throw error;
  }
};

/**
 * Add template to recent list
 * @param {Object} template 
 */
export const addRecentTemplate = async (template, context = "inventory") => {
  try {
    const res = await api.patch(
      "/workspace/preferences/recent",
      { template, context },
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error adding recent template:", error);
    throw error;
  }
};

/**
 * Remove template from recent list
 * @param {string} id
 */
export const removeRecentTemplate = async (id, context = "inventory") => {
  try {
    const res = await api.delete(
      `/workspace/preferences/recent/${id}`,
      { params: { context }, withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error removing recent template:", error);
    throw error;
  }
};

/**
 * Update active tab id
 * @param {string} tabId
 */
export const setActiveTab = async (tabId, context = "inventory") => {
  try {
    const res = await api.patch(
      "/workspace/preferences/active-tab",
      { tabId, context },
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error updating active tab:", error);
    throw error;
  }
};

/**
 * Save (upsert) an open tab
 * @param {Object} tab
 */
export const saveOpenTab = async (tab, context = "inventory") => {
  try {
    const res = await api.post(
      "/workspace/preferences/open-tabs",
      { tab, context },
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error saving open tab:", error);
    throw error;
  }
};

/**
 * Remove an open tab
 * @param {string} tabId
 */
export const removeOpenTab = async (tabId, context = "inventory") => {
  try {
    const res = await api.delete(
      `/workspace/preferences/open-tabs/${tabId}`,
      { params: { context }, withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error removing open tab:", error);
    throw error;
  }
};

/**
 * Get catalog default section
 */
export const getCatalogSection = async (context = "inventory") => {
  try {
    const res = await api.get("/workspace/preferences", { 
      params: { context },
      withCredentials: true 
    });
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error getting catalog section:", error);
    throw error;
  }
};

/**
 * Set catalog default section
 * @param {string} section
 */
export const setCatalogSection = async (section, context = "inventory") => {
  try {
    const res = await api.patch(
      "/workspace/preferences/catalog-section",
      { section, context },
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error("[preferencesService] Error updating catalog section:", error);
    throw error;
  }
};
