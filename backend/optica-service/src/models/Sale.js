const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema(
  {
    folio: { type: String, required: true, unique: true, index: true },
    cliente: { type: String, required: true, trim: true },
    clientePhone: { type: String, default: "" },
    
    // Lista de ítems vendidos
    items: [{
      collection: { type: String, required: true }, // armazones, lentes, etc.
      documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
      sku: { type: String, required: true },
      description: { type: String, default: "" },
      qty: { type: Number, required: true, min: 1 },
      precio: { type: Number, default: 0 }
    }],
    
    total: { type: Number, default: 0 },
    pago: { type: [String], default: [] },
    
    actor: {
      userId: { type: String, default: null },
      name: { type: String, default: "Sistema" }
    }
  },
  { timestamps: true }
);

SaleSchema.index({ cliente: "text", folio: "text" });

module.exports = mongoose.model("Sale", SaleSchema);
