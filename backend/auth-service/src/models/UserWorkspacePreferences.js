const mongoose = require("mongoose");

const userWorkspacePreferencesSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true
    },
    context: {
      type: String,
      default: "inventory",
      required: true
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

userWorkspacePreferencesSchema.index({ userId: 1, context: 1 }, { unique: true });

const UserWorkspacePreferences = mongoose.model("UserWorkspacePreferences", userWorkspacePreferencesSchema);

// Intentar borrar el índice único antiguo que causaría conflictos con la nueva estructura multicerebro
UserWorkspacePreferences.on('index', async (err) => {
  if (err) {
    console.error('❌ Error en índices de UserWorkspacePreferences:', err);
  }
  try {
    // Intentamos borrar el índice viejo si existe. 
    // Mongoose a veces no lo borra solo al cambiar el schema.
    await UserWorkspacePreferences.collection.dropIndex("userId_1");
    console.log("✅ Índice antiguo 'userId_1' eliminado correctamente.");
  } catch (e) {
    // Si el índice no existe o ya fue borrado, ignoramos el error.
  }
});

module.exports = UserWorkspacePreferences;
