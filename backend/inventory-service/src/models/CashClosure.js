const mongoose = require("mongoose");

const CashClosureSchema = new mongoose.Schema(
  {
    folio: { type: String, required: true, unique: true, index: true },
    
    // Rango que cubre este corte
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },

    // Totales de Ventas (Laboratorio + Óptica)
    sales: {
      total: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      byMethod: {
        efec:     { type: Number, default: 0 },
        tarjeta:  { type: Number, default: 0 },
        trans:    { type: Number, default: 0 },
        credito:  { type: Number, default: 0 }
      }
    },

    // Totales de Merma (Pérdidas registradas en el periodo)
    merma: {
      totalValue: { type: Number, default: 0 },
      count:      { type: Number, default: 0 },
      byReason:   { type: Map, of: Number, default: {} }
    },

    // Snapshot Global (Replicación para auditoría)
    globalSummary: {
      micas: {
        total: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
      },
      optica: {
        total: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
      },
      grandTotal: { type: Number, default: 0 }
    },

    closedBy: {
      userId: { type: String, required: true },
      name:   { type: String, required: true }
    },

    observations: { type: String, default: "" },

    status: { type: String, enum: ["closed"], default: "closed" }
  },
  { timestamps: true }
);

// Índice para búsquedas rápidas por fecha
CashClosureSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CashClosure", CashClosureSchema);
