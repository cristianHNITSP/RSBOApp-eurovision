const Sequence = require("../models/Sequence");

/**
 * Genera un folio único con formato: BO-{PREFIX}-YYYY-NNNNN
 * Ejemplo: BO-BM-2025-00001 (Bases y Micas), BO-LC-2025-00001 (Lentes), BO-OP-2025-00001 (Óptica)
 * 
 * @param {string} prefix - Prefijo completo (ej. "BO-BM", "BO-LC", "BO-OP")
 * @param {mongoose.Model} Model - El modelo para el cual se genera el folio
 * @returns {Promise<string>} Folio generado
 */
async function generateFolio(prefix, Model) {
  const year = new Date().getFullYear();
  const seqName = `${prefix}-${year}`;
  
  const seq = await Sequence.findOneAndUpdate(
    { name: seqName },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  
  const number = String(seq.value).padStart(5, "0");
  return `${prefix}-${year}-${number}`;
}

module.exports = { generateFolio };
