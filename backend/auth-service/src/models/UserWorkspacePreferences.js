const mongoose = require("mongoose");

const userWorkspacePreferencesSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      unique: true 
    },
    pinned_templates: [
      {
        id: String,
        name: String,
        sku: String,
        tipo_matriz: String,
        pinnedAt: { type: Date, default: Date.now }
      }
    ],
    open_tabs: [
      {
        id: String,
        name: String,
        sku: String,
        tipo_matriz: String,
        opened_at: { type: Date, default: Date.now },
        is_pinned: { type: Boolean, default: false },
        pinned_at: { type: Date, default: null }
      }
    ],
    recent_templates: [
      {
        id: String,
        name: String,
        sku: String,
        tipo_matriz: String,
        lastModified: { type: Date, default: Date.now }
      }
    ],
    active_tab_id: { type: String, default: "nueva" },
    catalog_default_section: {
      type: String,
      enum: ["search", "recent_modified", "recent_opened"],
      default: "search"
    }
  },
  { timestamps: true }
);

userWorkspacePreferencesSchema.index({ userId: 1 });

module.exports = mongoose.model("UserWorkspacePreferences", userWorkspacePreferencesSchema);
