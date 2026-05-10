const mongoose = require("mongoose");

const registerAuthModels = (conn) => {
  if (!conn) return null;

  // Si el modelo ya existe en la conexión (porque el servicio ya lo cargó), lo usamos
  if (conn.models.User && conn.models.Role) {
    return {
      User: conn.models.User,
      Role: conn.models.Role,
      UserWorkspacePreferences: conn.models.UserWorkspacePreferences
    };
  }

  // ─── Role ─────────────────────────────────────────────────────────────────
  const Role = conn.models.Role || conn.model("Role", new mongoose.Schema({
    name:        { type: String, required: true, unique: true },
    description: String,
    permissions: [String],
    isSystem:    { type: Boolean, default: false },
  }, { timestamps: true }));

  // ─── User ─────────────────────────────────────────────────────────────────
  const User = conn.models.User || conn.model("User", new mongoose.Schema({
    name:      { type: String, required: true },
    username:  { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    role:      { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    isActive:  { type: Boolean, default: true },
    lastLogin: Date,
    profile: {
      avatar: String,
      bio:    String,
      phone:  String,
    },
    tokens: [{
      token:     String,
      createdAt: Date,
      expiresAt: Date,
      deviceInfo: mongoose.Schema.Types.Mixed
    }],
    deletedAt: { type: Date, default: null },
  }, { timestamps: true }));

  // ─── UserWorkspacePreferences ─────────────────────────────────────────────
  const UserWorkspacePreferences = conn.models.UserWorkspacePreferences || conn.model("UserWorkspacePreferences", new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    theme:    { type: String, enum: ["light", "dark", "system"], default: "system" },
    fontSize: { type: String, default: "medium" },
    sidebarCollapsed: { type: Boolean, default: false },
  }, { timestamps: true }));

  return { User, Role, UserWorkspacePreferences };
};

module.exports = { registerAuthModels };
