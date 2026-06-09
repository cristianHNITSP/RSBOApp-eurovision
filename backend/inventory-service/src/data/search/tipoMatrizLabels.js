"use strict";

/**
 * Etiquetas legibles por código de tipo de matriz (planillas oftálmicas / LC).
 * Data ESTÁTICA pura — la consume sheets.provider para etiquetar y para
 * matchear por nombre de tipo (ej. "tórico" → SPH_CYL_AXIS).
 */
const TIPO_MATRIZ_LABELS = {
  BASE:         "Monofocal (Base)",
  SPH_CYL:      "Monofocal Esf-Cil",
  SPH_CYL_AXIS: "Tórico (CL)",
  SPH_ADD:      "Bifocal",
  BASE_ADD:     "Progresivo",
};

module.exports = { TIPO_MATRIZ_LABELS };
