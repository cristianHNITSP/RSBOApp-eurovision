const Sequence = require("../models/Sequence");

/**
 * Genera un folio con formato `${PREFIX}-${YYYY}-${NNNNN}` basado en una
 * secuencia atómica para evitar colisiones en entornos concurrentes.
 *
 * @param {string} prefix   Prefijo en mayúsculas (ej. "DEV", "MRM").
 * @param {object} Model    (Opcional) Ya no se requiere para contar, pero se mantiene por firma.
 * @param {object} [opts]
 * @param {object} [opts.session] Sesión Mongoose opcional.
 * @param {number} [opts.pad=5]   Ancho del contador.
 * @returns {Promise<string>}
 */
async function generateFolio(prefix, Model, opts = {}) {
  if (!prefix) throw new Error("generateFolio: prefix requerido");
  
  const pad = Number.isFinite(opts.pad) ? opts.pad : 5;
  const year = new Date().getFullYear();
  const sequenceName = `${prefix}_${year}`;

  const query = { name: sequenceName };
  const update = { $inc: { value: 1 } };
  const options = { 
    new: true, 
    upsert: true, 
    session: opts.session,
    lean: true 
  };

  const seq = await Sequence.findOneAndUpdate(query, update, options);
  const count = seq.value;

  return `${prefix}-${year}-${String(count).padStart(pad, "0")}`;
}

module.exports = { generateFolio };
