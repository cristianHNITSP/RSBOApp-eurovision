const mongoose = require('mongoose');

const catalogTreatmentSchema = new mongoose.Schema({
  key:    { type: String, required: true, unique: true, trim: true },
  label:  { type: String, required: true, trim: true },
  orden:  { type: Number, default: 0 },
  activo: { type: Boolean, default: true },
  // Simple variants list (used for most treatments)
  variants: [{ type: String, trim: true }],
  // Material-specific variants (e.g. TRANSITIONS: CR-39 → [Gris, Café, Verde])
  variantsByMaterial: {
    type: Map,
    of: [String],
    default: {},
  },
  // Empty = allowed for all materials; non-empty = only these materials allowed
  allowedMaterials: [{ type: String, trim: true }],
  // Empty = allowed for all base keys; non-empty = only these base keys allowed
  allowedBases: [{ type: String, trim: true }],
}, { timestamps: true });

module.exports = mongoose.model('CatalogTreatment', catalogTreatmentSchema);
