/**
 * @fileoverview Generador de SKU para productos de óptica.
 *
 * Formato: `PREFIJO-NNNNNN` (ej. ARM-000001), contador atómico continuo por prefijo
 * vía el modelo Sequence (findOneAndUpdate $inc upsert) → sin colisiones en concurrencia.
 */
const Sequence = require("../../models/Sequence");

/**
 * @param {string} prefix - prefijo en mayúsculas (ej. "ARM")
 * @param {object} [opts] - { session, pad }
 * @returns {Promise<string>} SKU único
 */
async function generateOpticaSku(prefix, opts = {}) {
  if (!prefix) throw new Error("generateOpticaSku: prefix requerido");
  const pad = Number.isFinite(opts.pad) ? opts.pad : 6;

  const seq = await Sequence.findOneAndUpdate(
    { name: `OPTICA_${prefix}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, session: opts.session, lean: true }
  );

  return `${prefix}-${String(seq.value).padStart(pad, "0")}`;
}

module.exports = { generateOpticaSku };
