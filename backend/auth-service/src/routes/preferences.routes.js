const express = require("express");
const router = express.Router();
const UserWorkspacePreferences = require("../models/UserWorkspacePreferences");
const authMiddleware = require("../middlewares/auth.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");

/**
 * @route GET /api/workspace/preferences
 * @desc Get user workspace preferences (pinned and recent tabs)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const context = req.query.context || "inventory";
    let prefs = await UserWorkspacePreferences.findOne({ userId: req.user.id, context });
    
    if (!prefs) {
      // Create default if not exists
      prefs = await UserWorkspacePreferences.create({
        userId: req.user.id,
        context,
        pinned_templates: [],
        recent_templates: [],
        open_tabs: [],
        active_tab_id: "nueva",
        catalog_default_section: "search"
      });
    }
    
    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error("[preferences.routes] Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * @route PUT /api/workspace/preferences/pinned
 * @desc Update pinned templates
 */
router.put("/pinned", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { pinned_templates, context = "inventory" } = req.body;
    
    const prefs = await UserWorkspacePreferences.findOneAndUpdate(
      { userId: req.user.id, context },
      { $set: { pinned_templates } },
      { new: true, upsert: true }
    );
    
    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error("[preferences.routes] Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * @route PATCH /api/workspace/preferences/recent
 * @desc Add template to recent list
 */
router.patch("/recent", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { template, context = "inventory" } = req.body;
    if (!template?.id) return res.status(400).json({ ok: false, message: "Template ID required" });

    let prefs = await UserWorkspacePreferences.findOne({ userId: req.user.id, context });
    if (!prefs) {
      prefs = new UserWorkspacePreferences({ userId: req.user.id, context, recent_templates: [] });
    }

    // Update LRU logic
    const idx = prefs.recent_templates.findIndex(t => t.id === template.id);
    if (idx !== -1) prefs.recent_templates.splice(idx, 1);
    
    prefs.recent_templates.unshift({
      id: template.id,
      name: template.name,
      sku: template.sku,
      tipo_matriz: template.tipo_matriz,
      lastModified: new Date()
    });

    // Limit to 20
    if (prefs.recent_templates.length > 20) {
      prefs.recent_templates.pop();
    }

    await prefs.save();
    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error("[preferences.routes] Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * @route PATCH /api/workspace/preferences/active-tab
 * @desc Update active tab id
 */
router.patch("/active-tab", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { tabId, context = "inventory" } = req.body;
    if (!tabId) return res.status(400).json({ ok: false, message: "tabId is required" });

    const prefs = await UserWorkspacePreferences.findOneAndUpdate(
      { userId: req.user.id, context },
      { $set: { active_tab_id: tabId } },
      { new: true, upsert: true }
    );

    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error("[preferences.routes] Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * @route PATCH /api/workspace/preferences/catalog-section
 * @desc Update default catalog section
 */
router.patch("/catalog-section", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { section, context = "inventory" } = req.body;
    const allowed = new Set(["search", "recent_modified", "recent_opened"]);
    if (!allowed.has(section)) {
      return res.status(400).json({ ok: false, message: "Invalid section" });
    }

    const prefs = await UserWorkspacePreferences.findOneAndUpdate(
      { userId: req.user.id, context },
      { $set: { catalog_default_section: section } },
      { new: true, upsert: true }
    );

    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error("[preferences.routes] Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * @route DELETE /api/workspace/preferences/recent/:id
 * @desc Remove template from recent list
 */
router.delete("/recent/:id", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const templateId = req.params.id;
    const context = req.query.context || "inventory";
    if (!templateId) return res.status(400).json({ ok: false, message: "templateId is required" });

    const prefs = await UserWorkspacePreferences.findOneAndUpdate(
      { userId: req.user.id, context },
      { $pull: { recent_templates: { id: templateId } } },
      { new: true, upsert: true }
    );

    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error("[preferences.routes] Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * @route POST /api/workspace/preferences/open-tabs
 * @desc Upsert one open tab entry
 */
router.post("/open-tabs", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { tab, context = "inventory" } = req.body;
    if (!tab?.id) return res.status(400).json({ ok: false, message: "tab.id is required" });

    const prefs = await UserWorkspacePreferences.findOne({ userId: req.user.id, context });
    const target = prefs || new UserWorkspacePreferences({ userId: req.user.id, context, open_tabs: [] });

    const idx = target.open_tabs.findIndex((t) => t.id === tab.id);
    const next = {
      id: tab.id,
      name: tab.name,
      sku: tab.sku,
      tipo_matriz: tab.tipo_matriz,
      opened_at: tab.opened_at ? new Date(tab.opened_at) : new Date(),
      is_pinned: Boolean(tab.is_pinned),
      pinned_at: tab.pinned_at ? new Date(tab.pinned_at) : (tab.is_pinned ? new Date() : null)
    };

    if (idx !== -1) target.open_tabs[idx] = { ...target.open_tabs[idx], ...next };
    else target.open_tabs.push(next);

    await target.save();
    res.json({ ok: true, data: target });
  } catch (error) {
    console.error("[preferences.routes] Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * @route DELETE /api/workspace/preferences/open-tabs/:id
 * @desc Remove one open tab entry
 */
router.delete("/open-tabs/:id", authMiddleware, csrfProtection, async (req, res) => {
  try {
    const tabId = req.params.id;
    const context = req.query.context || "inventory";
    if (!tabId) return res.status(400).json({ ok: false, message: "tabId is required" });

    const prefs = await UserWorkspacePreferences.findOneAndUpdate(
      { userId: req.user.id, context },
      { $pull: { open_tabs: { id: tabId } } },
      { new: true, upsert: true }
    );

    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error("[preferences.routes] Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
