/**
 * Modelos de notification_db para AdminJS.
 * Usa una conexión separada — no interfiere con la conexión principal de auth-service.
 */

const mongoose = require("mongoose");

const MONGO_URI = process.env.NOTIFICATION_MONGO_URI;

if (!MONGO_URI) {
  console.warn("⚠️  NOTIFICATION_MONGO_URI no definido — modelos de notificaciones no disponibles en AdminJS");
  module.exports = {};
  return;
}

const conn = mongoose.createConnection(MONGO_URI);
conn.on("connected", () => console.log("✅ AdminJS conectado a notification_db"));
conn.on("error",     (e) => console.error("❌ AdminJS notification_db error:", e.message));

const { Mixed, ObjectId } = mongoose.Schema.Types;

const VALID_ROLES = ["root", "eurovision", "supervisor", "ventas", "laboratorio"];

const Notification = conn.model("Notification", new mongoose.Schema({
  title:         { type: String, required: true },
  message:       { type: String, required: true },
  type:          { type: String, enum: ["info", "warning", "danger", "success"], default: "info" },
  priority:      { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
  targetRoles:   [{ type: String, enum: VALID_ROLES }],
  isGlobal:      { type: Boolean, default: false },
  createdBy:     ObjectId,
  createdByName: String,
  readBy:        Mixed,
  pinnedBy:      [ObjectId],
  dismissedBy:   [ObjectId],
  expiresAt:     Date,
  groupKey:      String,
  count:         { type: Number, default: 1 },
}, { timestamps: true }));

module.exports = { Notification };
