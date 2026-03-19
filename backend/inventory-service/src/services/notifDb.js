"use strict";

const mongoose = require("mongoose");

function getNotifUri() {
  return (process.env.MONGO_URI || "").replace(/\/inventory_db(\?|$)/, "/notification_db$1");
}

let _conn = null;
let _Notification = null;

async function getNotifModel() {
  if (_Notification) return _Notification;

  _conn = mongoose.createConnection(getNotifUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await _conn.asPromise();

  const readEntry = new mongoose.Schema(
    { userId: mongoose.Schema.Types.ObjectId, readAt: { type: Date, default: Date.now } },
    { _id: false }
  );

  const schema = new mongoose.Schema(
    {
      title:         { type: String, required: true, trim: true, maxlength: 200 },
      message:       { type: String, required: true, trim: true, maxlength: 2000 },
      type:          { type: String, enum: ["info", "warning", "danger", "success"], default: "info" },
      priority:      { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
      targetRoles:   { type: [String], default: [] },
      isGlobal:      { type: Boolean, default: false },
      createdBy:     { type: mongoose.Schema.Types.ObjectId, required: true },
      createdByName: { type: String, default: "" },
      readBy:        { type: [readEntry], default: [] },
      pinnedBy:      { type: [mongoose.Schema.Types.ObjectId], default: [] },
      dismissedBy:   { type: [mongoose.Schema.Types.ObjectId], default: [] },
      expiresAt:     { type: Date, default: null },
      groupKey:      { type: String, default: null },
      date:          { type: String, default: null },
      count:         { type: Number, default: 1, min: 1 },
      metadata:      { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { timestamps: true }
  );

  schema.index({ groupKey: 1, date: 1 });
  schema.index({ createdAt: -1 });
  schema.index({ targetRoles: 1 });
  schema.index({ isGlobal: 1 });

  _Notification = _conn.model("Notification", schema);
  console.log("[NOTIF_DB] Conectado a notification_db");
  return _Notification;
}

module.exports = { getNotifModel };
