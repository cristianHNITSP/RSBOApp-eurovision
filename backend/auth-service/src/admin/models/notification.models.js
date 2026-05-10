const mongoose = require("mongoose");
const { Mixed, ObjectId } = mongoose.Schema.Types;

const registerNotificationModels = (conn) => {
  if (!conn) return null;

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

  return { Notification };
};

module.exports = { registerNotificationModels };
