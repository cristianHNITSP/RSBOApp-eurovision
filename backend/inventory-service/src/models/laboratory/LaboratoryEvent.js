// models/laboratory/LaboratoryEvent.js
const mongoose = require("mongoose");

const ActorSchema = new mongoose.Schema(
  { userId: { type: String, default: null }, name: { type: String, default: null } },
  { _id: false }
);

const LaboratoryEventSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "LaboratoryOrder", default: null, index: true },
    sheet: { type: mongoose.Schema.Types.ObjectId, ref: "InventorySheet", default: null, index: true },

    type: {
      type: String,
      enum: ["ORDER_CREATE", "EXIT_SCAN", "ORDER_CLOSE", "ORDER_RESET", "CORRECTION_REQUEST", "ORDER_CANCEL", "ORDER_EDIT"],
      required: true,
      index: true
    },

    details: { type: Object, default: {} },
    actor: { type: ActorSchema, default: () => ({}) }
  },
  { timestamps: true }
);

LaboratoryEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("LaboratoryEvent", LaboratoryEventSchema);