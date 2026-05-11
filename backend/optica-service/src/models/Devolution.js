const mongoose = require("mongoose");

const DevolutionSchema = new mongoose.Schema(
  {
    folio: { type: String, required: true, unique: true, index: true },
    cliente: { type: String, required: true },
    clientePhone: { type: String, default: null },
    orderFolio: { type: String, default: null },
    
    reason: { type: String, required: true },
    reasonDetail: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: { 
      type: String, 
      enum: ["pendiente", "en_revision", "aprobada", "rechazada", "procesada"],
      default: "pendiente",
      index: true
    },
    
    items: [{
      codebar: { type: String },
      sku: { type: String },
      description: { type: String },
      qty: { type: Number, required: true },
      condition: { type: String, default: "bueno" },
      restoreStock: { type: Boolean, default: false }
    }],
    
    actor: {
      userId: { type: String, default: null },
      name: { type: String, default: "Sistema" }
    },
    isReplica: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Devolution", DevolutionSchema);
