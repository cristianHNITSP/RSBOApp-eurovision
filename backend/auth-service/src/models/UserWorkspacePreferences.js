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
      required: true,
      maxlength: 40,
      match: /^[a-z0-9_-]+$/i
    },
    pinned_templates: [
      {
        id: { type: String, maxlength: 200 },
        name: { type: String, maxlength: 200 },
        sku: { type: String, maxlength: 200 },
        tipo_matriz: { type: String, maxlength: 60 },
        pinnedAt: { type: Date, default: Date.now }
      }
    ],
    open_tabs: [
      {
        id: { type: String, maxlength: 200 },
        name: { type: String, maxlength: 200 },
        sku: { type: String, maxlength: 200 },
        tipo_matriz: { type: String, maxlength: 60 },
        opened_at: { type: Date, default: Date.now },
        is_pinned: { type: Boolean, default: false },
        pinned_at: { type: Date, default: null }
      }
    ],
    recent_templates: [
      {
        id: { type: String, maxlength: 200 },
        name: { type: String, maxlength: 200 },
        sku: { type: String, maxlength: 200 },
        tipo_matriz: { type: String, maxlength: 60 },
        lastModified: { type: Date, default: Date.now }
      }
    ],
    active_tab_id: { type: String, default: "nueva", maxlength: 200 },
    catalog_default_section: {
      type: String,
      enum: ["search", "recent_modified", "recent_opened"],
      default: "search"
    },
    // Estado de vista libre por contexto (ej. óptica: page/filtro/búsqueda por categoría).
    // Forma libre para no acoplar cada sección al schema.
    view_state: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: (v) => {
          if (v == null) return true;
          if (typeof v !== "object") return false;
          // Rechaza tamaños abusivos (DoS de almacenamiento)
          return Buffer.byteLength(JSON.stringify(v), "utf8") <= 64 * 1024;
        },
        message: "view_state inválido o excede 64KB"
      }
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
